const typingTarget = document.querySelector('.typing');

if (typingTarget) {
  const phrases = [
    'Full-Stack Developer',
    'React + Django REST Framework',
    'Building for Nepal',
    'Problem Solver'
  ];

  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const typeLoop = () => {
    const currentPhrase = phrases[phraseIndex];

    if (!deleting) {
      typingTarget.textContent = currentPhrase.slice(0, charIndex + 1);
      charIndex += 1;

      if (charIndex === currentPhrase.length) {
        deleting = true;
        setTimeout(typeLoop, 1300);
        return;
      }
    } else {
      typingTarget.textContent = currentPhrase.slice(0, charIndex - 1);
      charIndex -= 1;

      if (charIndex === 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }

    setTimeout(typeLoop, deleting ? 55 : 95);
  };

  typeLoop();
}
