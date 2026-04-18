import { initializeApp, getApps, getApp, cert, type ServiceAccount } from "firebase-admin/app";
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

function inferredDefaultBucket(projectId: string): string {
  if (process.env["FIREBASE_STORAGE_BUCKET_DOMAIN"] === "firebasestorage.app") {
    return `${projectId}.firebasestorage.app`;
  }
  return `${projectId}.appspot.com`;
}

function initFirebaseAdmin() {
  if (getApps().length > 0) {
    return;
  }

  const serviceAccount = getServiceAccountConfig();

  if (serviceAccount) {
    const explicit = process.env["FIREBASE_STORAGE_BUCKET"]?.trim();
    const storageBucket = explicit ?? inferredDefaultBucket(serviceAccount.projectId);
    initializeApp({ credential: cert(serviceAccount), storageBucket });
    return;
  }

  initializeApp();
}

initFirebaseAdmin();

export const firebaseAdminAuth = getAuth();

/**
 * Default Storage bucket for match proof uploads.
 * - Set `FIREBASE_STORAGE_BUCKET` to the exact bucket name from Firebase Console → Storage (recommended on Render).
 * - Legacy projects usually use `{projectId}.appspot.com` (default here).
 * - Newer projects may use `{projectId}.firebasestorage.app` — set env `FIREBASE_STORAGE_BUCKET_DOMAIN=firebasestorage.app`
 *   or set `FIREBASE_STORAGE_BUCKET` explicitly.
 */
export function getFirebaseStorageBucketName(): string | null {
  const explicit = process.env["FIREBASE_STORAGE_BUCKET"]?.trim();
  if (explicit) return explicit;

  const fromEnv =
    getServiceAccountConfig()?.projectId ??
    process.env["FIREBASE_PROJECT_ID"]?.trim() ??
    process.env["GCLOUD_PROJECT"]?.trim();

  let projectId = typeof fromEnv === "string" ? fromEnv.trim() : "";
  if (!projectId && getApps().length > 0) {
    const optId = getApp().options.projectId;
    projectId = typeof optId === "string" ? optId.trim() : "";
  }

  if (!projectId) return null;
  return inferredDefaultBucket(projectId);
}
