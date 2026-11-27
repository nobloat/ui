// message: the close button, or the end of its bar (data-auto), fades it out (duration-slow, ease; instant with reduced motion), then removes it
const closeMessage = m => { m.classList.add('closing'); setTimeout(() => m.remove(), parseFloat(getComputedStyle(m).transitionDuration) * 1000); };
document.addEventListener('click', e => { const m = e.target.closest('.message > .button')?.parentElement; if (m) closeMessage(m); });
document.addEventListener('animationend', e => { if (e.animationName === 'message-stay') closeMessage(e.target); });
