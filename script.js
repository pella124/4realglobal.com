const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle.addEventListener('click', () => {
  const open = navLinks.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  menuToggle.textContent = open ? '×' : '☰';
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.textContent = '☰';
  });
});

document.getElementById('year').textContent = new Date().getFullYear();

document.getElementById('contactForm').addEventListener('submit', function (e) {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const course = document.getElementById('course').value;
  const message = document.getElementById('message').value.trim();

  const text =
    `Hello 4REAL GLOBAL IT SOLUTION,%0A%0A` +
    `My name is ${encodeURIComponent(name)}.%0A` +
    `Email: ${encodeURIComponent(email)}%0A` +
    `Course of interest: ${encodeURIComponent(course)}%0A` +
    `Message: ${encodeURIComponent(message)}`;

  window.open(`https://wa.me/2348073634913?text=${text}`, '_blank');
});
