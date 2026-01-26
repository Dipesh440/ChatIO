// Create persistent session ID for this user
let sessionId = localStorage.getItem("sessionId");

if (!sessionId) {
  sessionId = crypto.randomUUID();
  localStorage.setItem("sessionId", sessionId);
}

console.log("Session ID:", sessionId);

// Configure marked.js for markdown rendering
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function(code, lang) {
        if (lang && hljs.getLanguage(lang)) {
            try {
                return hljs.highlight(code, { language: lang }).value;
            } catch (err) {
                console.warn('Highlighting error:', err);
                return code;
            }
        }
        return hljs.highlightAuto(code).value;
    },
    renderer: new marked.Renderer()
});

// Chat Manager Class for better organization
class ChatManager {
    constructor() {
        this.conversationHistory = [];
        this.messageCount = 0;
        this.isTyping = false;
        this.initElements();
    }

    initElements() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.messageCountElement = document.getElementById('messageCount');
        this.onlineStatusElement = document.getElementById('onlineStatus');
        this.formatHelpBtn = document.getElementById('formatHelpBtn');
        this.clearBtn = document.getElementById('clearBtn');
        
        this.validateElements();
    }

    validateElements() {
        const requiredElements = [
            { name: 'chatMessages', element: this.chatMessages },
            { name: 'messageInput', element: this.messageInput },
            { name: 'sendBtn', element: this.sendBtn }
        ];

        requiredElements.forEach(({ name, element }) => {
            if (!element) {
                console.error(`❌ Critical element not found: ${name}`);
                throw new Error(`Required element ${name} not found`);
            }
        });
    }

    // Enhanced LaTeX rendering with better error handling
    renderMathInElement(element) {
        if (typeof katex === 'undefined') {
            console.warn('KaTeX not loaded, skipping math rendering');
            return;
        }

        // Process display math
        const displayElements = element.querySelectorAll('.math-display');
        displayElements.forEach(math => {
            try {
                const tex = math.textContent.trim();
                if (!tex) return;

                const rendered = document.createElement('div');
                katex.render(tex, rendered, { 
                    displayMode: true, 
                    throwOnError: false,
                    fleqn: false,
                    leqno: false
                });

                rendered.className = 'katex-display-enhanced';
                
                // Add complexity class for styling
                const isComplex = this.isFormulaComplex(tex);
                rendered.classList.add(isComplex ? 'complex' : 'simple');

                const container = math.closest('.math-display-container') || math.parentNode;
                container.replaceChild(rendered, math);
                this.addFormulaCopyButton(rendered, tex);

            } catch (error) {
                console.warn('KaTeX rendering error:', error);
                this.showMathError(math, error);
            }
        });

        // Process inline math
        const inlineElements = element.querySelectorAll('.math-inline');
        inlineElements.forEach(math => {
            try {
                const tex = math.textContent.trim();
                if (!tex) return;

                const rendered = document.createElement('span');
                katex.render(tex, rendered, { 
                    displayMode: false, 
                    throwOnError: false 
                });

                math.parentNode.replaceChild(rendered, math);
            } catch (error) {
                console.warn('KaTeX inline error:', error);
                this.showMathError(math, error);
            }
        });
    }

    isFormulaComplex(tex) {
        const complexPatterns = [
            /\\frac/, /\\sum/, /\\int/, /\\sqrt/,
            /\\begin\{.*?\}/, /\\lim/, /\\prod/
        ];
        return complexPatterns.some(pattern => pattern.test(tex)) || 
               tex.split(/\s+/).length > 5;
    }

    showMathError(element, error) {
        element.style.color = '#ef4444';
        element.textContent = `Math Error: ${element.textContent}`;
    }

    // Optimized markdown renderer
    renderMarkdown(text) {
        // Preprocess text for better LaTeX support
        const processedText = this.preprocessMath(text);
        
        // Parse markdown
        const html = marked.parse(processedText);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = html;

        // Convert LaTeX patterns
        this.convertLatexPatterns(tempDiv);
        
        return tempDiv.innerHTML;
    }

    preprocessMath(text) {
        let processed = text;
        
        // Convert common math patterns to LaTeX
        const conversions = [
            // Convert ^ to superscript
            { pattern: /(\w|\))\^(\d+)/g, replacement: '$1^{$2}' },
            // Convert _ to subscript
            { pattern: /(\w)_(\d+)/g, replacement: '$1_{$2}' },
            // Convert Greek letters
            { pattern: /\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega)\b/gi, 
              replacement: match => `\\${match.toLowerCase()}` },
            // Square root
            { pattern: /sqrt\(([^)]+)\)/g, replacement: '\\sqrt{$1}' },
            // Handle escaped brackets
            { pattern: /\\\\\[/g, replacement: '\\[' },
            { pattern: /\\\\\]/g, replacement: '\\]' },
            { pattern: /\\\\\(/g, replacement: '\\(' },
            { pattern: /\\\\\)/g, replacement: '\\)' }
        ];

        conversions.forEach(({ pattern, replacement }) => {
            processed = processed.replace(pattern, replacement);
        });

        return processed;
    }

    convertLatexPatterns(container) {
        const elements = container.querySelectorAll('*');
        
        elements.forEach(el => {
            // Skip code blocks
            if (el.tagName === 'CODE' || el.tagName === 'PRE') return;

            let html = el.innerHTML;
            
            // Pattern replacements
            const patterns = [
                // Square bracket display math: [formula]
                { regex: /\[\s*\n?(.*?)\n?\s*\]/gs, 
                  replacement: '<div class="math-display-container"><span class="math-display">$1</span></div>' },
                // Escaped display math: \[formula\]
                { regex: /\\\[(.*?)\\\]/gs, 
                  replacement: '<div class="math-display-container"><span class="math-display">$1</span></div>' },
                // Double dollar display math: $$formula$$
                { regex: /\$\$(.*?)\$\$/gs, 
                  replacement: '<div class="math-display-container"><span class="math-display">$1</span></div>' },
                // Inline dollar math: $formula$
                { regex: /\$([^$]*?)\$/g, 
                  replacement: '<span class="math-inline">$1</span>' },
                // Escaped inline math: \(formula\)
                { regex: /\\\((.*?)\\\)/g, 
                  replacement: '<span class="math-inline">$1</span>' }
            ];

            patterns.forEach(({ regex, replacement }) => {
                html = html.replace(regex, replacement);
            });

            el.innerHTML = html;
        });
    }

    // Enhanced message creation
    addMessage(text, isUser) {
        // Remove welcome message if present
        const welcomeMsg = this.chatMessages.querySelector('.welcome-message');
        if (welcomeMsg) welcomeMsg.remove();

        // Remove typing indicator
        this.removeTypingIndicator();

        // Create message element
        const messageDiv = this.createMessageElement(text, isUser);
        this.chatMessages.appendChild(messageDiv);

        // Post-render processing for AI messages
        if (!isUser) {
            this.processAIReply(messageDiv, text);
        }

        // Update UI
        this.scrollToBottom();
        this.updateConversationHistory(text, isUser);
        
        if (isUser) {
            this.messageCount++;
            this.updateMessageCount();
        }
    }

    createMessageElement(text, isUser) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;

        // Create avatar
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = isUser ? 
            '<i class="fas fa-user"></i>' : 
            '<i class="fas fa-robot"></i>';
        
        // Create content
        const content = document.createElement('div');
        content.className = 'message-content';

        if (isUser) {
            // User message (plain text)
            const textDiv = document.createElement('div');
            textDiv.textContent = text;
            content.appendChild(textDiv);
        } else {
            // AI message (markdown)
            const markdownDiv = document.createElement('div');
            markdownDiv.className = 'markdown-content';
            markdownDiv.innerHTML = this.renderMarkdown(text);
            content.appendChild(markdownDiv);
            
            // Add copy button
            this.addMessageCopyButton(content, text);
        }

        // Add timestamp
        const timeDiv = this.createTimestamp();
        content.appendChild(timeDiv);

        // Assemble message
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        return messageDiv;
    }

    processAIReply(messageDiv, text) {
        setTimeout(() => {
            const content = messageDiv.querySelector('.message-content');
            
            // Render LaTeX
            this.renderMathInElement(content);
            
            // Add formula copy buttons
            this.addAllFormulaCopyButtons(content);
            
            // Highlight code blocks
            this.highlightCodeBlocks(content);
            
            // Optimize content display
            this.optimizeContentLayout(content);
            
        }, 10); // Small delay for DOM rendering
    }

    addMessageCopyButton(container, text) {
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-btn';
        copyButton.innerHTML = '<i class="far fa-copy"></i>';
        copyButton.title = 'Copy response';
        
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(text, copyButton);
        });
        
        container.appendChild(copyButton);
    }

    addFormulaCopyButton(container, formulaText) {
        if (container.querySelector('.formula-copy-btn')) return;

        const copyButton = document.createElement('button');
        copyButton.className = 'formula-copy-btn';
        copyButton.innerHTML = '<i class="far fa-copy"></i>';
        copyButton.title = 'Copy formula';
        
        copyButton.addEventListener('click', (e) => {
            e.stopPropagation();
            this.copyToClipboard(formulaText, copyButton);
        });
        
        container.appendChild(copyButton);
    }

    addAllFormulaCopyButtons(container) {
        const formulaContainers = container.querySelectorAll('.katex-display-enhanced');
        formulaContainers.forEach(formulaContainer => {
            const formulaText = formulaContainer.querySelector('.katex')?.textContent || '';
            if (formulaText) {
                this.addFormulaCopyButton(formulaContainer, formulaText);
            }
        });
    }

    async copyToClipboard(text, button) {
        try {
            await navigator.clipboard.writeText(text);
            
            // Visual feedback
            const originalHTML = button.innerHTML;
            button.innerHTML = '<i class="fas fa-check"></i>';
            button.classList.add('copied');
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            button.innerHTML = '<i class="fas fa-times"></i>';
            setTimeout(() => {
                button.innerHTML = '<i class="far fa-copy"></i>';
            }, 2000);
        }
    }

    createTimestamp() {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        const timeDiv = document.createElement('div');
        timeDiv.className = 'message-time';
        timeDiv.innerHTML = `<i class="far fa-clock"></i>${timeString}`;
        
        return timeDiv;
    }

    showTypingIndicator() {
        if (this.isTyping || !this.chatMessages) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'typing-indicator active';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.innerHTML = '<i class="fas fa-robot"></i>';
        
        const dots = document.createElement('div');
        dots.className = 'typing-dots';
        dots.innerHTML = '<span></span><span></span><span></span>';
        
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(dots);
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    removeTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = this.chatMessages.querySelector('.typing-indicator');
        if (typingIndicator) typingIndicator.remove();
    }
    
    // API Communication
    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message) return;

        // Clear input and disable send button
        this.messageInput.value = '';
        this.sendBtn.disabled = true;

        // Add user message
        this.addMessage(message, true);
        
        // Show typing indicator
        this.showTypingIndicator();

        try {
            const aiResponse = await this.fetchAIResponse(message);
            
            // Simulate typing delay
            setTimeout(() => {
                this.removeTypingIndicator();
                this.addMessage(aiResponse, false);
            }, 800);

        } catch (error) {
            console.error('API Error:', error);
            setTimeout(() => {
                this.removeTypingIndicator();
                this.addMessage("Sorry, I'm having trouble connecting right now. Please try again later.", false);
            }, 800);
        } finally {
            this.sendBtn.disabled = false;
            this.messageInput.focus();
        }
    }

    async fetchAIResponse(message) {
        const response = await fetch("https://dp1-n8n.app.n8n.cloud/webhook/chatio", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: sessionId,
                // sessionId: "user123",
                message: message
            })
        });

        if (!response.ok) {
            throw new Error(`API responded with status: ${response.status}`);
        }

        const data = await response.json();
        return data.message || data.greet || data.response || 
            "I'm not sure how to respond to that.";
    }


    // UI Helpers
    scrollToBottom() {
        if (this.chatMessages) {
            this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
        }
    }

    updateMessageCount() {
        if (this.messageCountElement) {
            this.messageCountElement.textContent = this.messageCount;
        }
    }

    updateOnlineStatus() {
        if (this.onlineStatusElement) {
            const isOnline = navigator.onLine;
            this.onlineStatusElement.textContent = isOnline ? 'Online' : 'Offline';
            this.onlineStatusElement.style.color = isOnline ? '#4ade80' : '#f87171';
        }
    }

    updateConversationHistory(text, isUser) {
        this.conversationHistory.push({
            role: isUser ? 'user' : 'assistant',
            text: text,
            time: new Date().toISOString()
        });
        
        // Keep history manageable (last 50 messages)
        if (this.conversationHistory.length > 50) {
            this.conversationHistory = this.conversationHistory.slice(-50);
        }
    }

    // Content optimization
    optimizeContentLayout(contentElement) {
        if (!contentElement) return;

        // Optimize text elements
        const textElements = contentElement.querySelectorAll('p, li, td, th');
        textElements.forEach(el => {
            el.style.minWidth = '0';
            el.style.maxWidth = '100%';
            el.style.overflowWrap = 'break-word';
            el.style.wordWrap = 'break-word';
        });

        // Ensure code blocks scroll properly
        const codeBlocks = contentElement.querySelectorAll('pre');
        codeBlocks.forEach(pre => {
            pre.style.overflowX = 'auto';
        });
    }

    highlightCodeBlocks(content) {
        content.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    // UI Actions
    showFormattingHelp() {
        const formatHelp = `### Formatting Help

ChatIO supports **rich text formatting** using Markdown:

#### **Text Formatting**
- **Bold**: \`**bold text**\` or \`__bold text__\`
- *Italic*: \`*italic text*\` or \`_italic text_\`
- ~~Strikethrough~~: \`~~strikethrough text~~\`

#### **Math Formulas**
- Inline: \\(E = mc^2\\)
- Display: 
\\[
x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}
\\]

#### **Code**
\`\`\`javascript
// Code blocks with syntax highlighting
console.log("Hello World");
\`\`\`

**Try these examples!**`;
        
        this.addMessage(formatHelp, false);
    }

    clearChat() {
        if (!confirm("Clear all messages and start a new conversation?")) return;

        this.chatMessages.innerHTML = `
            <div class="welcome-message">
                <h2>Welcome to ChatIO! 👋</h2>
                <p>Your intelligent AI assistant with rich text formatting</p>
                
                <div class="welcome-features">
                    <div class="feature">
                        <i class="fas fa-bold"></i>
                        <span>Markdown Support</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-superscript"></i>
                        <span>Math Formulas</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-code"></i>
                        <span>Code Highlighting</span>
                    </div>
                    <div class="feature">
                        <i class="fas fa-copy"></i>
                        <span>Copy Responses</span>
                    </div>
                </div>
            </div>
        `;
        
        this.conversationHistory = [];
        this.messageCount = 0;
        this.updateMessageCount();
    }

    // Event Handlers
    handleKeyPress(event) {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            this.sendMessage();
        }
    }

    // Initialization
    async initialize() {
        console.log('🚀 Initializing ChatIO...');
        
        try {
            // Create animated background
            this.createParticles();
            
            // Update UI states
            this.updateMessageCount();
            this.updateOnlineStatus();
            
            // Highlight existing code
            hljs.highlightAll();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Focus input
            this.messageInput.focus();
            
            // Show welcome message after delay
            setTimeout(() => this.showWelcomeExample(), 1000);
            
            console.log('✅ ChatIO initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
        }
    }

    createParticles() {
        const particlesContainer = document.getElementById('particles');
        if (!particlesContainer) return;

        const particleCount = 30;
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.classList.add('particle');
            
            // Random properties
            const size = Math.random() * 6 + 2;
            const posX = Math.random() * 100;
            const posY = Math.random() * 100;
            const delay = Math.random() * 20;
            const duration = Math.random() * 20 + 15;
            
            particle.style.cssText = `
                width: ${size}px;
                height: ${size}px;
                left: ${posX}%;
                top: ${posY}%;
                animation-delay: ${delay}s;
                animation-duration: ${duration}s;
            `;
            
            particlesContainer.appendChild(particle);
        }
    }

    setupEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        
        // Enter key in input
        this.messageInput.addEventListener('keypress', (e) => this.handleKeyPress(e));
        
        // Format help
        if (this.formatHelpBtn) {
            this.formatHelpBtn.addEventListener('click', () => this.showFormattingHelp());
        }
        
        // Clear chat
        if (this.clearBtn) {
            this.clearBtn.addEventListener('click', () => this.clearChat());
        }
        
        // Online/offline status
        window.addEventListener('online', () => this.updateOnlineStatus());
        window.addEventListener('offline', () => this.updateOnlineStatus());
        
        // Auto-resize textarea (if you change to textarea)
        this.messageInput.addEventListener('input', () => {
            this.messageInput.style.height = 'auto';
            this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
        });
    }

    showWelcomeExample() {
        if (this.chatMessages.querySelector('.welcome-message')) {
            const exampleResponse = `Hello! I'm **ChatIO**, your intelligent assistant.

**Mathematical Formulas:**
\\[
F = k \\frac{|q_1 q_2|}{r^2}
\\]

**Code Examples:**
\`\`\`python
def greet(name):
    return f"Hello, {name}!"
\`\`\`

**And much more!** Try asking me anything. 🚀`;
            
            this.addMessage(exampleResponse, false);
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Create global chat manager instance
    window.chatManager = new ChatManager();
    
    // Initialize the application
    window.chatManager.initialize().catch(error => {
        console.error('Failed to initialize chat:', error);
        // Show error message to user
        const errorMsg = document.createElement('div');
        errorMsg.className = 'error-message';
        errorMsg.textContent = 'Failed to initialize chat. Please refresh the page.';
        document.body.appendChild(errorMsg);
    });
});

// Optional: Export for debugging
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChatManager };
}
