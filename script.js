/* =========================================================
   UniEvents — shared script
   Link this same file from every page so nav behavior
   (sticky background + mobile menu) stays consistent.
   ========================================================= */

const nav = document.getElementById('nav');
if (nav) {
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 12);
  });
}

/* ---- Global toast helper — usable from any page's own JS ---- */
function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isSafeHttpUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (err) {
    return false;
  }
}

function isPastEvent(ev) {
  if (!ev || !ev.isoDate) return false;
  const now = new Date();
  const ymd = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  return ev.isoDate < ymd;
}

function makeTicketCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(8);
  (window.crypto || window.msCrypto).getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
  return 'UE-' + Date.now().toString(36).toUpperCase() + '-' + out;
}

function showToast(message) {
  let toastEl = document.getElementById('globalToast');
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.id = 'globalToast';
    toastEl.className = 'toast';
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = message;
  toastEl.classList.add('show');
  clearTimeout(toastEl._hideTimer);
  toastEl._hideTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
}

const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');
if (burger && mobileMenu) {
  burger.addEventListener('click', () => {
    mobileMenu.classList.toggle('open');
    burger.innerHTML = mobileMenu.classList.contains('open')
      ? '<i class="fa-solid fa-xmark"></i>'
      : '<i class="fa-solid fa-bars"></i>';
  });
}

/* ---- Real login-state nav (Firebase Authentication) ----
   Runs on every page that includes firebase-config.js.
   Guarded so pages without Firebase loaded don't error. */
if (typeof auth !== 'undefined') {
  auth.onAuthStateChanged((user) => {
    const navLogin = document.getElementById('navLoginLink');
    const navSignup = document.getElementById('navSignupLink');
    const navName = document.getElementById('navUserName');
    const navLogout = document.getElementById('navLogoutBtn');
    const mLogin = document.getElementById('mobileLoginLink');
    const mSignup = document.getElementById('mobileSignupLink');
    const mName = document.getElementById('mobileUserName');
    const mLogout = document.getElementById('mobileLogoutBtn');

    const els = [navLogin, navSignup, navName, navLogout, mLogin, mSignup, mName, mLogout];
    if (els.some(el => !el)) return; // page doesn't have these nav elements

    if (user) {
      db.collection('users').doc(user.uid).get().then((doc) => {
        const name = doc.exists ? doc.data().name : user.email.split('@')[0];
        navName.textContent = 'Hi, ' + name;
        mName.textContent = 'Hi, ' + name;
      });
      navLogin.style.display = 'none';
      navSignup.style.display = 'none';
      navName.style.display = 'inline';
      navLogout.style.display = 'inline-block';
      mLogin.style.display = 'none';
      mSignup.style.display = 'none';
      mName.style.display = 'inline';
      mLogout.style.display = 'inline-block';
    } else {
      navLogin.style.display = 'inline';
      navSignup.style.display = 'inline-block';
      navName.style.display = 'none';
      navLogout.style.display = 'none';
      mLogin.style.display = 'inline';
      mSignup.style.display = 'inline-block';
      mName.style.display = 'none';
      mLogout.style.display = 'none';
    }

    const logoutHandler = () => auth.signOut().then(() => window.location.href = 'index.html');
    navLogout.onclick = logoutHandler;
    mLogout.onclick = logoutHandler;
  });
}
