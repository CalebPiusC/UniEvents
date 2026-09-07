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
    const seedBtn = document.getElementById('seedBtn');
    if (seedBtn) seedBtn.style.display = 'inline-block';
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
    })
    .catch((err) => {
      console.error(err);
      if (err.code === 'failed-precondition') {
        showToast('Database index still building — check the console link, then refresh in ~1 min.');
      } else {
        showToast('Could not load your application status.');
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
  const published = ev.published !== false;
  return `
    <div class="dash-event-row" data-id="${id}">
      <div>
        <div class="ename">${escapeHtml(ev.title)} ${published ? '' : '<span class="stat-pill">DRAFT</span>'}</div>
        <div class="emeta">${escapeHtml(ev.date || '')} · ${escapeHtml(ev.venue || '')} · ${(ev.registeredCount||0)}/${ev.capacity||0} registered</div>
      </div>
      <div class="dash-event-actions">
        <span class="stat-pill">${formatNaira((ev.price||0) * (ev.registeredCount||0))} collected</span>
        <button class="dash-btn" data-action="copy" data-id="${id}">Copy link</button>
        <button class="dash-btn" data-action="registrants" data-id="${id}" data-title="${escapeHtml(ev.title)}">Registrants</button>
        <button class="dash-btn" data-action="duplicate" data-id="${id}">Duplicate</button>
        <button class="dash-btn" data-action="publish" data-id="${id}">${published ? 'Unpublish' : 'Publish'}</button>
        <button class="dash-btn" data-action="edit" data-id="${id}">Edit</button>
        <button class="dash-btn danger" data-action="delete" data-id="${id}">Delete</button>
      </div>
    </div>`;
}

function loadMyEvents() {
  const role = currentUserDoc.role || 'student';
  const query = role === 'admin'
    ? db.collection('events').orderBy('createdAt', 'desc')
    : db.collection('events').where('createdBy', '==', currentUserId).orderBy('createdAt', 'desc');

  query.onSnapshot((snap) => {
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
    }, (err) => {
      console.error(err);
      if (err.code === 'failed-precondition') {
        showToast('Database index still building — check the console link, then refresh in ~1 min.');
      } else {
        showToast('Could not load your events.');
      }
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
  document.querySelectorAll('[data-action="copy"]').forEach(btn => {
    btn.onclick = () => {
      const url = new URL('event-detail.html?id=' + encodeURIComponent(btn.dataset.id), window.location.href).href;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => showToast('Event link copied.')).catch(() => prompt('Copy this link:', url));
      } else {
        prompt('Copy this link:', url);
      }
    };
  });
  document.querySelectorAll('[data-action="publish"]').forEach(btn => {
    btn.onclick = () => {
      const doc = docs.find(d => d.id === btn.dataset.id);
      if (!doc) return;
      const next = doc.data().published === false;
      db.collection('events').doc(doc.id).update({ published: next }).then(() => {
        showToast(next ? 'Published to Browse Events.' : 'Moved to draft.');
      });
    };
  });
  document.querySelectorAll('[data-action="duplicate"]').forEach(btn => {
    btn.onclick = () => {
      const doc = docs.find(d => d.id === btn.dataset.id);
      if (!doc) return;
      const ev = doc.data();
      db.collection('events').add({
        title: (ev.title || 'Event') + ' (copy)',
        category: ev.category || 'academic',
        isoDate: ev.isoDate || '',
        date: ev.date || '',
        dateBadgeMonth: ev.dateBadgeMonth || '',
        dateBadgeDay: ev.dateBadgeDay || '',
        time: ev.time || '',
        venue: ev.venue || '',
        host: ev.host || '',
        price: ev.price || 0,
        capacity: ev.capacity || 50,
        description: ev.description || '',
        whatToExpect: Array.isArray(ev.whatToExpect) ? ev.whatToExpect : [],
        imageUrl: ev.imageUrl || eventCoverUrl(ev),
        icon: ev.icon || 'calendar-star',
        colorVariant: ev.colorVariant || 'a',
        registeredCount: 0,
        published: false,
        createdBy: currentUserId,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      }).then(() => showToast('Draft copy created.'));
    };
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
  document.getElementById('fImageUrl').value = ev && ev.imageUrl && isSafeHttpUrl(ev.imageUrl) ? ev.imageUrl : '';
  document.getElementById('fPublished').checked = !ev || ev.published !== false;
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
  const imageUrlInput = document.getElementById('fImageUrl').value.trim();
  const published = document.getElementById('fPublished').checked;
  const errEl = document.getElementById('eventFormError');

  if (!title || !isoDate || !venue || !time) {
    errEl.textContent = 'Title, date, time, and venue are required.';
    errEl.classList.add('show');
    return;
  }
  if (imageUrlInput && !isSafeHttpUrl(imageUrlInput)) {
    errEl.textContent = 'Cover image must be a valid http(s) URL, or leave it blank for the sample photo.';
    errEl.classList.add('show');
    return;
  }
  errEl.classList.remove('show');

  const { date, dateBadgeMonth, dateBadgeDay } = deriveDateFields(isoDate);
  const style = CATEGORY_STYLE[category] || CATEGORY_STYLE.academic;
  const imageUrl = imageUrlInput || (CATEGORY_COVERS[category] || CATEGORY_COVERS.academic);

  const payload = {
    title, category, isoDate, date, dateBadgeMonth, dateBadgeDay, time, venue, host,
    price, capacity, description, whatToExpect, imageUrl, published,
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

let csvRows = [];

function openRegistrants(eventId, title) {
  document.getElementById('registrantsTitle').textContent = 'Registrants — ' + title;
  registrantsOverlay.classList.add('open');
  csvRows = [['Name', 'Ticket code', 'Quantity', 'Amount paid', 'Checked in', 'Registered at']];

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
        const when = r.registeredAt && r.registeredAt.toDate ? r.registeredAt.toDate().toISOString() : '';
        csvRows.push([
          r.attendeeName || '',
          r.ticketCode || '',
          r.quantity || 1,
          r.amountPaid || 0,
          r.checkedIn ? 'yes' : 'no',
          when
        ]);
        return `<div class="registrant-row"><span class="rn">${escapeHtml(r.attendeeName || '')} ${r.checkedIn ? '✓' : ''}</span><span class="rc">${escapeHtml(r.ticketCode)}</span></div>`;
      }).join('');
    }
    document.getElementById('totalCollected').textContent = formatNaira(total) + ' collected';
  });

  const waitEl = document.getElementById('waitlistList');
  const noWait = document.getElementById('noWaitlist');
  db.collection('waitlist').where('eventId', '==', eventId).get().then((snap) => {
    if (!waitEl) return;
    if (snap.empty) {
      waitEl.innerHTML = '';
      if (noWait) noWait.style.display = 'block';
      return;
    }
    if (noWait) noWait.style.display = 'none';
    waitEl.innerHTML = snap.docs.map(d => {
      const w = d.data();
      return `<div class="registrant-row"><span class="rn">${escapeHtml(w.userName || w.userEmail || '')}</span><span class="rc">waiting</span></div>`;
    }).join('');
  }).catch((err) => console.error(err));
}

const csvExportBtn = document.getElementById('csvExportBtn');
if (csvExportBtn) {
  csvExportBtn.addEventListener('click', () => {
    if (csvRows.length <= 1) {
      showToast('No registrants to export yet.');
      return;
    }
    const body = csvRows.map(row => row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([body], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'unievents-registrants.csv';
    a.click();
    URL.revokeObjectURL(a.href);
  });
}

const DEMO_EVENTS = [
  {
    seedId: 'demo-careers',
    title: 'Careers & Tech Fair',
    category: 'academic',
    isoDate: '2026-09-18',
    time: '10:00 AM – 4:00 PM',
    venue: 'Oduduwa Hall',
    host: 'OAU Career Services',
    price: 0,
    capacity: 400,
    description: 'Meet recruiters, walk through live demos, and drop your CV with companies hiring OAU students this session.',
    whatToExpect: ['40+ exhibitors', 'CV clinic', 'Panel on internships'],
    imageUrl: 'images/academic.jpg'
  },
  {
    seedId: 'demo-football',
    title: 'Inter-Faculty Football Final',
    category: 'sports',
    isoDate: '2026-09-20',
    time: '4:00 PM',
    venue: 'Sports Complex',
    host: 'OAU Sports Council',
    price: 500,
    capacity: 800,
    description: 'The two remaining faculties meet under the lights. Bring your scarf — gates open at 3.',
    whatToExpect: ['Student bands', 'Halftime challenge', 'QR check-in at the gate'],
    imageUrl: 'images/sports.jpg'
  },
  {
    seedId: 'demo-seminar',
    title: 'SEN Research Seminar',
    category: 'academic',
    isoDate: '2026-09-16',
    time: '2:00 – 4:00 PM',
    venue: 'Computer Building LT',
    host: 'Department of Computer Science & Engineering',
    price: 0,
    capacity: 80,
    description: 'Final-year students present ongoing work. Open to the faculty — no registration wall to browse, ticket at the door.',
    whatToExpect: ['Lightning talks', 'Poster session', 'Tea after'],
    imageUrl: 'images/academic.jpg'
  }
];

const seedBtn = document.getElementById('seedBtn');
if (seedBtn) {
  seedBtn.addEventListener('click', () => {
    seedBtn.disabled = true;
    db.collection('events').where('seedId', 'in', DEMO_EVENTS.map(e => e.seedId)).get()
      .then((snap) => {
        const have = {};
        snap.docs.forEach(d => { have[d.data().seedId] = true; });
        const missing = DEMO_EVENTS.filter(e => !have[e.seedId]);
        if (missing.length === 0) {
          showToast('Demo events are already loaded.');
          return;
        }
        const batch = db.batch();
        missing.forEach((ev) => {
          const { date, dateBadgeMonth, dateBadgeDay } = deriveDateFields(ev.isoDate);
          const style = CATEGORY_STYLE[ev.category] || CATEGORY_STYLE.academic;
          const ref = db.collection('events').doc();
          batch.set(ref, {
            ...ev,
            date, dateBadgeMonth, dateBadgeDay,
            icon: style.icon,
            colorVariant: style.colorVariant,
            registeredCount: 0,
            published: true,
            createdBy: currentUserId,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
        });
        return batch.commit().then(() => showToast('Added ' + missing.length + ' demo event(s).'));
      })
      .catch((err) => {
        console.error(err);
        showToast('Could not load demo events — check the console.');
      })
      .finally(() => { seedBtn.disabled = false; });
  });
}

// =========================================================
// ADMIN: approve/reject pending organizer requests
// =========================================================
function requestRowHTML(id, req) {
  return `
    <div class="req-row" data-id="${id}">
      <div class="rname">${escapeHtml(req.userName || req.userEmail)}</div>
      <div class="rdept">${escapeHtml(req.department)}</div>
      <div class="rquote">"${escapeHtml(req.justification)}"</div>
      <div class="req-actions">
        <button class="dash-btn solid" data-action="approve" data-id="${id}" data-user="${req.userId}">Approve</button>
        <button class="dash-btn danger" data-action="reject" data-id="${id}">Reject</button>
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
    }, (err) => {
      console.error(err);
      showToast('Could not load pending requests.');
    });
}
