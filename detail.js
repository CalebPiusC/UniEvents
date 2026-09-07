/* =========================================================
   Event Detail — real Firestore event data + real registrations.
   Loaded only on event-detail.html.
   ========================================================= */

const PAYSTACK_PUBLIC_KEY = 'pk_test_5bfe5d9c696924eb223b4a5eac855ca5272e79e3';

const params = new URLSearchParams(window.location.search);
const eventId = params.get('id');

const detailMain = document.getElementById('detailMain');
const notFoundState = document.getElementById('notFoundState');
const stickyCta = document.getElementById('stickyCta');

const registerBtn = document.getElementById('registerBtn');
const checkoutOverlay = document.getElementById('checkoutOverlay');
const checkoutCancel = document.getElementById('checkoutCancel');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const viewTicketLink = document.getElementById('viewTicketLink');

const qtyMinus = document.getElementById('qtyMinus');
const qtyPlus = document.getElementById('qtyPlus');
const qtyValue = document.getElementById('qtyValue');
const unitPriceLabel = document.getElementById('unitPriceLabel');
const unitPriceValue = document.getElementById('unitPriceValue');
const totalPriceValue = document.getElementById('totalPriceValue');
const payBtn = document.getElementById('payBtn');
const checkoutEmail = document.getElementById('checkoutEmail');
const emailError = document.getElementById('emailError');
const successMessage = document.getElementById('successMessage');
const refDisplay = document.getElementById('refDisplay');

let qty = 1;
let currentEvent = null;

function formatNaira(n) {
  return '₦' + n.toLocaleString('en-NG');
}

// ---- Load the event by ID from Firestore ----
if (!eventId) {
  notFoundState.style.display = 'block';
} else {
  db.collection('events').doc(eventId).get().then((doc) => {
    if (!doc.exists) {
      notFoundState.style.display = 'block';
      return;
    }
    currentEvent = doc.data();
    renderEvent();
  }).catch((err) => {
    console.error(err);
    notFoundState.style.display = 'block';
  });
}

function renderEvent() {
  const ev = currentEvent;
  document.title = ev.title + ' — UniEvents';
  document.getElementById('detailTitle').textContent = ev.title || '';
  document.getElementById('heroIcon').className = 'fa-solid fa-' + (ev.icon || 'calendar-star') + ' bgicon';
  document.getElementById('metaDate').textContent = ev.date || '';
  document.getElementById('metaTime').textContent = ev.time || '';
  document.getElementById('metaVenue').textContent = ev.venue || '';
  document.getElementById('metaHost').textContent = ev.host || '';
  document.getElementById('detailDescription').textContent = ev.description || '';
  document.getElementById('priceTagDisplay').textContent = (ev.price && ev.price > 0) ? formatNaira(ev.price) : 'Free';

  const hero = document.querySelector('.detail-hero');
  const cover = eventCoverUrl(ev);
  if (hero && cover) {
    hero.style.backgroundImage = 'linear-gradient(rgba(27,20,17,.35), rgba(27,20,17,.78)), url("' + cover.replace(/"/g, '') + '")';
    hero.style.backgroundSize = 'cover';
    hero.style.backgroundPosition = 'center';
  }

  if (Array.isArray(ev.whatToExpect) && ev.whatToExpect.length > 0) {
    document.getElementById('expectHeading').style.display = 'block';
    document.getElementById('expectList').innerHTML = ev.whatToExpect.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  }

  const capacity = ev.capacity || 0;
  const registered = ev.registeredCount || 0;
  const pct = capacity > 0 ? Math.min(100, Math.round((registered / capacity) * 100)) : 0;
  document.getElementById('capTotal').textContent = capacity;
  const capFill = document.getElementById('capFill');
  requestAnimationFrame(() => setTimeout(() => { capFill.style.width = pct + '%'; }, 150));
  let current = 0;
  const step = Math.max(1, Math.round(registered / 40));
  const capText = document.getElementById('capText');
  const counter = setInterval(() => {
    current += step;
    if (current >= registered) { current = registered; clearInterval(counter); }
    capText.textContent = current;
  }, 20);

  registerBtn.textContent = (ev.price && ev.price > 0) ? 'Buy Ticket — ' + formatNaira(ev.price) : 'Get a Ticket';
  registerBtn.disabled = false;
  registerBtn.dataset.mode = 'register';
  if (isPastEvent(ev)) {
    registerBtn.textContent = 'This event has ended';
    registerBtn.disabled = true;
    registerBtn.dataset.mode = 'ended';
  } else if (registered >= capacity && capacity > 0) {
    registerBtn.textContent = 'Join waitlist';
    registerBtn.disabled = false;
    registerBtn.dataset.mode = 'waitlist';
  }

  detailMain.style.display = 'block';
  stickyCta.style.display = 'flex';
  loadReviews();
  refreshWaitlistButton();
}

// ---- Share this event ----
const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', () => {
    const shareUrl = window.location.href;
    const shareData = {
      title: currentEvent ? currentEvent.title : 'UniEvents',
      text: currentEvent ? ('Check out ' + currentEvent.title + ' on UniEvents') : 'Check out this event on UniEvents',
      url: shareUrl
    };
    if (navigator.share) {
      navigator.share(shareData).catch(() => {});
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        showToast('Link copied to clipboard!');
      }).catch(() => {
        prompt('Copy this link:', shareUrl);
      });
    } else {
      prompt('Copy this link:', shareUrl);
    }
  });
}

// ---- Heart toggle (saved to the user document) ----
const heartBtn = document.getElementById('heartBtn');
function setHeartUI(on) {
  if (!heartBtn) return;
  heartBtn.classList.toggle('active', on);
  const icon = heartBtn.querySelector('i');
  if (!icon) return;
  icon.classList.toggle('fa-solid', on);
  icon.classList.toggle('fa-regular', !on);
}

if (heartBtn) {
  heartBtn.addEventListener('click', () => {
    if (!auth.currentUser) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = 'login.html';
      return;
    }
    if (!eventId) return;
    const userRef = db.collection('users').doc(auth.currentUser.uid);
    const already = heartBtn.classList.contains('active');
    userRef.update({
      favorites: already
        ? firebase.firestore.FieldValue.arrayRemove(eventId)
        : firebase.firestore.FieldValue.arrayUnion(eventId)
    }).then(() => {
      setHeartUI(!already);
      showToast(already ? 'Removed from saved' : 'Saved to your list');
    }).catch((err) => {
      console.error(err);
      showToast('Could not update saved events.');
    });
  });
}

// ---- Register / buy flow ----
function updatePriceDisplay() {
  const unitPrice = currentEvent.price || 0;
  const total = unitPrice * qty;
  unitPriceLabel.textContent = formatNaira(unitPrice) + ' × ' + qty;
  unitPriceValue.textContent = formatNaira(unitPrice);
  totalPriceValue.textContent = formatNaira(total);
  payBtn.textContent = 'Pay ' + formatNaira(total) + ' with Paystack';
}

if (qtyMinus) qtyMinus.addEventListener('click', () => { if (qty > 1) { qty--; qtyValue.textContent = qty; updatePriceDisplay(); } });
if (qtyPlus) qtyPlus.addEventListener('click', () => { if (qty < 6) { qty++; qtyValue.textContent = qty; updatePriceDisplay(); } });

function openCheckoutOrRegister() {
  qty = 1;
  qtyValue.textContent = qty;
  document.getElementById('orderEventName').textContent = currentEvent.title;
  document.getElementById('orderEventMeta').textContent = (currentEvent.date || '') + ' · ' + (currentEvent.time || '') + ' · ' + (currentEvent.venue || '');
  updatePriceDisplay();

  if ((currentEvent.price || 0) > 0) {
    checkoutOverlay.classList.add('open');
  } else {
    completeRegistration(null);
  }
}

function refreshWaitlistButton() {
  if (!auth.currentUser || !eventId || !registerBtn) return;
  if (registerBtn.dataset.mode !== 'waitlist' && registerBtn.dataset.mode !== 'waiting') return;
  db.collection('waitlist')
    .where('userId', '==', auth.currentUser.uid)
    .where('eventId', '==', eventId)
    .limit(1)
    .get()
    .then((snap) => {
      if (!snap.empty) {
        registerBtn.textContent = 'You’re on the waitlist';
        registerBtn.disabled = true;
        registerBtn.dataset.mode = 'waiting';
      }
    })
    .catch((err) => console.error(err));
}

function joinWaitlist() {
  db.collection('waitlist').add({
    userId: auth.currentUser.uid,
    eventId: eventId,
    eventTitle: currentEvent.title || '',
    userName: auth_state_cache.attendeeName || auth.currentUser.email,
    userEmail: auth.currentUser.email || '',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    showToast('You’re on the waitlist. If a spot opens, register from this page.');
    refreshWaitlistButton();
  }).catch((err) => {
    console.error(err);
    showToast('Could not join the waitlist.');
  });
}

if (registerBtn) {
  registerBtn.addEventListener('click', () => {
    if (!currentEvent) return;

    // Auth gate: must be logged in to register
    if (!auth.currentUser) {
      sessionStorage.setItem('redirectAfterLogin', window.location.href);
      window.location.href = 'login.html';
      return;
    }

    if (registerBtn.dataset.mode === 'waitlist') {
      joinWaitlist();
      return;
    }
    if (registerBtn.dataset.mode === 'ended' || registerBtn.dataset.mode === 'waiting') return;

    db.collection('registrations')
      .where('userId', '==', auth.currentUser.uid)
      .where('eventId', '==', eventId)
      .limit(1)
      .get()
      .then((snap) => {
        if (!snap.empty) {
          const existing = snap.docs[0].data();
          showToast('You already have a ticket for this event.');
          window.location.href = 'ticket.html?code=' + encodeURIComponent(existing.ticketCode);
          return;
        }
        openCheckoutOrRegister();
      })
      .catch((err) => {
        console.error(err);
        openCheckoutOrRegister();
      });
  });
}

if (checkoutCancel) checkoutCancel.addEventListener('click', () => checkoutOverlay.classList.remove('open'));
if (checkoutOverlay) checkoutOverlay.addEventListener('click', (e) => { if (e.target === checkoutOverlay) checkoutOverlay.classList.remove('open'); });

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

if (payBtn) {
  payBtn.addEventListener('click', () => {
    const email = checkoutEmail.value.trim();
    if (!isValidEmail(email)) { emailError.classList.add('show'); return; }
    emailError.classList.remove('show');

    const total = (currentEvent.price || 0) * qty;
    const ref = 'UNIEVT_' + Date.now();

    const handler = PaystackPop.setup({
      key: PAYSTACK_PUBLIC_KEY,
      email: email,
      amount: total * 100,
      currency: 'NGN',
      ref: ref,
      metadata: {
        custom_fields: [
          { display_name: 'Event', variable_name: 'event', value: currentEvent.title },
          { display_name: 'Tickets', variable_name: 'quantity', value: qty }
        ]
      },
      callback: function (response) {
        checkoutOverlay.classList.remove('open');
        completeRegistration(response.reference);
      },
      onClose: function () {}
    });
    handler.openIframe();
  });
}

// ---- Real Firestore write: transaction-protected so two people
//      can't both grab the last spot at the same time ----
const auth_state_cache = {};
auth.onAuthStateChanged((user) => {
  if (user) {
    if (checkoutEmail && user.email) checkoutEmail.value = user.email;
    db.collection('users').doc(user.uid).get().then((doc) => {
      const data = doc.exists ? doc.data() : {};
      auth_state_cache.attendeeName = data.name || user.email;
      const favs = Array.isArray(data.favorites) ? data.favorites : [];
      setHeartUI(!!eventId && favs.indexOf(eventId) !== -1);
      refreshWaitlistButton();
    });
  } else {
    setHeartUI(false);
  }
});

function completeRegistration(paymentRef) {
  const user = auth.currentUser;
  const ticketCode = makeTicketCode();
  const eventRef = db.collection('events').doc(eventId);
  const regRef = db.collection('registrations').doc();

  db.runTransaction((t) => {
    return t.get(eventRef).then((doc) => {
      if (!doc.exists) throw new Error('This event no longer exists.');
      const data = doc.data();
      const newCount = (data.registeredCount || 0) + qty;
      if (data.capacity && newCount > data.capacity) {
        throw new Error('Sorry — not enough spots left for that many tickets.');
      }
      t.update(eventRef, { registeredCount: newCount });
      t.set(regRef, {
        userId: user.uid,
        eventId: eventId,
        eventTitle: data.title,
        eventDate: data.date || '',
        eventTime: data.time || '',
        eventVenue: data.venue || '',
        eventIsoDate: data.isoDate || '',
        attendeeName: auth_state_cache.attendeeName || user.email,
        ticketCode: ticketCode,
        quantity: qty,
        amountPaid: (data.price || 0) * qty,
        paymentRef: paymentRef || null,
        checkedIn: false,
        registeredAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }).then(() => {
    successMessage.textContent = 'Your ticket for ' + currentEvent.title + ' has been added to My Tickets, with a QR code ready to scan at the door.';
    refDisplay.textContent = 'Ticket code: ' + ticketCode;
    viewTicketLink.href = 'ticket.html?code=' + ticketCode;
    modalOverlay.classList.add('open');
  }).catch((err) => {
    alert(err.message || 'Something went wrong completing your registration.');
  });
}

if (modalClose) modalClose.addEventListener('click', () => modalOverlay.classList.remove('open'));
if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('open'); });
