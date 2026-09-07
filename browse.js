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

let allEvents = []; // populated live from Firestore

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG');
}

function cardHTML(id, ev) {
  const spotsLeft = (ev.capacity || 0) - (ev.registeredCount || 0);
  const priceLabel = (ev.price && ev.price > 0)
    ? formatNaira(ev.price)
    : (ev.registeredCount || 0) + '/' + (ev.capacity || 0);

  return `
    <a class="event-card" data-category="${ev.category || 'academic'}" href="event-detail.html?id=${id}">
      <div class="event-photo ${ev.colorVariant || 'a'}">
        <i class="fa-solid fa-${ev.icon || 'calendar-star'}"></i>
        <span class="date-badge">${ev.dateBadgeMonth || ''}<br>${ev.dateBadgeDay || ''}</span>
      </div>
      <div class="event-info">
        <div><h5>${ev.title || 'Untitled event'}</h5><p>${ev.venue || ''} · ${ev.time || ''}</p></div>
        <span class="price-pill">${priceLabel}</span>
      </div>
    </a>`;
}

function render() {
  const activeChip = document.querySelector('.chip.active');
  const category = activeChip ? activeChip.dataset.filter : 'all';
  const query = searchInput.value.trim().toLowerCase();

  const filtered = allEvents.filter(ev => {
    const matchesCategory = category === 'all' || ev.category === category;
    const haystack = ((ev.title || '') + ' ' + (ev.venue || '') + ' ' + (ev.host || '')).toLowerCase();
    const matchesSearch = query === '' || haystack.includes(query);
    return matchesCategory && matchesSearch;
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

// Real-time listener — if an organizer creates an event, this page updates live, no refresh needed
db.collection('events').orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
  loadingState.style.display = 'none';
  allEvents = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  render();
}, (err) => {
  loadingState.textContent = 'Could not load events — check your Firestore rules and connection.';
  console.error(err);
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
