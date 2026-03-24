import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCrAeW_WvzENswPLKcOn6_7Zrk0OjNvrmA",
  authDomain: "nichelab-5427c.firebaseapp.com",
  projectId: "nichelab-5427c",
  storageBucket: "nichelab-5427c.firebasestorage.app",
  messagingSenderId: "892086112182",
  appId: "1:892086112182:web:9bd8d175cd8e512c63fb17"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
auth.onAuthStateChanged = onAuthStateChanged.bind(null, auth);
const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    await signInWithPopup(auth, googleProvider);
  } catch (error) {
    showAuthError(error);
  }
}

export async function signInWithEmail(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showAuthError(error);
  }
}

export async function createAccount(email, password) {
  try {
    await createUserWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showAuthError(error);
  }
}

export async function signOutUser() {
  try {
    await signOut(auth);
  } catch (error) {
    showAuthError(error);
  }
}

function showAuthError(error) {
  const map = {
    "auth/invalid-credential": "Sign-in failed. Try Google sign-in or check your email and password.",
    "auth/user-not-found": "No account was found for that email.",
    "auth/wrong-password": "The password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/email-already-in-use": "An account already exists with that email.",
    "auth/weak-password": "Choose a stronger password."
  };

  const message = map[error.code] || "Authentication failed. Please try again.";
  const box = document.getElementById("auth-error");
  if (box) box.textContent = message;
  else alert(message);
}
