/* =========================================================
   My Tickets — lists every real registration belonging to
   the logged-in user, pulled from Firestore.
   Loaded only on my-tickets.html.
   ========================================================= */

const ticketsGrid = document.getElementById('ticketsGrid');
const ticketsLoading = document.getElementById('ticketsLoading');
const ticketsEmpty = document.getElementById('ticketsEmpty');

function cardHTML(id, reg) {
  const statusLabel = reg.checkedIn ? 'Used' : 'Valid';
  return `
    <a class="event-card" data-category="academic" href="ticket.html?id=${encodeURIComponent(id)}&code=${encodeURIComponent(reg.ticketCode || '')}">
      <div class="event-photo a">
        <i class="fa-solid fa-ticket"></i>
      </div>
      <div class="event-info">
        <div><h5>${escapeHtml(reg.eventTitle || 'Event')}</h5><p>${escapeHtml(reg.eventVenue || '')} · ${escapeHtml(reg.eventDate || '')}</p></div>
        <span class="price-pill">${statusLabel}</span>
      </div>
    </a>`;
}

function millis(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  return 0;
}

function loadMyTickets(user) {
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'login.html';
    return;
  }

  db.collection('registrations')
    .where('userId', '==', user.uid)
    .get()
    .then((snapshot) => {
      ticketsLoading.style.display = 'none';
      if (snapshot.empty) {
        ticketsEmpty.style.display = 'block';
        ticketsGrid.innerHTML = '';
        return;
      }
      const docs = snapshot.docs.slice().sort((a, b) => millis(b.data().registeredAt) - millis(a.data().registeredAt));
      ticketsGrid.innerHTML = docs.map(doc => cardHTML(doc.id, doc.data())).join('');
    })
    .catch((err) => {
      console.error(err);
      ticketsLoading.textContent = 'Could not load your tickets — check your connection and try again.';
    });
}

auth.onAuthStateChanged((user) => loadMyTickets(user));
