class AdvancedDiagnostics {
    constructor() {
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.typingIndicator = document.getElementById('typingIndicator') || { style: { display: 'none' } };
        this.charCount = document.querySelector('.char-count');
        this.navToggle = document.getElementById('navToggle');
        this.navLinks = document.querySelector('.nav-links');

        this.apiKey = 'AIzaSyAVsKnmNlxvfyGpQ3Sh9TW214KLStstI4k';
        this.apiUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

        this.lastApiCall = 0;
        this.apiCooldown = 1000;

        this.isTyping = false;
        this.currentMessageId = 0;

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
        const msg = `Hello! I'm your Healverse AI health assistant. I'm here to provide general health information and guidance. 

🩺 I can help with:
• Understanding symptoms and when to seek care
• General health and wellness advice
• Medication information (general)
• Lifestyle and preventive care tips

⚠️ Important: I'm not a substitute for professional medical advice. For specific medical concerns, diagnoses, or emergencies, please consult with qualified healthcare professionals.

How can I assist you with your health questions today?`;

        this.addMessage(msg, 'assistant');
    }

    setupEventListeners() {
        if (this.sendBtn) {
            this.sendBtn.addEventListener('click', () => this.sendMessage());
        }

        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });

            this.messageInput.addEventListener('input', () => {
                this.adjustTextareaHeight();
                this.updateCharCount();
            });
        }

        document.querySelectorAll('.quick-action').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.handleQuickAction(action);
            });
        });

        document.querySelectorAll('.suggestion-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
                const text = e.currentTarget.textContent;
                this.messageInput.value = text;
                this.adjustTextareaHeight();
                this.updateCharCount();
                this.sendMessage();
            });
        });

        const clearBtn = document.querySelector('[title="Clear Chat"]');
        if (clearBtn) clearBtn.addEventListener('click', () => this.clearChat());

        const exportBtn = document.querySelector('[title="Export Chat"]');
        if (exportBtn) exportBtn.addEventListener('click', () => this.exportChat());

        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) voiceBtn.addEventListener('click', () => this.startVoiceInput());

        if (this.navToggle) {
            this.navToggle.addEventListener('click', () => this.toggleNavigation());
        }

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
        if (!message || this.isTyping || message.length > 500) return;

        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.adjustTextareaHeight();
        this.updateCharCount();
        this.showTypingIndicator();

        setTimeout(() => {
            this.generateAIResponse(message);
        }, 500);
    }

    addMessage(content, sender = 'assistant') {
        const messageId = ++this.currentMessageId;
        const time = this.getCurrentTime();

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message fade-in`;
        messageDiv.dataset.messageId = messageId;

        const avatar = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';

        messageDiv.innerHTML = `
            <div class="message-avatar"><i class="${avatar}"></i></div>
            <div class="message-content">
                <div class="message-bubble">${this.formatMessage(content)}</div>
                <div class="message-time">${time}</div>
            </div>
        `;

        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
        return messageId;
    }

    formatMessage(content) {
        return `<p>${content.replace(/\n/g, '<br>').replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>')}</p>`;
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
            this.addMessage(response);
        } catch (error) {
            const fallback = this.getContextualResponse(userMessage);
            const fallbackMsg = fallback[Math.floor(Math.random() * fallback.length)];
            this.addMessage(`${fallbackMsg}\n\n*Note: I'm currently experiencing connectivity issues.*`);
        } finally {
            this.hideTypingIndicator();
        }
    }

    async callGoogleAI(userMessage) {
        const now = Date.now();
        const wait = this.apiCooldown - (now - this.lastApiCall);
        if (wait > 0) await new Promise(res => setTimeout(res, wait));
        this.lastApiCall = Date.now();

        const fullPrompt = `${this.systemPrompt} ${userMessage}`;
        const body = {
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 1024,
            },
            safetySettings: [
                { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
                { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
            ]
        };

        const res = await fetch(`${this.apiUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        const part = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (part) return part;

        if (data?.candidates?.[0]?.finishReason === 'SAFETY') {
            return "I'm being cautious with the response. Please consult a qualified professional for medical advice.";
        }

        throw new Error('No valid AI response received.');
    }

    getContextualResponse(message) {
        const msg = message.toLowerCase();
        if (msg.includes('pain') || msg.includes('ache')) return [
            "Please describe your pain's location, severity, and duration. That helps guide advice.",
            "Pain can vary in cause and treatment. Can you share more detail about what you're feeling?"
        ];
        if (msg.includes('bp') || msg.includes('blood pressure')) return [
            "Blood pressure under 120/80 is typically healthy. What were your recent readings?",
            "I can help interpret BP values. When and how did you measure it?"
        ];
        return [
            "I'm here to help with general health questions. What would you like to talk about?",
            "Let me know your symptoms or health concerns. I'm ready to assist."
        ];
    }

    handleQuickAction(action) {
        const map = {
            symptoms: "I'd like help analyzing my symptoms",
            vitals: "Can you help me understand my vital signs?",
            medication: "I have questions about my medications",
            lifestyle: "I want advice on healthy lifestyle choices"
        };
        if (map[action]) {
            this.messageInput.value = map[action];
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
        this.charCount.style.color = count > 450 ? 'var(--warning)' : count > 400 ? 'var(--secondary)' : 'var(--gray)';
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    getCurrentTime() {
        return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    clearChat() {
        if (confirm('Clear chat history?')) {
            this.chatMessages.innerHTML = '';
            this.currentMessageId = 0;
            this.addWelcomeMessage();
        }
    }

    exportChat() {
        const data = Array.from(document.querySelectorAll('.message')).map(el => ({
            sender: el.classList.contains('user-message') ? 'User' : 'AI Assistant',
            content: el.querySelector('.message-bubble').textContent.trim(),
            timestamp: el.querySelector('.message-time').textContent
        }));

        const blob = new Blob([JSON.stringify({ exportDate: new Date().toISOString(), messages: data }, null, 2)], {
            type: 'application/json'
        });

        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `chat-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    startVoiceInput() {
        const voiceBtn = document.getElementById('voiceBtn');
        if (!('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            alert('Your browser does not support voice input.');
            return;
        }

        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const rec = new Recognition();
        rec.lang = 'en-US';
        rec.interimResults = false;
        rec.continuous = false;

        const iconBackup = voiceBtn.innerHTML;
        voiceBtn.innerHTML = '<i class="fas fa-circle" style="color: red; animation: pulse 2s infinite;"></i>';
        voiceBtn.disabled = true;

        rec.onresult = (e) => {
            this.messageInput.value = e.results[0][0].transcript;
            this.adjustTextareaHeight();
            this.updateCharCount();
        };

        rec.onerror = () => {
            alert('Voice input failed. Try again.');
        };

        rec.onend = () => {
            voiceBtn.innerHTML = iconBackup;
            voiceBtn.disabled = false;
        };

        rec.start();
    }

    toggleNavigation() {
        this.navToggle.classList.toggle('active');
        this.navLinks.classList.toggle('active');
        this.navToggle.setAttribute('aria-expanded', this.navLinks.classList.contains('active'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdvancedDiagnostics();
});
