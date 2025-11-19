import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

// --- IMPORTANT ---
// 1. Create a Firebase project at https://console.firebase.google.com/
// 2. Go to Project Settings > General, and register a web app.
// 3. Copy the firebaseConfig object here.
// 4. Go to Realtime Database, create a database, and in the Rules tab, set:
//    {
//      "rules": {
//        ".read": "true",
//        ".write": "true"
//      }
//    }
//    This is for demo purposes. For production, secure your database.

const firebaseConfig = {
  apiKey: "AIzaSyCStEkhYwk5atgoqzbKjQeYSghiMP-g7aA",
  authDomain: "ktunez-6dc1d.firebaseapp.com",
  projectId: "ktunez-6dc1d",
  storageBucket: "ktunez-6dc1d.firebasestorage.app",
  messagingSenderId: "896726058552",
  appId: "1:896726058552:web:345aaa63c597582f19c8cd",
  measurementId: "G-8YFEDFPNMJ"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get a reference to the Realtime Database service
export const db = getDatabase(app);

