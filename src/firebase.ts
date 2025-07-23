import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDwEDRXZPXFFIqYOr7SZupSi1cYHJF67fk",
  authDomain: "hackmatch-cefb3.firebaseapp.com",
  projectId: "hackmatch-cefb3",
  storageBucket: "hackmatch-cefb3.firebasestorage.app",
  messagingSenderId: "860084672077",
  appId: "1:860084672077:web:5072c0a80615cd89796e04",
  measurementId: "G-HJ9JDVDL1Q"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app); 