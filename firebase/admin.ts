import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getDatabase } from "firebase-admin/database";

function initFirebaseAdmin() {
  const apps = getApps();

  if (!apps.length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace newlines in the private key
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\n/g, "\n"),
      }),
      // Add Realtime Database URL for admin
      databaseURL: process.env.FIREBASE_DATABASE_URL,
    });
  }

  return {
    auth: getAuth(),
    db: getFirestore(),
    rtdb: getDatabase(), // Realtime Database admin
  };
}

export const { auth, db, rtdb } = initFirebaseAdmin();
