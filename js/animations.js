// Reveal logic: ensure above-fold reveal elements become visible immediately
// while still using IntersectionObserver for elements below the fold.
document.addEventListener('DOMContentLoaded', () => {
  const revealItems = document.querySelectorAll('.reveal');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 }
    );

    // Make all reveal items visible immediately to avoid hiding content.
    // IntersectionObserver still works for animations, but this guarantees visibility.
    revealItems.forEach((item) => {
      item.classList.add('is-visible');
      const rect = item.getBoundingClientRect();
      if (rect.top >= window.innerHeight || rect.bottom <= 0) {
        observer.observe(item);
      }
    });
  } else {
    // Fallback for older browsers: make all reveal elements visible.
    revealItems.forEach((item) => item.classList.add('is-visible'));
  }
});

const header = document.querySelector('.site-header');
const backToTop = document.querySelector('.back-to-top');

window.addEventListener('scroll', () => {
  if (window.scrollY > 40) {
    header?.classList.add('scrolled');
    if (backToTop) backToTop.style.display = 'flex';
  } else {
    header?.classList.remove('scrolled');
    if (backToTop) backToTop.style.display = 'none';
  }
});

backToTop?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});
