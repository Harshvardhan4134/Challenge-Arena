import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

function getServiceAccountConfig(): ServiceAccount | null {
  const projectId = process.env["FIREBASE_PROJECT_ID"];
  const clientEmail = process.env["FIREBASE_CLIENT_EMAIL"];
  const privateKeyRaw = process.env["FIREBASE_PRIVATE_KEY"];

  if (!projectId || !clientEmail || !privateKeyRaw) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: privateKeyRaw.replace(/\\n/g, "\n"),
  };
}

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccount = getServiceAccountConfig();

  if (serviceAccount) {
    initializeApp({ credential: cert(serviceAccount) });
    return;
  }

  initializeApp();
}

initFirebaseAdmin();

export const firebaseAdminAuth = getAuth();
