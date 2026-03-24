// firebase-auth-google-email-only.js
// Keeps auth limited to Google + Email/Password.
// Remove Apple sign-in code from your site before using this.

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

// Replace this with your live Firebase config
const firebaseConfig = {
  apiKey: "REPLACE_ME",
  authDomain: "REPLACE_ME",
  projectId: "REPLACE_ME",
  storageBucket: "REPLACE_ME",
  messagingSenderId: "REPLACE_ME",
  appId: "REPLACE_ME"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
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

export function listenForAuthChanges(callback) {
  return onAuthStateChanged(auth, callback);
}

export function showAuthError(error) {
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
