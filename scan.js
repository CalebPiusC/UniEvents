/* =========================================================
   QR Check-in Scanner — organizer/admin only.
   Scans a ticket's QR code, looks it up in Firestore,
   and marks it checked in (with duplicate-scan protection).
   Loaded only on scan.html.
   ========================================================= */

let html5QrCode = null;
let isProcessing = false;

auth.onAuthStateChanged((user) => {
  const authLoading = document.getElementById('scanAuthLoading');
  const notAllowed = document.getElementById('scanNotAllowed');
  const scanApp = document.getElementById('scanApp');

  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'login.html';
    return;
  }

  db.collection('users').doc(user.uid).get().then((doc) => {
    const role = doc.exists ? doc.data().role : 'student';
    authLoading.style.display = 'none';
    if (role === 'organizer' || role === 'admin') {
      scanApp.style.display = 'block';
    } else {
      notAllowed.style.display = 'block';
    }
  });
});

const startBtn = document.getElementById('startBtn');
const scanResult = document.getElementById('scanResult');
const resultCard = document.getElementById('resultCard');
const resultTitle = document.getElementById('resultTitle');
const resultBody = document.getElementById('resultBody');

startBtn.addEventListener('click', () => {
  if (html5QrCode) return; // already running
  html5QrCode = new Html5Qrcode('reader');
  startBtn.style.display = 'none';

  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    onScanSuccess,
    () => { /* ignore per-frame "no code found" errors */ }
  ).catch((err) => {
    console.error(err);
    showToast('Could not access camera — check permissions.');
    startBtn.style.display = 'inline-block';
  });
});

function onScanSuccess(decodedText) {
  if (isProcessing) return; // ignore rapid repeat scans of the same frame
  isProcessing = true;
  html5QrCode.pause(true);

  db.collection('registrations').where('ticketCode', '==', decodedText).limit(1).get()
    .then((snap) => {
      if (snap.empty) {
        showResult('invalid', 'Invalid Ticket', 'This code doesn\'t match any registration.');
        return;
      }
      const doc = snap.docs[0];
      const reg = doc.data();

      if (reg.checkedIn) {
        showResult('warning', 'Already Checked In', reg.attendeeName + ' — ' + reg.eventTitle);
        return;
      }

      doc.ref.update({
        checkedIn: true,
        checkedInAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        showResult('success', 'Checked In ✓', reg.attendeeName + ' — ' + reg.eventTitle);
      });
    })
    .catch((err) => {
      console.error(err);
      showResult('invalid', 'Error', 'Could not look up this ticket — try again.');
    });
}

function showResult(type, title, body) {
  resultTitle.textContent = title;
  resultBody.textContent = body;
  resultCard.style.borderLeft = '4px solid ' + (
    type === 'success' ? 'var(--green)' : type === 'warning' ? 'var(--coral)' : 'var(--dim)'
  );
  scanResult.style.display = 'block';

  setTimeout(() => {
    scanResult.style.display = 'none';
    isProcessing = false;
    if (html5QrCode) html5QrCode.resume();
  }, 2500);
}
