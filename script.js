// Initialize particles background
function createParticles() {
  const particlesContainer = document.getElementById('particles');
  const particleCount = 30;
  
  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    
    const size = Math.random() * 6 + 2;
    const posX = Math.random() * 100;
    const posY = Math.random() * 100;
    const delay = Math.random() * 20;
    const duration = Math.random() * 20 + 15;
    
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.left = `${posX}%`;
    particle.style.top = `${posY}%`;
    particle.style.animationDelay = `${delay}s`;
    particle.style.animationDuration = `${duration}s`;
    
    particlesContainer.appendChild(particle);
  }
}

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const messageCountElement = document.getElementById('messageCount');
const onlineStatusElement = document.getElementById('onlineStatus');
const micBtn = document.getElementById('micBtn');
const attachBtn = document.getElementById('attachBtn');

// State variables
let conversationHistory = [];
let messageCount = 0;

// Initialize
createParticles();
updateMessageCount();

function getCurrentTime() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function updateMessageCount() {
  messageCountElement.textContent = messageCount;
}

function updateOnlineStatus() {
  const isOnline = navigator.onLine;
  onlineStatusElement.textContent = isOnline ? 'Online' : 'Offline';
  onlineStatusElement.style.color = isOnline ? '#4ade80' : '#f87171';
}

window.addEventListener('online', updateOnlineStatus);
window.addEventListener('offline', updateOnlineStatus);
updateOnlineStatus();

function addMessage(text, isUser) {
  const welcomeMsg = chatMessages.querySelector('.welcome-message');
  if (welcomeMsg) {
    welcomeMsg.remove();
  }
  
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isUser ? 'user' : 'assistant'}`;
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.innerHTML = isUser ? '<i class="fas fa-user"></i>' : '<i class="fas fa-robot"></i>';
  
  const content = document.createElement('div');
  content.className = 'message-content';
  content.innerHTML = `
    <div>${text}</div>
    <div class="message-time">
      <i class="far fa-clock"></i>
      ${getCurrentTime()}
    </div>
  `;
  
  messageDiv.appendChild(avatar);
  messageDiv.appendChild(content);
  
  const typingIndicator = chatMessages.querySelector('.typing-indicator');
  if (typingIndicator) {
    typingIndicator.remove();
  }
  
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  
  conversationHistory.push({
    role: isUser ? 'user' : 'assistant',
    text: text,
    time: getCurrentTime()
  });
  
  if (isUser) {
    messageCount++;
    updateMessageCount();
  }
}

function showTypingIndicator() {
  const typingDiv = document.createElement('div');
  typingDiv.className = 'typing-indicator active';
  
  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  avatar.style.background = 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)';
  avatar.style.color = 'white';
  avatar.innerHTML = '<i class="fas fa-robot"></i>';
  
  const dots = document.createElement('div');
  dots.className = 'typing-dots';
  dots.innerHTML = '<span></span><span></span><span></span>';
  
  typingDiv.appendChild(avatar);
  typingDiv.appendChild(dots);
  chatMessages.appendChild(typingDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function sendMessage() {
  const message = messageInput.value.trim();
  if (!message) return;
  
  addMessage(message, true);
  messageInput.value = '';
  sendBtn.disabled = true;
  showTypingIndicator();
  
  try {
    const response = await fetch(
      "https://dps-n8n.app.n8n.cloud/webhook/chatio",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message })
      }
    );
    
    if (!response.ok) throw new Error("Server error");
    
    const data = await response.json();
    const aiResponse = data.message || data.greet || data.response || "I'm not sure how to respond to that.";
    
    setTimeout(() => {
      addMessage(aiResponse, false);
    }, 800);
    
  } catch (error) {
    setTimeout(() => {
      addMessage("Sorry, I'm having trouble connecting right now. Please try again later.", false);
    }, 800);
    console.error(error);
  } finally {
    sendBtn.disabled = false;
    messageInput.focus();
  }
}

// Event listeners
messageInput.addEventListener('keypress', function(event) {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    sendMessage();
  }
});

// micBtn.addEventListener('click', function() {
//   addMessage("Voice input activated. Please speak now...", false);
//   this.style.background = 'linear-gradient(135deg, #4ade80 0%, #22c55e 100%)';
//   setTimeout(() => { this.style.background = ''; }, 1000);
// });

// attachBtn.addEventListener('click', function() {
//   this.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
//   setTimeout(() => { this.style.background = ''; }, 1000);
//   addMessage("File attachment feature coming soon!", false);
// });

messageInput.focus();

// Add welcome greeting
setTimeout(() => {
  if (chatMessages.querySelector('.welcome-message')) {
    addMessage("Hello! I'm ChatIO, your AI assistant. How can I help you today?", false);
  }
}, 1000);