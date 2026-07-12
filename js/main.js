const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const navItems = document.querySelectorAll('.nav-link');

menuToggle?.addEventListener('click', () => {
  const isOpen = navLinks?.classList.toggle('mobile-open');
  menuToggle.setAttribute('aria-expanded', String(isOpen));
  menuToggle.classList.toggle('open', Boolean(isOpen));
});

navItems.forEach((item) => {
  item.addEventListener('click', () => {
    navLinks?.classList.remove('mobile-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
  });
});

const sections = document.querySelectorAll('main section[id]');
const setActiveLink = () => {
  const scrollPosition = window.scrollY + 140;

  sections.forEach((section) => {
    const id = section.getAttribute('id');
    const link = document.querySelector(`.nav-link[href="#${id}"]`);

    if (!link) return;

    if (scrollPosition >= section.offsetTop && scrollPosition < section.offsetTop + section.offsetHeight) {
      navItems.forEach((navItem) => navItem.classList.remove('active'));
      link.classList.add('active');
    }
  });
};

window.addEventListener('scroll', setActiveLink);
window.addEventListener('load', setActiveLink);

const counters = document.querySelectorAll('[data-count]');
const animateCounters = () => {
  counters.forEach((counter) => {
    const target = Number(counter.getAttribute('data-count'));
    const duration = 900;
    const startTime = performance.now();

    const tick = (time) => {
      const progress = Math.min((time - startTime) / duration, 1);
      counter.textContent = Math.floor(progress * target).toString();

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        counter.textContent = target.toString();
      }
    };

    requestAnimationFrame(tick);
  });
};

window.addEventListener('load', animateCounters);

const contactForm = document.getElementById('contactForm');
const statusMessage = document.querySelector('.form-status');

contactForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(contactForm);
  const name = formData.get('name')?.toString().trim() || '';
  const email = formData.get('email')?.toString().trim() || '';
  const message = formData.get('message')?.toString().trim() || '';

  if (!name || !email || !message) {
    statusMessage.textContent = 'Please complete all fields before sending your message.';
    return;
  }

  if (!email.includes('@')) {
    statusMessage.textContent = 'Please enter a valid email address.';
    return;
  }

  statusMessage.textContent = 'Thanks for reaching out. I will be in touch soon.';
  contactForm.reset();
});
