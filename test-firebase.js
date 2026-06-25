const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: "dummy",
    authDomain: "dummy",
    projectId: "medicarex-app-9c162",
    storageBucket: "dummy",
    messagingSenderId: "dummy",
    appId: "dummy"
};

// I need the actual firebase config. Let me read it from the file first.
