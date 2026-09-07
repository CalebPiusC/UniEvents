/* =========================================================
   Contact — opens the user's mail client. Change CONTACT_TO
   to a real group inbox when you have one.
   ========================================================= */

const CONTACT_TO = 'unievents.group5@gmail.com';

const contactForm = document.getElementById('contactForm');
const contactError = document.getElementById('contactError');

if (contactForm) {
  contactForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (name.length < 2 || !email.includes('@') || message.length < 5) {
      contactError.textContent = 'Please fill in your name, a valid email, and a short message.';
      contactError.classList.add('show');
      return;
    }
    contactError.classList.remove('show');

    const subject = encodeURIComponent('UniEvents contact from ' + name);
    const body = encodeURIComponent('From: ' + name + ' <' + email + '>\n\n' + message);
    window.location.href = 'mailto:' + CONTACT_TO + '?subject=' + subject + '&body=' + body;
  });
}
