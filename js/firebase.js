// Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// 🔹 Your Firebase configuration (UNCHANGED)
const firebaseConfig = {
  apiKey: "AIzaSyCb-Bxt2Vdb3HRd0p2Vd7H7Fy_xL56kqCw",
  authDomain: "voting-complaint.firebaseapp.com",
  projectId: "voting-complaint",
  storageBucket: "voting-complaint.firebasestorage.app",
  messagingSenderId: "824652570144",
  appId: "1:824652570144:web:e569d51379614caa9fe645"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore DB
export const db = getFirestore(app);
export const storage = getStorage(app);
