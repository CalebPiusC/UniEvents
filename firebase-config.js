/* =========================================================
   Firebase configuration — shared across every page.

   Replace the values below with YOUR OWN Firebase project config.
   Get it free at https://console.firebase.google.com:
   Create a project -> Project settings -> General -> "Your apps"
   -> Add app (</> Web) -> copy the firebaseConfig object shown.

   Also make sure, in the Firebase console, you've enabled:
   - Build -> Authentication -> Sign-in method -> Email/Password
   - Build -> Firestore Database -> Create database

   Then deploy firestore.rules and firestore.indexes.json from this
   repo (see README.md). Do not leave the database in open test mode
   for a public demo.
   ========================================================= */

const firebaseConfig = {
  apiKey: "AIzaSyCSYK5kgaVsZTEPSi4j3P_7Lr-BXCpvRoc",
  authDomain: "unievents-c7c44.firebaseapp.com",
  projectId: "unievents-c7c44",
  storageBucket: "unievents-c7c44.firebasestorage.app",
  messagingSenderId: "427407468281",
  appId: "1:427407468281:web:743466658d2d7ed5fea428",
  measurementId: "G-6Z55BHBRF3"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
