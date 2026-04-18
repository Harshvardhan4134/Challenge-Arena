import crypto from "crypto";
import { getStorage } from "firebase-admin/storage";
import { getFirebaseStorageBucketName } from "./firebase-admin";

function extensionForContentType(contentType: string): string {
  const ct = contentType.toLowerCase();
  if (ct.includes("png")) return "png";
  if (ct.includes("webp")) return "webp";
  if (ct.includes("gif")) return "gif";
  if (ct.includes("jpeg") || ct.includes("jpg")) return "jpg";
  return "jpg";
}

/**
 * Uploads proof bytes to Firebase Storage and returns a stable download URL (download token metadata).
 */
export async function uploadMatchResultProofImage(params: {
  challengeId: string;
  buffer: Buffer;
  contentType: string;
}): Promise<string> {
  const bucketName = getFirebaseStorageBucketName();
  if (!bucketName) {
    throw new Error("Firebase Storage bucket not configured (set FIREBASE_STORAGE_BUCKET or Firebase project env).");
  }

  const storage = getStorage();
  const bucket = storage.bucket(bucketName);
  const ext = extensionForContentType(params.contentType);
  const objectPath = `match-results/${params.challengeId}/${crypto.randomUUID()}.${ext}`;
  const downloadToken = crypto.randomUUID();
  const file = bucket.file(objectPath);

  try {
    await file.save(params.buffer, {
      resumable: false,
      metadata: {
        contentType: params.contentType,
        metadata: {
          firebaseStorageDownloadTokens: downloadToken,
        },
      },
    });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Upload to bucket "${bucketName}" failed: ${detail}. In Render, set FIREBASE_STORAGE_BUCKET to the exact ` +
        `bucket id from Firebase Console → Storage (often project-id.appspot.com or project-id.firebasestorage.app). ` +
        `Ensure the service account has Storage Admin and the Storage API is enabled.`,
    );
  }

  const encodedPath = encodeURIComponent(objectPath);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${downloadToken}`;
}
