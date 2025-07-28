// =============================
// Advanced Diagnostics JavaScript
// =============================

class AdvancedDiagnostics {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator');
        this.charCount = document.querySelector('.char-count');
        this.navToggle = document.getElementById('navToggle');
        this.navLinks = document.querySelector('.nav-links');
        
        // Google AI API configuration
        this.apiKey = 'AIzaSyAVsKnmNlxvfyGpQ3Sh9TW214KLStstI4k';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        
        // Rate limiting
        this.lastApiCall = 0;
        this.apiCooldown = 1000; // 1 second between API calls
        
        this.isTyping = false;
        this.currentMessageId = 0;
        
        // System prompt for medical advice
        this.systemPrompt = "You are a helpful AI assistant for a medical advice platform named Healverse. While you are not a substitute for actual medical advice, you will be as helpful as possible, giving advice to the user. Make sure not to worry the user. Respond to the following user message:";
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.adjustTextareaHeight();
        this.updateCharCount();
        this.addWelcomeMessage();
    }

    addWelcomeMessage() {
        const welcomeMessage = `Hello! I'm your Healverse AI health assistant. I'm here to provide general health information and guidance. 

🩺 I can help with:
• Understanding symptoms and when to seek care
• General health and wellness advice
• Medication information (general)
• Lifestyle and preventive care tips

⚠️ Important: I'm not a substitute for professional medical advice. For specific medical concerns, diagnoses, or emergencies, please consult with qualified healthcare professionals.

How can I assist you with your health questions today?`;
        
        this.addMessage(welcomeMessage, 'assistant');
    }

    setupEventListeners() {
        // Send message
        this.sendBtn.addEventListener('click', () => this.sendMessage());
        this.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Auto-resize textarea
        this.messageInput.addEventListener('input', () => {
            this.adjustTextareaHeight();
            this.updateCharCount();
        });

        // Quick actions
        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Suggestion chips
        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const text = e.currentTarget.textContent;
                this.messageInput.value = text;
                this.adjustTextareaHeight();
                this.updateCharCount();
                this.sendMessage();
            });
        });

        // Chat actions
        document.querySelector('[title="Clear Chat"]').addEventListener('click', () => {
            this.clearChat();
        });

        document.querySelector('[title="Export Chat"]').addEventListener('click', () => {
            this.exportChat();
        });

        // Voice input (placeholder)
        document.getElementById('voiceBtn').addEventListener('click', () => {
            this.startVoiceInput();
        });

        // Navigation toggle
        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => {
                this.toggleNavigation();
            });
        }

        // Close mobile nav when clicking links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                if (this.navLinks.classList.contains('active')) {
                    this.toggleNavigation();
                }
            });
        });
    }

    async sendMessage() {
        const message = this.messageInput.value.trim();
        if (!message || this.isTyping) return;

        // Add user message
        this.addMessage(message, 'user');
        
        // Clear input
        this.messageInput.value = '';
        this.adjustTextareaHeight();
        this.updateCharCount();

        // Show typing indicator and generate response
        this.showTypingIndicator();
        
        // Add a small delay to make the interaction feel more natural
        setTimeout(() => {
            this.generateAIResponse(message);
        }, 500);
    }

    addMessage(content, sender = 'assistant', timestamp = null) {
        const messageId = ++this.currentMessageId;
        const time = timestamp || this.getCurrentTime();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message fade-in`;
        messageDiv.dataset.messageId = messageId;

        const avatarIcon = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        
        messageDiv.innerHTML = `
            <div class="message-avatar">
                <i class="${avatarIcon}"></i>
            </div>
            <div class="message-content">
                <div class="message-bubble">
                    ${this.formatMessage(content)}
                </div>
                <div class="message-time">${time}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        
        return messageId;
    }

    formatMessage(content) {
        // Convert line breaks to <br> tags
        content = content.replace(/\n/g, '<br>');
        
        // Make links clickable (simple regex)
        content = content.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener">$1</a>');
        
        return `<p>${content}</p>`;
    }

    showTypingIndicator() {
        this.isTyping = true;
        this.typingIndicator.style.display = 'block';
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        this.typingIndicator.style.display = 'none';
    }

    async generateAIResponse(userMessage) {
        try {
            const response = await this.callGoogleAI(userMessage);
            this.hideTypingIndicator();
            this.addMessage(response);
        } catch (error) {
            console.error('AI API Error:', error);
            this.hideTypingIndicator();
            
            // Check if it's a network error
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                this.addMessage("I'm having trouble connecting to my knowledge base right now. Please check your internet connection and try again. For urgent medical concerns, please contact your healthcare provider directly.");
            } else {
                // Fallback to contextual responses if API fails
                const fallbackResponses = this.getContextualResponse(userMessage);
                const fallbackResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
                this.addMessage(`${fallbackResponse}\n\n*Note: I'm currently experiencing connectivity issues. For the best experience and more detailed assistance, please try again later.*`);
            }
        }
    }

    async callGoogleAI(userMessage) {
        // Rate limiting check
        const now = Date.now();
        const timeSinceLastCall = now - this.lastApiCall;
        if (timeSinceLastCall < this.apiCooldown) {
            await new Promise(resolve => setTimeout(resolve, this.apiCooldown - timeSinceLastCall));
        }
        this.lastApiCall = Date.now();
        
        const fullPrompt = `${this.systemPrompt} ${userMessage}`;
        
        const requestBody = {
            contents: [{
                parts: [{
                    text: fullPrompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                }
            ]
        };

        const response = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => null);
            throw new Error(`API request failed: ${response.status} ${response.statusText} ${errorData ? JSON.stringify(errorData) : ''}`);
        }

        const data = await response.json();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            return data.candidates[0].content.parts[0].text;
        } else if (data.candidates && data.candidates[0] && data.candidates[0].finishReason === 'SAFETY') {
            return "I understand you're seeking medical advice, but I need to be careful about the information I provide. For specific medical concerns, I strongly recommend consulting with a qualified healthcare professional who can provide personalized guidance based on your individual situation.";
        } else {
            throw new Error('Invalid response format from API');
        }
    }

    getContextualResponse(message) {
        const lowerMessage = message.toLowerCase();
        
        // Symptom-related responses
        if (lowerMessage.includes('pain') || lowerMessage.includes('hurt') || lowerMessage.includes('ache')) {
            return [
                "I understand you're experiencing pain. Can you describe the location, intensity (1-10 scale), and how long you've been experiencing it? This will help me provide better guidance.",
                "Pain can have various causes. For immediate severe pain, please consider contacting a healthcare provider. For general pain management, I can suggest some initial approaches based on more details about your symptoms.",
                "Let me help you assess your pain. Please describe: Where is the pain? When did it start? Is it constant or intermittent? Any triggers that make it better or worse?"
            ];
        }
        
        // Vital signs related
        else if (lowerMessage.includes('blood pressure') || lowerMessage.includes('bp')) {
            return [
                "Blood pressure monitoring is important for cardiovascular health. Normal BP is typically below 120/80 mmHg. What are your recent readings? I can help interpret them and suggest when to consult a doctor.",
                "For accurate blood pressure readings, ensure you're relaxed, seated comfortably, and avoid caffeine 30 minutes before. What specific concerns do you have about your blood pressure?",
                "Blood pressure can be affected by many factors including stress, diet, exercise, and medications. Share your readings and I'll help you understand what they mean."
            ];
        }
        
        // Medication related
        else if (lowerMessage.includes('medication') || lowerMessage.includes('medicine') || lowerMessage.includes('drug')) {
            return [
                "I can provide general information about medications, but always consult your healthcare provider for specific medical advice. What medication questions do you have?",
                "Medication management is crucial for treatment effectiveness. Are you asking about interactions, side effects, dosing, or something else specific?",
                "For medication concerns, it's important to speak with your doctor or pharmacist. I can provide general educational information. What would you like to know?"
            ];
        }
        
        // Lifestyle and prevention
        else if (lowerMessage.includes('diet') || lowerMessage.includes('exercise') || lowerMessage.includes('lifestyle')) {
            return [
                "Lifestyle modifications can significantly impact health outcomes. Are you looking for advice on diet, exercise, sleep, stress management, or other lifestyle factors?",
                "A balanced approach to health includes proper nutrition, regular physical activity, adequate sleep, and stress management. What area would you like to focus on?",
                "Preventive care through healthy lifestyle choices is key to long-term wellness. I can provide evidence-based recommendations for various health goals."
            ];
        }
        
        // Emergency situations
        else if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('911')) {
            return [
                "⚠️ For medical emergencies, please call 911 immediately or go to your nearest emergency room. Don't rely on online consultations for urgent medical situations.",
                "If you're experiencing a medical emergency such as chest pain, difficulty breathing, severe bleeding, or loss of consciousness, seek immediate medical attention by calling 911.",
                "Emergency situations require immediate professional medical care. Please contact emergency services (911) or visit an emergency room right away."
            ];
        }
        
        // General health questions
        else if (lowerMessage.includes('symptom') || lowerMessage.includes('feel') || lowerMessage.includes('sick')) {
            return [
                "I can help you understand common symptoms, but remember that proper diagnosis requires professional medical evaluation. What symptoms are you experiencing?",
                "Symptom assessment is complex and depends on many factors. While I can provide general information, please consult a healthcare provider for proper evaluation and diagnosis.",
                "Many symptoms can have multiple causes. For accurate assessment, it's best to consult with a healthcare professional who can examine you properly."
            ];
        }
        
        // Default responses
        else {
            return [
                "I'm here to help with your health questions! I can provide information about symptoms, general health guidance, and when to seek professional care. What specific health topic interests you?",
                "As your AI health assistant, I can discuss various health topics including symptoms, preventive care, lifestyle factors, and general medical information. How can I assist you today?",
                "I'm designed to provide health education and general guidance. For specific medical concerns, always consult with qualified healthcare professionals. What would you like to learn about?",
                "Thank you for your message. I can help with health information, wellness tips, and guidance on when to seek professional medical care. What's on your mind regarding your health?"
            ];
        }
    }

    handleQuickAction(action) {
        const actionMessages = {
            symptoms: "I'd like help analyzing my symptoms",
            vitals: "Can you help me understand my vital signs?",
            medication: "I have questions about my medications",
            lifestyle: "I want advice on healthy lifestyle choices"
        };

        if (actionMessages[action]) {
            this.messageInput.value = actionMessages[action];
            this.adjustTextareaHeight();
            this.updateCharCount();
            this.sendMessage();
        }
    }

    adjustTextareaHeight() {
        this.messageInput.style.height = 'auto';
        this.messageInput.style.height = Math.min(this.messageInput.scrollHeight, 120) + 'px';
    }

    updateCharCount() {
        const count = this.messageInput.value.length;
        this.charCount.textContent = `${count}/500`;
        
        if (count > 450) {
            this.charCount.style.color = 'var(--warning)';
        } else if (count > 400) {
            this.charCount.style.color = 'var(--secondary)';
        } else {
            this.charCount.style.color = 'var(--gray)';
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the chat history?')) {
            this.chatMessages.innerHTML = '';
            this.currentMessageId = 0;
            this.addWelcomeMessage();
        }
    }

    exportChat() {
        const messages = [];
        document.querySelectorAll('.message').forEach(messageEl => {
            const isUser = messageEl.classList.contains('user-message');
            const content = messageEl.querySelector('.message-bubble').textContent.trim();
            const time = messageEl.querySelector('.message-time').textContent;
            
            messages.push({
                sender: isUser ? 'User' : 'AI Assistant',
                content: content,
                timestamp: time
            });
        });

        const chatData = {
            exportDate: new Date().toISOString(),
            messages: messages
        };

        const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `health-chat-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    startVoiceInput() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input is not supported in your browser. Please type your message instead.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        const voiceBtn = document.getElementById('voiceBtn');
        const originalIcon = voiceBtn.innerHTML;
        
        voiceBtn.innerHTML = '<i class="fas fa-circle" style="color: var(--danger); animation: pulse 2s infinite;"></i>';
        voiceBtn.disabled = true;

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            this.messageInput.value = transcript;
            this.adjustTextareaHeight();
            this.updateCharCount();
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            alert('Voice input failed. Please try again or type your message.');
        };

        recognition.onend = () => {
            voiceBtn.innerHTML = originalIcon;
            voiceBtn.disabled = false;
        };

        recognition.start();
    }

    toggleNavigation() {
        this.navToggle.classList.toggle('active');
        this.navLinks.classList.toggle('active');
        
        const isOpen = this.navLinks.classList.contains('active');
        this.navToggle.setAttribute('aria-expanded', isOpen);
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AdvancedDiagnostics();
});

// Add some utility functions
const utils = {
    // Debounce function for performance optimization
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Format date/time
    formatDateTime(date) {
        return new Intl.DateTimeFormat('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }).format(date);
    },

    // Sanitize HTML to prevent XSS
    sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }
};

// Add smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Add intersection observer for fade-in animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('appear');
        }
    });
}, observerOptions);

// Observe elements with fade-in class
document.querySelectorAll('.fade-in').forEach(el => {
    observer.observe(el);
});

// Handle form submissions (if any)
document.querySelectorAll('form').forEach(form => {
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        // Add form handling logic here
        console.log('Form submitted:', new FormData(this));
    });
});

// Add keyboard navigation support
document.addEventListener('keydown', (e) => {
    // Escape key closes mobile navigation
    if (e.key === 'Escape') {
        const navLinks = document.querySelector('.nav-links');
        const navToggle = document.getElementById('navToggle');
        if (navLinks && navLinks.classList.contains('active')) {
            navToggle.click();
        }
    }
});

// Add performance monitoring
if ('performance' in window) {
    window.addEventListener('load', () => {
        const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
        console.log(`Page loaded in ${loadTime}ms`);
    });
}

// Service Worker registration for offline support (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}
