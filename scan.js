/* =========================================================
   QR Check-in Scanner — organizer/admin only.
   Camera scan + manual ticket-code entry.
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
const stopBtn = document.getElementById('stopBtn');
const scanResult = document.getElementById('scanResult');
const resultCard = document.getElementById('resultCard');
const resultTitle = document.getElementById('resultTitle');
const resultBody = document.getElementById('resultBody');
const manualForm = document.getElementById('manualForm');
const manualCode = document.getElementById('manualCode');

startBtn.addEventListener('click', () => {
  if (html5QrCode) return;
  html5QrCode = new Html5Qrcode('reader');
  startBtn.style.display = 'none';
  if (stopBtn) stopBtn.style.display = 'inline-block';

  html5QrCode.start(
    { facingMode: 'environment' },
    { fps: 10, qrbox: 250 },
    onScanSuccess,
    () => {}
  ).catch((err) => {
    console.error(err);
    showToast('Could not access camera — check permissions, or type the code below.');
    startBtn.style.display = 'inline-block';
    if (stopBtn) stopBtn.style.display = 'none';
    html5QrCode = null;
  });
});

if (stopBtn) {
  stopBtn.addEventListener('click', () => {
    if (!html5QrCode) return;
    html5QrCode.stop().then(() => {
      html5QrCode.clear();
      html5QrCode = null;
      startBtn.style.display = 'inline-block';
      stopBtn.style.display = 'none';
    }).catch(() => {
      html5QrCode = null;
      startBtn.style.display = 'inline-block';
      stopBtn.style.display = 'none';
    });
  });
}

if (manualForm) {
  manualForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const code = (manualCode.value || '').trim();
    if (!code) return;
    onScanSuccess(code);
  });
}

function onScanSuccess(decodedText) {
  if (isProcessing) return;
  isProcessing = true;
  if (html5QrCode && html5QrCode.pause) {
    try { html5QrCode.pause(true); } catch (err) { /* not started */ }
  }

  db.collection('registrations').where('ticketCode', '==', decodedText.trim()).limit(1).get()
    .then((snap) => {
      if (snap.empty) {
        showResult('invalid', 'Invalid Ticket', 'This code doesn\'t match any registration.');
        return;
      }
      const doc = snap.docs[0];
      const reg = doc.data();

      if (reg.checkedIn) {
        showResult('warning', 'Already Checked In', (reg.attendeeName || '') + ' — ' + (reg.eventTitle || ''));
        return;
      }

      doc.ref.update({
        checkedIn: true,
        checkedInAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => {
        showResult('success', 'Checked In ✓', (reg.attendeeName || '') + ' — ' + (reg.eventTitle || ''));
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
    if (html5QrCode && html5QrCode.resume) {
      try { html5QrCode.resume(); } catch (err) { /* stopped */ }
    }
  }, 2500);
}
