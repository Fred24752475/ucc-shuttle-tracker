function createCodeBoxes(root) {
    root.classList.add('otp-row');
    root.innerHTML = Array.from({ length: 6 }, (_, index) =>
        `<input inputmode="numeric" maxlength="1" aria-label="Digit ${index + 1}" autocomplete="${index === 0 ? 'one-time-code' : 'off'}">`
    ).join('');
    const inputs = [...root.querySelectorAll('input')];
    inputs.forEach((input, index) => {
        input.addEventListener('input', () => {
            input.value = input.value.replace(/\D/g, '').slice(-1);
            if (input.value && inputs[index + 1]) inputs[index + 1].focus();
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
        });
    });
    return {
        code: () => inputs.map((input) => input.value).join(''),
        focus: () => inputs[0].focus()
    };
}
