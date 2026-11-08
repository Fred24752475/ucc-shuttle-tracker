function setBusy(button, busy, label) {
    if (!button) return;
    if (!button.dataset.idle) button.dataset.idle = button.textContent;
    button.disabled = !!busy;
    button.classList.toggle('is-loading', !!busy);
    button.setAttribute('aria-busy', busy ? 'true' : 'false');
    button.textContent = busy ? label : button.dataset.idle;
}

function showWait(text) {
    let note = document.getElementById('waitNote');
    if (!note) {
        note = document.createElement('p');
        note.id = 'waitNote';
        note.className = 'wait-note';
        const box = document.querySelector('.login-container') || document.body;
        box.appendChild(note);
    }
    note.hidden = !text;
    note.textContent = text || '';
}

function createCodeBoxes(root, options) {
    root.classList.add('otp-row');
    root.innerHTML = Array.from({ length: 6 }, (_, index) =>
        `<input inputmode="numeric" maxlength="1" aria-label="Digit ${index + 1}" autocomplete="${index === 0 ? 'one-time-code' : 'off'}">`
    ).join('');
    const inputs = [...root.querySelectorAll('input')];
    const notify = () => options && options.onChange && options.onChange();
    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(-1);
            if (input.value && inputs[index + 1]) inputs[index + 1].focus();
            notify();
        });
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Backspace' && !input.value && inputs[index - 1]) {
                inputs[index - 1].focus();
            }
        });
        input.addEventListener('paste', (event) => {
            const text = (event.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
            if (!text) return;
            event.preventDefault();
            text.split('').forEach((char, slot) => {
                if (inputs[slot]) inputs[slot].value = char;
            });
            inputs[Math.min(text.length, inputs.length) - 1].focus();
            notify();
        });
    });
    return {
        code: () => inputs.map((input) => input.value).join(''),
        focus: () => inputs[0].focus()
    };
}
