/* =========================================================
   Browse Events — real Firestore data, live-updating.
   Loaded only on browse.html.
   ========================================================= */

const eventGrid = document.getElementById('eventGrid');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const noResults = document.getElementById('noResults');
const chips = document.querySelectorAll('.chip');
const searchInput = document.getElementById('searchInput');

let allEvents = [];
let favorites = [];

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG');
}

function cardHTML(id, ev) {
  const capacity = ev.capacity || 0;
  const registered = ev.registeredCount || 0;
  const full = capacity > 0 && registered >= capacity;
  const past = isPastEvent(ev);
  let priceLabel = (ev.price && ev.price > 0) ? formatNaira(ev.price) : 'Free';
  if (full) priceLabel = 'Full';
  if (past) priceLabel = 'Ended';

  const safeImg = isSafeHttpUrl(ev.imageUrl) ? ev.imageUrl.replace(/"/g, '') : '';
  const photoStyle = safeImg
    ? `style="background-image:linear-gradient(rgba(27,20,17,.15),rgba(27,20,17,.55)),url('${safeImg}');background-size:cover;background-position:center;"`
    : '';
  const saved = favorites.indexOf(id) !== -1;

  return `
    <a class="event-card${past ? ' past' : ''}" data-category="${escapeHtml(ev.category || 'academic')}" href="event-detail.html?id=${encodeURIComponent(id)}">
      <div class="event-photo ${escapeHtml(ev.colorVariant || 'a')}" ${photoStyle}>
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

function render() {
  const activeChip = document.querySelector('.chip.active');
  const category = activeChip ? activeChip.dataset.filter : 'all';
  const query = searchInput.value.trim().toLowerCase();

  if (category === 'saved' && !auth.currentUser) {
    sessionStorage.setItem('redirectAfterLogin', 'browse.html');
    window.location.href = 'login.html';
    return;
  }

  const filtered = allEvents.filter(ev => {
    const haystack = ((ev.title || '') + ' ' + (ev.venue || '') + ' ' + (ev.host || '')).toLowerCase();
    const matchesSearch = query === '' || haystack.includes(query);
    let matchesChip = true;
    if (category === 'saved') matchesChip = favorites.indexOf(ev.id) !== -1;
    else if (category === 'upcoming') matchesChip = !isPastEvent(ev);
    else if (category === 'past') matchesChip = isPastEvent(ev);
    else matchesChip = category === 'all' || ev.category === category;
    return matchesChip && matchesSearch;
  });

  eventGrid.innerHTML = filtered.map(ev => cardHTML(ev.id, ev)).join('');

  if (allEvents.length === 0) {
    emptyState.style.display = 'block';
    noResults.style.display = 'none';
  } else if (filtered.length === 0) {
    emptyState.style.display = 'none';
    noResults.style.display = 'block';
  } else {
    emptyState.style.display = 'none';
    noResults.style.display = 'none';
  }
}

db.collection('events').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
  loadingState.style.display = 'none';
  allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  render();
}, (err) => {
  loadingState.textContent = 'Could not load events — check your Firestore rules and connection.';
  console.error(err);
});

auth.onAuthStateChanged((user) => {
  if (!user) {
    favorites = [];
    render();
    return;
  }
  db.collection('users').doc(user.uid).onSnapshot((doc) => {
    favorites = (doc.exists && Array.isArray(doc.data().favorites)) ? doc.data().favorites : [];
    render();
  });
});

chips.forEach(chip => {
  chip.addEventListener('click', () => {
    chips.forEach(c => c.classList.remove('active'));
    chip.classList.add('active');
    render();
  });
});

if (searchInput) {
  searchInput.addEventListener('input', render);
}
