/* =========================================================
   Organizer Dashboard — role-gated:
   - student  -> apply-to-organize form / pending / rejected banner
   - organizer/admin -> create/edit events, view registrants
   - admin only -> approve/reject pending organizer requests
   Loaded only on dashboard.html.
   ========================================================= */

const dashLoading = document.getElementById('dashLoading');
const studentView = document.getElementById('studentView');
const organizerView = document.getElementById('organizerView');
const adminSection = document.getElementById('adminSection');

let currentUserDoc = null;
let currentUserId = null;

const CATEGORY_STYLE = {
  academic: { icon: 'chalkboard-user', colorVariant: 'a' },
  social:   { icon: 'masks-theater',   colorVariant: 'b' },
  sports:   { icon: 'futbol',          colorVariant: 'c' },
  food:     { icon: 'utensils',        colorVariant: 'b' }
};

function formatNaira(n) {
  return '₦' + (n || 0).toLocaleString('en-NG');
}

function deriveDateFields(isoDateStr) {
  if (!isoDateStr) return { date: '', dateBadgeMonth: '', dateBadgeDay: '' };
  const d = new Date(isoDateStr + 'T00:00:00');
  const date = d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const dateBadgeMonth = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
  const dateBadgeDay = d.getDate().toString();
  return { date, dateBadgeMonth, dateBadgeDay };
}

// ---- Init: check login + role ----
auth.onAuthStateChanged((user) => {
  if (!user) {
    sessionStorage.setItem('redirectAfterLogin', window.location.href);
    window.location.href = 'login.html';
    return;
  }
  currentUserId = user.uid;

  db.collection('users').doc(user.uid).get().then((doc) => {
    currentUserDoc = doc.exists ? doc.data() : { role: 'student', name: user.email };
    dashLoading.style.display = 'none';
    renderForRole();
  });
});

function renderForRole() {
  const role = currentUserDoc.role || 'student';

  if (role === 'organizer' || role === 'admin') {
    organizerView.style.display = 'block';
    document.getElementById('roleBadgeText').textContent = role.toUpperCase();
    loadMyEvents();
  } else {
    studentView.style.display = 'block';
    loadApplicationStatus();
  }

  if (role === 'admin') {
    adminSection.style.display = 'block';
    loadPendingRequests();
  }
}

// =========================================================
// STUDENT: apply-to-organize
// =========================================================
function loadApplicationStatus() {
  db.collection('organizerRequests')
    .where('userId', '==', currentUserId)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get()
    .then((snap) => {
      if (snap.empty) return; // show apply form (default state)
      const req = snap.docs[0].data();
      if (req.status === 'pending') {
        document.getElementById('applyForm').style.display = 'none';
        document.getElementById('pendingBanner').style.display = 'flex';
      } else if (req.status === 'rejected') {
        document.getElementById('applyForm').style.display = 'none';
        document.getElementById('rejectedBanner').style.display = 'flex';
      }
    });
}

document.getElementById('applySubmit').addEventListener('click', () => {
  const dept = document.getElementById('applyDept').value.trim();
  const reason = document.getElementById('applyReason').value.trim();
  const errEl = document.getElementById('applyError');

  if (dept.length < 2 || reason.length < 5) {
    errEl.textContent = 'Please fill in both fields.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  db.collection('organizerRequests').add({
    userId: currentUserId,
    userName: currentUserDoc.name || '',
    userEmail: currentUserDoc.email || '',
    department: dept,
    justification: reason,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    document.getElementById('applyForm').style.display = 'none';
    document.getElementById('pendingBanner').style.display = 'flex';
  }).catch((err) => {
    errEl.textContent = 'Something went wrong — please try again.';
    errEl.classList.add('show');
  });
});

// =========================================================
// ORGANIZER: my events (create / edit / delete / registrants)
// =========================================================
let editingEventId = null;

function eventRowHTML(id, ev) {
  return `
    <div class="dash-event-row" data-id="${id}">
      <div>
        <div class="ename">${ev.title}</div>
        <div class="emeta">${ev.date || ''} · ${ev.venue || ''} · ${(ev.registeredCount||0)}/${ev.capacity||0} registered</div>
      </div>
      <div class="dash-event-actions">
        <span class="stat-pill">${formatNaira((ev.price||0) * (ev.registeredCount||0))} collected</span>
        <button class="dash-btn" data-action="registrants" data-id="${id}" data-title="${ev.title}">Registrants</button>
        <button class="dash-btn" data-action="edit" data-id="${id}">Edit</button>
        <button class="dash-btn danger" data-action="delete" data-id="${id}">Delete</button>
      </div>
    </div>`;
}

function loadMyEvents() {
  db.collection('events').where('createdBy', '==', currentUserId).orderBy('createdAt', 'desc')
    .onSnapshot((snap) => {
      const listEl = document.getElementById('myEventsList');
      const noneEl = document.getElementById('noEventsYet');
      if (snap.empty) {
        listEl.innerHTML = '';
        noneEl.style.display = 'block';
        return;
      }
      noneEl.style.display = 'none';
      listEl.innerHTML = snap.docs.map(d => eventRowHTML(d.id, d.data())).join('');
      attachEventRowHandlers(snap.docs);
    });
}

function attachEventRowHandlers(docs) {
  document.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.onclick = () => {
      const doc = docs.find(d => d.id === btn.dataset.id);
      openEventModal(doc.id, doc.data());
    };
  });
  document.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.onclick = () => {
      if (confirm('Delete this event? This cannot be undone.')) {
        db.collection('events').doc(btn.dataset.id).delete();
      }
    };
  });
  document.querySelectorAll('[data-action="registrants"]').forEach(btn => {
    btn.onclick = () => openRegistrants(btn.dataset.id, btn.dataset.title);
  });
}

// ---- Create/Edit modal ----
const eventModalOverlay = document.getElementById('eventModalOverlay');
document.getElementById('newEventBtn').addEventListener('click', () => openEventModal(null, null));
document.getElementById('eventFormCancel').addEventListener('click', () => eventModalOverlay.classList.remove('open'));

function openEventModal(id, ev) {
  editingEventId = id;
  document.getElementById('eventModalTitle').textContent = id ? 'Edit Event' : 'Create Event';
  document.getElementById('fTitle').value = ev ? ev.title : '';
  document.getElementById('fCategory').value = ev ? ev.category : 'academic';
  document.getElementById('fDate').value = ev && ev.isoDate ? ev.isoDate : '';
  document.getElementById('fTime').value = ev ? ev.time : '';
  document.getElementById('fVenue').value = ev ? ev.venue : '';
  document.getElementById('fHost').value = ev ? ev.host : (currentUserDoc.name || '');
  document.getElementById('fPrice').value = ev ? ev.price : 0;
  document.getElementById('fCapacity').value = ev ? ev.capacity : 50;
  document.getElementById('fDescription').value = ev ? ev.description : '';
  document.getElementById('fExpect').value = ev && Array.isArray(ev.whatToExpect) ? ev.whatToExpect.join('\n') : '';
  document.getElementById('eventFormError').classList.remove('show');
  eventModalOverlay.classList.add('open');
}

document.getElementById('eventFormSubmit').addEventListener('click', () => {
  const title = document.getElementById('fTitle').value.trim();
  const category = document.getElementById('fCategory').value;
  const isoDate = document.getElementById('fDate').value;
  const time = document.getElementById('fTime').value.trim();
  const venue = document.getElementById('fVenue').value.trim();
  const host = document.getElementById('fHost').value.trim();
  const price = parseInt(document.getElementById('fPrice').value, 10) || 0;
  const capacity = parseInt(document.getElementById('fCapacity').value, 10) || 1;
  const description = document.getElementById('fDescription').value.trim();
  const whatToExpect = document.getElementById('fExpect').value.split('\n').map(s => s.trim()).filter(Boolean);
  const errEl = document.getElementById('eventFormError');

  if (!title || !isoDate || !venue || !time) {
    errEl.textContent = 'Title, date, time, and venue are required.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const { date, dateBadgeMonth, dateBadgeDay } = deriveDateFields(isoDate);
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE.academic;

  const payload = {
    title, category, isoDate, date, dateBadgeMonth, dateBadgeDay, time, venue, host,
    price, capacity, description, whatToExpect,
    icon: style.icon, colorVariant: style.colorVariant
  };

  if (editingEventId) {
    db.collection('events').doc(editingEventId).update(payload).then(() => {
      eventModalOverlay.classList.remove('open');
    });
  } else {
    payload.registeredCount = 0;
    payload.createdBy = currentUserId;
    payload.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    db.collection('events').add(payload).then(() => {
      eventModalOverlay.classList.remove('open');
    });
  }
});

// ---- Registrants modal ----
const registrantsOverlay = document.getElementById('registrantsOverlay');
document.getElementById('registrantsClose').addEventListener('click', () => registrantsOverlay.classList.remove('open'));

function openRegistrants(eventId, title) {
  document.getElementById('registrantsTitle').textContent = 'Registrants — ' + title;
  registrantsOverlay.classList.add('open');

  db.collection('registrations').where('eventId', '==', eventId).get().then((snap) => {
    const listEl = document.getElementById('registrantsList');
    const noneEl = document.getElementById('noRegistrants');
    let total = 0;
    if (snap.empty) {
      listEl.innerHTML = '';
      noneEl.style.display = 'block';
    } else {
      noneEl.style.display = 'none';
      listEl.innerHTML = snap.docs.map(d => {
        const r = d.data();
        total += r.amountPaid || 0;
        return `<div class="registrant-row"><span class="rn">${r.attendeeName || ''} ${r.checkedIn ? '✓' : ''}</span><span class="rc">${r.ticketCode}</span></div>`;
      }).join('');
    }
    document.getElementById('totalCollected').textContent = formatNaira(total) + ' collected';
  });
}

// =========================================================
// ADMIN: approve/reject pending organizer requests
// =========================================================
function requestRowHTML(id, req) {
  return `
    <div class="req-row" data-id="${id}">
      <div class="rname">${req.userName || req.userEmail}</div>
      <div class="rdept">${req.department}</div>
      <div class="rquote">"${req.justification}"</div>
      <div class="req-actions">
        <button class="a" data-action="approve" data-id="${id}" data-user="${req.userId}">Approve</button>
        <button class="r" data-action="reject" data-id="${id}">Reject</button>
      </div>
    </div>`;
}

function loadPendingRequests() {
  db.collection('organizerRequests').where('status', '==', 'pending')
    .onSnapshot((snap) => {
      const listEl = document.getElementById('pendingRequestsList');
      const noneEl = document.getElementById('noPendingRequests');
      if (snap.empty) {
        listEl.innerHTML = '';
        noneEl.style.display = 'block';
        return;
      }
      noneEl.style.display = 'none';
      listEl.innerHTML = snap.docs.map(d => requestRowHTML(d.id, d.data())).join('');

      listEl.querySelectorAll('[data-action="approve"]').forEach(btn => {
        btn.onclick = () => {
          const batch = db.batch();
          batch.update(db.collection('organizerRequests').doc(btn.dataset.id), {
            status: 'approved', reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          batch.update(db.collection('users').doc(btn.dataset.user), { role: 'organizer' });
          batch.commit();
        };
      });
      listEl.querySelectorAll('[data-action="reject"]').forEach(btn => {
        btn.onclick = () => {
          db.collection('organizerRequests').doc(btn.dataset.id).update({
            status: 'rejected', reviewedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        };
      });
    });
}
