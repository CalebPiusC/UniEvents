# UniEvents

Campus events for Obafemi Awolowo University — browse, register, QR check-in, and an organizer dashboard. SEN106 / SEN216 Group 5.

Static HTML/CSS/JS on **Firebase Auth + Firestore**, with **Paystack** for paid tickets.

## Run locally

Do not open the HTML files as `file://`. Serve the folder:

```bash
npx --yes serve .
# or: python3 -m http.server 8080
```

Then open the URL it prints (usually `http://localhost:3000` or `http://localhost:8080`).

---

## What you still have to do in the consoles

The app code is in this repo. These steps need **your** Firebase / Paystack accounts.

### 1. Firebase project (if it is not already live)

1. Open [Firebase Console](https://console.firebase.google.com) → project **unievents-c7c44** (or create one and paste the new config into `firebase-config.js`).
2. **Authentication** → Sign-in method → enable **Email/Password**.
3. **Firestore Database** → Create database if you have not. Start in **test mode** only while you first try the app, then deploy the rules below before a real demo.

### 2. Deploy security rules and indexes

From this folder, with [Firebase CLI](https://firebase.google.com/docs/cli) logged in:

```bash
npm install -g firebase-tools
firebase login
firebase use unievents-c7c44
firebase deploy --only firestore:rules,firestore:indexes
```

Or in the console: Firestore → **Rules** → paste `firestore.rules`, publish; **Indexes** → the CLI deploy is easier. If a query fails, the browser console will also show a link to auto-create the missing index.

### 3. Make the first admin

Nobody can approve organizers until one user is an admin.

1. Sign up on the site as yourself.
2. Firebase Console → **Firestore** → `users` → open the document whose ID is your Auth UID.
3. Set the `role` field from `student` to `admin`.
4. Refresh `dashboard.html`. You should see **Pending organizer requests** and event tools.

After that, students apply on the dashboard; you approve them in the same page; they become `organizer`.

### 4. Paystack (paid events)

A **test** public key is already in `detail.js`. Free tickets work without Paystack; paid checkout should open the Paystack test iframe.

Use [Paystack test cards](https://paystack.com/docs/payments/test-payments/). There is **no server-side payment verification** — the client writes the registration after the browser callback. Fine for coursework; not for real money.

To switch accounts later, replace `PAYSTACK_PUBLIC_KEY` in `detail.js`.

### 5. Host it (public demo URL)

```bash
firebase deploy --only hosting
```

You’ll get something like `https://unievents-c7c44.web.app`. Also add that domain under Authentication → Settings → Authorized domains.

### 6. Storage (cover photo uploads)

Console → **Build → Storage → Get started**, then:

```bash
firebase deploy --only storage
```

Without this, organizers can still paste an image URL.

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage,hosting
```

deploys everything in one go.

### 7. Contact inbox

`contact.js` uses `unievents.group5@gmail.com`. Change `CONTACT_TO` to a real group address if you want replies.

---

## Extra features

- **Saved events** — heart on event detail; **Saved** chip on Browse
- **Upcoming / Past** filters
- **Category sample photos** (academic / social / sports / food) — no paid Storage. Optional URL override.
- **Draft vs published**, **Duplicate event**, **Load demo events** (admin)
- **Waitlist** when an event is full
- **Download registrants CSV**
- **Reviews** (1–5 stars) on event detail
- **Forgot password** on the login page
- **Print ticket**, **Add to calendar**, **Cancel registration** (if not checked in)
- **Manual ticket code** on the scanner if the camera fails
- Admins see **all events** and can copy an event link

Redeploy rules after pulling this version:

```bash
firebase deploy --only firestore:rules
```

## Demo path (once 1–3 are done)

1. Sign up as a student → Browse → register for a **free** event → My Tickets → QR.
2. Dashboard → apply to organize.
3. Log in as the **admin** → approve the request.
4. Log in as the **admin** → **Load demo events** (or create your own) → approve organizer requests.
5. Organizer → **+ New Event**, or **Duplicate**.
6. Dashboard → **Scan Tickets** → scan the QR.
7. Full event → student taps **Join waitlist**. Registrants modal has **Download CSV**.

## Collections

| Collection | Purpose |
|---|---|
| `users` | `name`, `email`, `role` (`student` / `organizer` / `admin`) |
| `events` | Listings created by organizers |
| `registrations` | Tickets (`ticketCode`, `checkedIn`) |
| `organizerRequests` | Apply-to-organize queue |
| `waitlist` | Students waiting on a full event |
