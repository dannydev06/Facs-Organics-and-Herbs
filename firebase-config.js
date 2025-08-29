// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBSLFpC0E8BFVVNTBVNFYnK5CgV6cs-buc",
  authDomain: "facs-organics-6e5d2.firebaseapp.com",
  projectId: "facs-organics-6e5d2",
  storageBucket: "facs-organics-6e5d2.firebasestorage.app",
  messagingSenderId: "340303024016",
  appId: "1:340303024016:web:f8d90ff7d50f396e57ed15",
  measurementId: "G-2KC9QGXYQH"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();