import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAayncyO_nqUAEJhsj2ndTokbCzAG6W3bg",
  authDomain: "pasti-d4b7e.firebaseapp.com",
  projectId: "pasti-d4b7e",
  storageBucket: "pasti-d4b7e.firebasestorage.app",
  messagingSenderId: "508238162359",
  appId: "1:508238162359:web:4f146ab6858ccde8746032"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);