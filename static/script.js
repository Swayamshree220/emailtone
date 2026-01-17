document.addEventListener('DOMContentLoaded', function() {
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
    if (slider) {
        slider.addEventListener('input', (e) => {
            value.textContent = e.target.value;
        });
    }

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
                console.error('Template error:', error);
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
            alert('Please enter an email');
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
                loadStats();
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
            alert('Please enter an email');
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
            alert('Please enter an email');
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
            alert('Please enter a thread');
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
    const copyBtn = document.getElementById('copy-rewrite');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            const text = document.getElementById('rewritten-text').textContent;
            navigator.clipboard.writeText(text).then(() => {
                const original = copyBtn.textContent;
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = original, 2000);
            });
        });
    }

    // Chat
    const chatToggle = document.getElementById('chat-toggle');
    const chatPanel = document.getElementById('chat-panel');
    const chatClose = document.getElementById('chat-close');
    const chatInput = document.getElementById('chat-input');
    const chatSend = document.getElementById('chat-send');
    const chatMessages = document.getElementById('chat-messages');
    const typingIndicator = document.getElementById('typing-indicator');

    chatToggle.addEventListener('click', () => {
        chatPanel.classList.add('active');
        chatToggle.style.display = 'none';
    });

    chatClose.addEventListener('click', () => {
        chatPanel.classList.remove('active');
        chatToggle.style.display = 'block';
    });

    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            chatInput.value = chip.dataset.suggestion;
            sendChatMessage();
        });
    });

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendChatMessage();
    });

    chatSend.addEventListener('click', sendChatMessage);

    async function sendChatMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        let currentEmail = '';
        const activeMode = document.querySelector('.mode-panel.active');
        if (activeMode) {
            const textarea = activeMode.querySelector('textarea');
            if (textarea) currentEmail = textarea.value.trim();
        }

        addMessage(message, 'user');
        chatInput.value = '';
        chatSend.disabled = true;
        typingIndicator.style.display = 'flex';

        try {
            const response = await fetch('/chat', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ message, current_email: currentEmail })
            });

            const data = await response.json();
            typingIndicator.style.display = 'none';

            if (data.success) {
                addMessage(data.reply, 'bot');
            } else {
                addMessage('Error. Please try again.', 'bot');
            }
        } catch (error) {
            typingIndicator.style.display = 'none';
            addMessage('Connection error.', 'bot');
        } finally {
            chatSend.disabled = false;
        }
    }

    function addMessage(content, type) {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${type}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        contentDiv.textContent = content;
        msgDiv.appendChild(contentDiv);
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function showLoader() {
        document.getElementById('loader').style.display = 'flex';
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
            }
        } catch (error) {
            console.error('Stats error:', error);
        }
    }

    function displayToxicityResults(email, data) {
        const percent = data.toxicity_percent;
        document.getElementById('toxicity-fill').style.width = percent + '%';
        document.getElementById('toxicity-percent').textContent = percent + '%';
        
        let desc = '';
        if (percent < 20) desc = 'Clean';
        else if (percent < 50) desc = 'Moderate toxicity';
        else if (percent < 80) desc = 'High toxicity';
        else desc = 'Severe toxicity';
        
        document.getElementById('toxicity-desc').textContent = desc;
        
        let highlightedEmail = email;
        data.highlights.forEach(h => {
            const phrase = email.substring(h.start, h.end);
            highlightedEmail = highlightedEmail.replace(
                phrase,
                `<span class="toxic-highlight" title="${h.meaning}">${phrase}</span>`
            );
        });
        document.getElementById('highlighted-email').innerHTML = highlightedEmail;
        
        let phraseHTML = '';
        data.highlights.forEach(h => {
            phraseHTML += `
                <div class="phrase-card">
                    <div class="phrase-text">"${email.substring(h.start, h.end)}"</div>
                    <div class="phrase-meaning">${h.meaning}</div>
                </div>
            `;
        });
        document.getElementById('phrase-list').innerHTML = phraseHTML || '<p>No toxic phrases found</p>';
        
        document.getElementById('toxicity-output').style.display = 'block';
    }
});
