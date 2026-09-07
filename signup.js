/* =========================================================
   Signup — page-specific behavior only. Loaded only on signup.html.
   ========================================================= */

const signupForm = document.getElementById('signupForm');
const signupError = document.getElementById('signupError');
const signupSubmit = document.getElementById('signupSubmit');

function showSignupError(msg) {
  signupError.textContent = msg;
  signupError.classList.add('show');
}

function friendlySignupError(code) {
  switch (code) {
    case 'auth/email-already-in-use': return 'An account with this email already exists — try logging in instead.';
    case 'auth/invalid-email': return 'Please enter a valid email address.';
    case 'auth/weak-password': return 'Password is too weak — use at least 6 characters.';
    default: return 'Something went wrong. Please try again.';
  }
}

if (signupForm) {
  signupForm.addEventListener('submit', (e) => {
    e.preventDefault();
    signupError.classList.remove('show');

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    if (name.length < 2) {
      showSignupError('Please enter your full name.');
      return;
    }
    if (password.length < 6) {
      showSignupError('Password must be at least 6 characters.');
      return;
    }

    signupSubmit.disabled = true;
    signupSubmit.textContent = 'Creating account...';

    auth.createUserWithEmailAndPassword(email, password)
      .then((cred) => {
        return db.collection('users').doc(cred.user.uid).set({
          name: name,
          email: email,
          role: 'student', // everyone starts as a student; organizer access is requested later
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
      })
      .then(() => {
        window.location.href = 'browse.html';
      })
      .catch((err) => {
        showSignupError(friendlySignupError(err.code));
        signupSubmit.disabled = false;
        signupSubmit.textContent = 'Create Account';
      });
  });
}
