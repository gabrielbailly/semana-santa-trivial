import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyB3HryH0Mg996QV0HUdaxYox4ah5xDnYJM",
  authDomain: "semana-santa-f9967.firebaseapp.com",
  projectId: "semana-santa-f9967",
  storageBucket: "semana-santa-f9967.firebasestorage.app",
  messagingSenderId: "85757700422",
  appId: "1:85757700422:web:7b762e3a9ac9be34c3dd47"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
