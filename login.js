/* =========================================================
   Login — page-specific behavior only. Loaded only on login.html.
   ========================================================= */

const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const loginSubmit = document.getElementById('loginSubmit');

function showLoginError(msg) {
  loginError.textContent = msg;
  loginError.classList.add('show');
}

function friendlyLoginError(code) {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/too-many-requests': return 'Too many attempts — please wait a moment and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    loginError.classList.remove('show');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    loginSubmit.disabled = true;
    loginSubmit.textContent = 'Logging in...';

    auth.signInWithEmailAndPassword(email, password)
      .then(() => {
        const redirect = sessionStorage.getItem('redirectAfterLogin');
        sessionStorage.removeItem('redirectAfterLogin');
        window.location.href = redirect || 'browse.html';
      })
      .catch((err) => {
        showLoginError(friendlyLoginError(err.code));
        loginSubmit.disabled = false;
        loginSubmit.textContent = 'Log In';
      });
  });
}
