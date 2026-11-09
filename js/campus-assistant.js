(function () {
    const history = [];
    const greeting = "Hey there! 👋 I'm your UCC 🚌 shuttle buddy. What's going on today?";

    function box() {
        return document.getElementById('aiMessages');
    }

    function showGreeting() {
        const list = box();
        if (!list || list.textContent.indexOf('shuttle buddy') !== -1) return;
        addLine(greeting, false);
    }

    function addLine(text, mine) {
        const list = box();
        if (!list) return;
        const row = document.createElement('div');
        row.className = mine ? 'message message-sent' : 'message message-received';
        const body = document.createElement('div');
        body.className = 'message-content';
        const paragraph = document.createElement('p');
        paragraph.textContent = text;
        body.appendChild(paragraph);
        row.appendChild(body);
        list.appendChild(row);
        list.scrollTop = list.scrollHeight;
    }

    async function ask(text) {
        const input = document.getElementById('aiInput');
        const message = (text || (input && input.value) || '').trim();
        if (!message) return;
        if (input) input.value = '';
        addLine(message, true);
        const token = localStorage.getItem('ucc_token');
        try {
            const response = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: 'Bearer ' + token
                },
                body: JSON.stringify({ message, history })
            });
            const data = await response.json();
            const reply = data.success
                ? data.response
                : (data.message || 'The assistant could not answer just now. Try again.');
            history.push({ role: 'user', content: message }, { role: 'assistant', content: reply });
            if (history.length > 8) history.splice(0, history.length - 8);
            addLine(reply, false);
        } catch (error) {
            addLine('We could not reach the assistant. Check your internet and try again.', false);
        }
    }

    function bind() {
        const button = document.getElementById('aiSendBtn');
        const input = document.getElementById('aiInput');
        if (button && !button.dataset.campusAi) {
            button.dataset.campusAi = '1';
            button.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopImmediatePropagation();
                ask();
            }, true);
        }
        if (input && !input.dataset.campusAi) {
            input.dataset.campusAi = '1';
            input.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    ask();
                }
            });
        }
        showGreeting();
        window.sendSimpleAI = ask;
        window.sendQuickMessage = function (message) {
            if (input) input.value = message;
            ask(message);
        };
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind);
    else bind();
})();
