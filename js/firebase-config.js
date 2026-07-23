const firebaseConfig = {
  apiKey: "AIzaSyByn1NnM0mO1foZ3DkrEiuYfJPs2gEjA2Q",
  authDomain: "rm-conecta.firebaseapp.com",
  projectId: "rm-conecta",
  storageBucket: "rm-conecta.firebasestorage.app",
  messagingSenderId: "74647549846",
  appId: "1:74647549846:web:f187259814c7fcd6010fb7",
  measurementId: "G-SEJ992JX07"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
