import { initializeApp } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { isSupported, getAnalytics, type Analytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Opt-in local emulator mode — lets you develop end-to-end (Auth,
// Firestore, Functions, Storage) without touching the real "chaquil"
// project or needing the Blaze plan. Enable with
// VITE_USE_FIREBASE_EMULATORS=true in web/.env.local, then run
// `firebase emulators:start` alongside `npm run dev`.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  const host = import.meta.env.VITE_FIREBASE_EMULATOR_HOST || "127.0.0.1";
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
  connectFirestoreEmulator(db, host, 8080);
  connectFunctionsEmulator(functions, host, 5001);
  connectStorageEmulator(storage, host, 9199);
  // eslint-disable-next-line no-console
  console.info(`[firebase] using local emulators at ${host}`);
}

// Analytics needs a browser environment with IndexedDB/cookies available
// (fails inside some webviews and during SSR), so it's opt-in via isSupported().
export let analytics: Analytics | null = null;
if (firebaseConfig.measurementId) {
  isSupported().then((supported) => {
    if (supported) analytics = getAnalytics(app);
  });
}
