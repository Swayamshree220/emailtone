// Initialize Particles.js
particlesJS('particles-js', {
    particles: {
        number: { value: 80, density: { enable: true, value_area: 800 } },
        color: { value: '#ffffff' },
        shape: { type: 'circle' },
        opacity: { value: 0.5, random: false },
        size: { value: 3, random: true },
        line_linked: { enable: true, distance: 150, color: '#ffffff', opacity: 0.4, width: 1 },
        move: { enable: true, speed: 2, direction: 'none', random: false, straight: false, out_mode: 'out', bounce: false }
    },
    interactivity: {
        detect_on: 'canvas',
        events: { onhover: { enable: true, mode: 'repulse' }, onclick: { enable: true, mode: 'push' }, resize: true },
        modes: { grab: { distance: 400 }, repulse: { distance: 200 }, push: { particles_nb: 4 } }
    },
    retina_detect: true
});

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Email Assistant loaded');

    // Load stats
    loadStats();

    // Mode switching
    const modeButtons = document.querySelectorAll('.mode-btn');
    const modePanels = document.querySelectorAll('.mode-panel');

    modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.dataset.mode;
            modeButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            modePanels.forEach(p => p.classList.remove('active'));
            document.getElementById(`${mode}-mode`).classList.add('active');
        });
    });

    // Aggression slider
    const slider = document.getElementById('aggression-slider');
    const value = document.getElementById('aggression-value');
    slider.addEventListener('input', (e) => {
        value.textContent = e.target.value;
    });

    // Template loading
    document.querySelectorAll('.template-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const templateId = btn.dataset.template;
            try {
                const response = await fetch(`/load-template/${templateId}`);
                const data = await response.json();
                if (data.success) {
                    document.getElementById('email-input').value = data.template.angry;
                }
            } catch (error) {
                console.error('Template load error:', error);
            }
        });
    });

    // REWRITE EMAIL
    document.getElementById('rewrite-btn').addEventListener('click', async () => {
        const email = document.getElementById('email-input').value.trim();
        const tone = document.getElementById('tone-select').value;
        const aggression = document.getElementById('aggression-slider').value;
        const personality = document.getElementById('personality-select').value;
        
        if (!email) {
            alert('Please enter an email to rewrite');
            return;
        }
        
        showLoader();
        
        try {
            const response = await fetch('/adjust-tone', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email, tone, aggression, personality })
            });
            
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('rewritten-text').textContent = data.rewritten_email;
                document.getElementById('rewrite-output').style.display = 'block';
                loadStats(); // Update stats
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed: ' + error.message);
        } finally {
            hideLoader();
        }
    });

    // TOXICITY HEATMAP
    document.getElementById('toxicity-btn').addEventListener('click', async () => {
        const email = document.getElementById('toxicity-input').value.trim();
        
        if (!email) {
            alert('Please enter an email to analyze');
            return;
        }
        
        showLoader();
        
        try {
            const response = await fetch('/analyze-toxicity', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
                displayToxicityResults(email, data);
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed: ' + error.message);
        } finally {
            hideLoader();
        }
    });

    // DECODE EMAIL
    document.getElementById('decode-btn').addEventListener('click', async () => {
        const email = document.getElementById('decode-input').value.trim();
        
        if (!email) {
            alert('Please enter an email to decode');
            return;
        }
        
        showLoader();
        
        try {
            const response = await fetch('/decode-email', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email })
            });
            
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('decoded-text').textContent = data.analysis;
                const percentage = (data.aggression_score / 10) * 100;
                document.getElementById('aggression-fill').style.width = percentage + '%';
                document.getElementById('aggression-score').textContent = data.aggression_score + '/10';
                document.getElementById('decode-output').style.display = 'block';
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed: ' + error.message);
        } finally {
            hideLoader();
        }
    });

    // ANALYZE THREAD
    document.getElementById('analyze-btn').addEventListener('click', async () => {
        const thread = document.getElementById('thread-input').value.trim();
        
        if (!thread) {
            alert('Please enter an email thread');
            return;
        }
        
        showLoader();
        
        try {
            const response = await fetch('/analyze-thread', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ thread })
            });
            
            const data = await response.json();
            
            if (data.success) {
                document.getElementById('thread-analysis').textContent = data.analysis;
                document.getElementById('thread-output').style.display = 'block';
            } else {
                alert('Error: ' + data.error);
            }
        } catch (error) {
            alert('Failed: ' + error.message);
        } finally {
            hideLoader();
        }
    });

    // Copy button
    document.getElementById('copy-rewrite').addEventListener('click', () => {
        const text = document.getElementById('rewritten-text').textContent;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-rewrite');
            const original = btn.textContent;
            btn.textContent = '✅ Copied!';
            setTimeout(() => btn.textContent = original, 2000);
        });
    });

    // ROI Calculator
    function updateROI() {
        const employees = parseInt(document.getElementById('roi-employees').value) || 0;
        const emails = parseInt(document.getElementById('roi-emails').value) || 0;
        
        // Calculation: employees * 10min saved per day * 250 work days * $50/hr / 60min
        const savings = Math.round(employees * 10 * 250 * 50 / 60);
        document.getElementById('annual-savings').textContent = savings.toLocaleString();
    }

    document.getElementById('roi-employees').addEventListener('input', updateROI);
    document.getElementById('roi-emails').addEventListener('input', updateROI);
    updateROI();

    // Helper functions
    function showLoader() {
        document.getElementById('loader').style.display = 'block';
    }

    function hideLoader() {
        document.getElementById('loader').style.display = 'none';
    }

    async function loadStats() {
        try {
            const response = await fetch('/get-stats');
            const data = await response.json();
            if (data.success) {
                document.getElementById('emails-count').textContent = data.emails_processed;
                document.getElementById('toxicity-removed').textContent = '85%'; // Demo value
            }
        } catch (error) {
            console.error('Stats load error:', error);
        }
    }

    function displayToxicityResults(email, data) {
        // Update meter
        const percent = data.toxicity_percent;
        document.getElementById('toxicity-fill').style.width = percent + '%';
        document.getElementById('toxicity-percent').textContent = percent + '%';
        
        // Description
        let desc = '';
        if (percent < 20) desc = '✅ Clean - Minimal toxicity detected';
        else if (percent < 50) desc = '⚠️ Moderate - Some passive-aggressive language';
        else if (percent < 80) desc = '🔥 High - Significant hostility detected';
        else desc = '💀 Severe - Extremely toxic communication';
        
        document.getElementById('toxicity-desc').textContent = desc;
        
        // Highlight email
        let highlightedEmail = email;
        data.highlights.forEach(h => {
            const phrase = email.substring(h.start, h.end);
            highlightedEmail = highlightedEmail.replace(
                phrase,
                `<span class="toxic-highlight" data-meaning="${h.meaning}">${phrase}</span>`
            );
        });
        document.getElementById('highlighted-email').innerHTML = highlightedEmail;
        
        // Phrase list
        let phraseHTML = '';
        data.highlights.forEach(h => {
            phraseHTML += `
                <div class="phrase-card">
                    <div class="phrase-text">"${email.substring(h.start, h.end)}"</div>
                    <div class="phrase-meaning">${h.meaning}</div>
                </div>
            `;
        });
        document.getElementById('phrase-list').innerHTML = phraseHTML || '<p>No toxic phrases detected</p>';
        
        document.getElementById('toxicity-output').style.display = 'block';
    }

    // ========== AI EMAIL COACH CHAT ==========
    
    const chatToggle = document.getElementById('chat-toggle');
    const chatPanel = document.getElementById('chat-panel');
    const chatClose = document.getElementById('chat-close');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    // Toggle chat panel
    chatToggle.addEventListener('click', () => {
        chatPanel.classList.add('active');
        chatToggle.style.display = 'none';
    });

    chatClose.addEventListener('click', () => {
        chatPanel.classList.remove('active');
        chatToggle.style.display = 'block';
    });

    // Suggestion chips
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            const suggestion = chip.dataset.suggestion;
            chatInput.value = suggestion;
            sendChatMessage();
        });
    });

    // Send message on Enter
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });

    // Send button
    chatSend.addEventListener('click', sendChatMessage);

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Get current email from active mode
        let currentEmail = '';
        const activeMode = document.querySelector('.mode-panel.active');
        if (activeMode) {
            const textarea = activeMode.querySelector('textarea');
            if (textarea) {
                currentEmail = textarea.value.trim();
            }
        }

        // Add user message to chat
        addMessage(message, 'user');
        chatInput.value = '';
        chatSend.disabled = true;

        // Show typing indicator
        typingIndicator.style.display = 'flex';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ 
                    message: message,
                    current_email: currentEmail 
                })
            });

            const data = await response.json();

            // Hide typing indicator
            typingIndicator.style.display = 'none';

            if (data.success) {
                addMessage(data.reply, 'bot');
            } else {
                addMessage('I apologize, but I encountered an error. Please try again.', 'bot');
            }
        } catch (error) {
            typingIndicator.style.display = 'none';
            addMessage('Connection error. Please check your internet connection.', 'bot');
        } finally {
            chatSend.disabled = false;
        }
    }

    function addMessage(content, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${type}`;
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        contentDiv.textContent = content;
        
        messageDiv.appendChild(contentDiv);
        chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    console.log('✅ All features initialized');
});