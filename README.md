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

### 4. Paystack (paid events only)

Free tickets work without this. Paid checkout will not open until you add a key.

1. Create an account at [Paystack](https://dashboard.paystack.com).
2. Settings → API Keys & Webhooks → copy the **Test Public Key** (`pk_test_...`).
3. Paste it in `detail.js`:

```js
const PAYSTACK_PUBLIC_KEY = 'pk_test_YOUR_REAL_KEY';
```

Use test mode and Paystack’s test cards for the demo. There is **no server-side payment verification** in this project — the client writes the registration after Paystack’s browser callback. Fine for coursework; not for real money.

### 5. Optional: host it

```bash
firebase deploy --only hosting
```

`firebase.json` already points hosting at this folder.

### 6. Contact inbox

`contact.js` uses `unievents.group5@gmail.com`. Change `CONTACT_TO` to a real group address if you want replies.

---

## Demo path (once 1–3 are done)

1. Sign up as a student → Browse → register for a **free** event → My Tickets → QR.
2. Dashboard → apply to organize.
3. Log in as the **admin** → approve the request.
4. Log back in as the organizer → **+ New Event**.
5. Dashboard → **Scan Tickets** → scan the QR.

## Collections

| Collection | Purpose |
|---|---|
| `users` | `name`, `email`, `role` (`student` / `organizer` / `admin`) |
| `events` | Listings created by organizers |
| `registrations` | Tickets (`ticketCode`, `checkedIn`) |
| `organizerRequests` | Apply-to-organize queue |
