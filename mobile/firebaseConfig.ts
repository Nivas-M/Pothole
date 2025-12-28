import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, initializeFirestore } from "firebase/firestore";
// import { getAuth } from "firebase/auth"; // Auth needed later

// Using the same config as web, but react-native might need specific AsyncStorage
// For MVP, standard web SDK often works in Expo for basic Firestore if not using persistence

const firebaseConfig = {
    apiKey: "AIzaSyA61kCNtm5RdxzIH7zMcWRwJMoXIXJ9UpY",
    authDomain: "pothole-b3b8b.firebaseapp.com",
    projectId: "pothole-b3b8b",
    storageBucket: "pothole-b3b8b.firebasestorage.app",
    messagingSenderId: "947099971974",
    appId: "1:947099971974:web:3bca095c29e79574267c07",
    measurementId: "G-FCC9L82391"
};

let app;
let db;

if (!getApps().length) {
    app = initializeApp(firebaseConfig);
    // Optional: settings for specific react-native behavior could go here
    db = getFirestore(app);
} else {
    app = getApp();
    db = getFirestore(app);
}

export { app, db };
