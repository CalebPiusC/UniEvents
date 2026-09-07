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

const CATEGORY_COVERS = {
  academic: 'images/academic.jpg',
  social: 'images/social.jpg',
  sports: 'images/sports.jpg',
  food: 'images/food.jpg'
};

function categoryCover(cat) {
  return CATEGORY_COVERS[cat] || CATEGORY_COVERS.academic;
}

function isCoverSrc(value) {
  if (!value) return false;
  const raw = String(value).trim();
  if (isSafeHttpUrl(raw)) return true;
  return raw.indexOf('images/') === 0 || raw.indexOf('/images/') === 0;
}

function resolveAsset(path) {
  const rel = String(path || '').replace(/^\//, '');
  try {
    return new URL(rel, document.baseURI || window.location.href).href;
  } catch (err) {
    return rel;
  }
}

function eventCoverUrl(ev) {
  const fallback = resolveAsset(categoryCover(ev && ev.category));
  const raw = ev && ev.imageUrl ? String(ev.imageUrl).trim() : '';
  if (!raw) return fallback;
  if (raw.indexOf('/images/') === 0 || raw.indexOf('images/') === 0) {
    return resolveAsset(raw.replace(/^\//, ''));
  }
  if (isSafeHttpUrl(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.protocol === 'http:') parsed.protocol = 'https:';
      return parsed.href;
    } catch (err) {
      return fallback;
    }
  }
  return fallback;
}

function coverImgHTML(ev, alt) {
  const src = eventCoverUrl(ev).replace(/"/g, '');
  const fallback = resolveAsset(categoryCover(ev && ev.category)).replace(/"/g, '');
  const safeAlt = escapeHtml(alt || (ev && ev.title) || 'Event cover');
  return `<img class="cover-img" src="${src}" alt="${safeAlt}" decoding="async" onerror="this.onerror=null;this.src='${fallback}'">`;
}

function formatNaira(n) {
  return '₦' + (n || 0).toLocaleString('en-NG');
}

function eventCardHTML(id, ev, favorites) {
  favorites = favorites || [];
  const capacity = ev.capacity || 0;
  const registered = ev.registeredCount || 0;
  const full = capacity > 0 && registered >= capacity;
  const past = isPastEvent(ev);
  let priceLabel = (ev.price && ev.price > 0) ? formatNaira(ev.price) : 'Free';
  if (full) priceLabel = 'Full';
  if (past) priceLabel = 'Ended';
  const saved = favorites.indexOf(id) !== -1;

  return `
    <a class="event-card${past ? ' past' : ''}" data-category="${escapeHtml(ev.category || 'academic')}" href="event-detail.html?id=${encodeURIComponent(id)}">
      <div class="event-photo ${escapeHtml(ev.colorVariant || 'a')}">
        ${coverImgHTML(ev, ev.title)}
        <i class="fa-solid fa-${escapeHtml(ev.icon || 'calendar-star')}"></i>
        <span class="date-badge">${escapeHtml(ev.dateBadgeMonth || '')}<br>${escapeHtml(ev.dateBadgeDay || '')}</span>
        ${saved ? '<span class="saved-dot" title="Saved"><i class="fa-solid fa-heart"></i></span>' : ''}
      </div>
      <div class="event-info">
        <div><h5>${escapeHtml(ev.title || 'Untitled event')}</h5><p>${escapeHtml(ev.venue || '')} · ${escapeHtml(ev.time || '')}</p></div>
        <span class="price-pill">${escapeHtml(priceLabel)}</span>
      </div>
    </a>`;
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
    burger.setAttribute('aria-expanded', mobileMenu.classList.contains('open') ? 'true' : 'false');
  });
  mobileMenu.querySelectorAll('a, button').forEach((el) => {
    el.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      burger.innerHTML = '<i class="fa-solid fa-bars"></i>';
    });
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

/* Home page: a few upcoming events with real cover photos */
(function loadHomeEvents() {
  const grid = document.getElementById('homeEventGrid');
  if (!grid || typeof db === 'undefined') return;
  const empty = document.getElementById('homeEventsEmpty');

  db.collection('events').orderBy('createdAt', 'desc').limit(12).get()
    .then((snap) => {
      const events = snap.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((ev) => ev.published !== false && !isPastEvent(ev))
        .slice(0, 3);
      if (!events.length) {
        if (empty) empty.style.display = 'block';
        return;
      }
      grid.innerHTML = events.map((ev) => eventCardHTML(ev.id, ev, [])).join('');
    })
    .catch((err) => console.error(err));
})();
