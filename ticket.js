/* =========================================================
   Ticket page — loads the real registration by ?code= from
   Firestore and renders a QR code that actually encodes the
   ticket code (so a real scanner could read it later).
   Loaded only on ticket.html.
   ========================================================= */

const ticketParams = new URLSearchParams(window.location.search);
const ticketCodeParam = ticketParams.get('code');

const ticketLoading = document.getElementById('ticketLoading');
const ticketNotFound = document.getElementById('ticketNotFound');
const ticketCard = document.getElementById('ticketCard');

function loadTicket() {
  if (!auth.currentUser) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'login.html';
    return;
  }
  if (!ticketCodeParam) {
    ticketLoading.style.display = 'none';
    ticketNotFound.style.display = 'block';
    return;
  }

  db.collection('registrations').where('ticketCode', '==', ticketCodeParam).limit(1).get()
    .then((snapshot) => {
      ticketLoading.style.display = 'none';
      if (snapshot.empty) {
        ticketNotFound.style.display = 'block';
        return;
      }
      const reg = snapshot.docs[0].data();

      // Only the person who owns this ticket should be able to view it.
      // (Proper enforcement still needs real Firestore security rules —
      // this is just the client-side check.)
      if (reg.userId !== auth.currentUser.uid) {
        ticketNotFound.style.display = 'block';
        return;
      }

      renderTicket(reg);
    })
    .catch((err) => {
      console.error(err);
      ticketLoading.style.display = 'none';
      ticketNotFound.style.display = 'block';
    });
}

function renderTicket(reg) {
  document.getElementById('ticketEventName').textContent = reg.eventTitle || '';
  document.getElementById('ticketEventMeta').textContent = (reg.eventVenue || '') + ' · ' + (reg.eventDate || '');
  document.getElementById('ticketDate').textContent = reg.eventDate || '';
  document.getElementById('ticketTime').textContent = reg.eventTime || '';
  document.getElementById('ticketVenue').textContent = reg.eventVenue || '';
  document.getElementById('ticketAttendee').textContent = reg.attendeeName || '';
  document.getElementById('ticketCodeText').textContent = reg.ticketCode || '';

  const stamp = document.getElementById('ticketStamp');
  if (reg.checkedIn) {
    stamp.textContent = 'USED';
    stamp.style.color = 'var(--dim)';
    stamp.style.borderColor = 'var(--dim)';
  }

  // Real QR code, encoding the real ticket code
  const qr = qrcode(0, 'M');
  qr.addData(reg.ticketCode || '');
  qr.make();
  document.getElementById('qrCodeWrap').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2 });

  ticketCard.style.display = 'block';
}

// Wait for auth state to resolve before loading (so we know if a user is logged in)
auth.onAuthStateChanged(() => loadTicket());

// Image / QR toggle
const imageBtn = document.getElementById('imageBtn');
const qrBtn = document.getElementById('qrBtn');
const imagePanel = document.getElementById('imagePanel');
const qrPanel = document.getElementById('qrPanel');

if (imageBtn && qrBtn) {
  imageBtn.addEventListener('click', () => {
    imageBtn.classList.replace('ghost', 'solid');
    qrBtn.classList.replace('solid', 'ghost');
    imagePanel.classList.add('active');
    qrPanel.classList.remove('active');
  });
  qrBtn.addEventListener('click', () => {
    qrBtn.classList.replace('ghost', 'solid');
    imageBtn.classList.replace('solid', 'ghost');
    qrPanel.classList.add('active');
    imagePanel.classList.remove('active');
  });
}
