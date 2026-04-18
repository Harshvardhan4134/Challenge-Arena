import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

export function getServiceAccountConfig(): ServiceAccount | null {
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

/**
 * GCS bucket for Firebase Storage (e.g. `my-project.firebasestorage.app`).
 * Set `FIREBASE_STORAGE_BUCKET` if it differs from `{projectId}.firebasestorage.app`.
 */
export function getFirebaseStorageBucketName(): string | null {
  const explicit = process.env["FIREBASE_STORAGE_BUCKET"]?.trim();
  if (explicit) return explicit;
  const pid =
    getServiceAccountConfig()?.projectId ??
    process.env["FIREBASE_PROJECT_ID"]?.trim() ??
    process.env["GCLOUD_PROJECT"]?.trim();
  if (pid) return `${pid}.firebasestorage.app`;
  return null;
}
