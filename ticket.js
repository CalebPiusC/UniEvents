/* =========================================================
   Ticket page — loads the real registration by ?code= from
   Firestore and renders a QR code that encodes the ticket code.
   Loaded only on ticket.html.
   ========================================================= */

const ticketParams = new URLSearchParams(window.location.search);
const ticketCodeParam = ticketParams.get('code');

const ticketLoading = document.getElementById('ticketLoading');
const ticketNotFound = document.getElementById('ticketNotFound');
const ticketCard = document.getElementById('ticketCard');

let currentReg = null;
let currentRegRef = null;

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

  db.collection('registrations')
    .where('userId', '==', auth.currentUser.uid)
    .where('ticketCode', '==', ticketCodeParam)
    .limit(1)
    .get()
    .then((snapshot) => {
      ticketLoading.style.display = 'none';
      if (snapshot.empty) {
        ticketNotFound.style.display = 'block';
        return;
      }
      currentRegRef = snapshot.docs[0].ref;
      currentReg = snapshot.docs[0].data();
      renderTicket(currentReg);
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

  const qtyEl = document.getElementById('ticketQty');
  if (qtyEl) qtyEl.textContent = String(reg.quantity || 1);

  const stamp = document.getElementById('ticketStamp');
  if (reg.checkedIn) {
    stamp.textContent = 'USED';
    stamp.style.color = 'var(--dim)';
    stamp.style.borderColor = 'var(--dim)';
  }

  const qr = qrcode(0, 'M');
  qr.addData(reg.ticketCode || '');
  qr.make();
  document.getElementById('qrCodeWrap').innerHTML = qr.createSvgTag({ cellSize: 4, margin: 2 });

  ticketCard.style.display = 'block';

  const cancelBtn = document.getElementById('cancelTicketBtn');
  if (cancelBtn) {
    cancelBtn.style.display = reg.checkedIn ? 'none' : 'inline-block';
  }
}

auth.onAuthStateChanged(() => loadTicket());

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

const printBtn = document.getElementById('printTicketBtn');
if (printBtn) printBtn.addEventListener('click', () => window.print());

const calBtn = document.getElementById('calendarBtn');
if (calBtn) {
  calBtn.addEventListener('click', () => {
    if (!currentReg) return;
    const day = (currentReg.eventIsoDate || '').replace(/-/g, '');
    const dt = day && day.length === 8 ? day : '';
    const summary = (currentReg.eventTitle || 'UniEvents').replace(/[,\\;]/g, ' ');
    const loc = (currentReg.eventVenue || '').replace(/[,\\;]/g, ' ');
    const ics = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//UniEvents//EN',
      'BEGIN:VEVENT',
      'SUMMARY:' + summary,
      dt ? ('DTSTART;VALUE=DATE:' + dt) : '',
      'LOCATION:' + loc,
      'DESCRIPTION:Ticket ' + (currentReg.ticketCode || ''),
      'END:VEVENT',
      'END:VCALENDAR'
    ].filter(Boolean).join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'unievents-ticket.ics';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

const cancelBtn = document.getElementById('cancelTicketBtn');
if (cancelBtn) {
  cancelBtn.addEventListener('click', () => {
    if (!currentReg || !currentRegRef || currentReg.checkedIn) return;
    if (!confirm('Cancel this registration? Your spot will be released.')) return;

    const eventRef = db.collection('events').doc(currentReg.eventId);
    const qty = currentReg.quantity || 1;

    db.runTransaction((t) => {
      return t.get(eventRef).then((doc) => {
        if (doc.exists) {
          const next = Math.max(0, (doc.data().registeredCount || 0) - qty);
          t.update(eventRef, { registeredCount: next });
        }
        t.delete(currentRegRef);
      });
    }).then(() => {
      showToast('Registration cancelled.');
      window.location.href = 'my-tickets.html';
    }).catch((err) => {
      console.error(err);
      showToast('Could not cancel — try again.');
    });
  });
}
