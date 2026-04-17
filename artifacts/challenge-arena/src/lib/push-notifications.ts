import { apiUrl } from "@/lib/api-url";
import { getAuthToken } from "@/lib/auth";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/**
 * Registers service worker, requests permission, sends subscription to API.
 * Safe to call multiple times; uses sessionStorage to avoid nagging every navigation.
 */
export async function registerWebPushForUser(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (!("PushManager" in window)) return;
  if (sessionStorage.getItem("ca_push_attempted") === "1") return;

  const token = getAuthToken();
  if (!token) return;

  try {
    const reg = await navigator.serviceWorker.register(new URL("sw.js", window.location.origin).href, {
      scope: "/",
    });

    const keyRes = await fetch(apiUrl("/api/notifications/push/vapid-public-key"));
    if (!keyRes.ok) return;
    const body = (await keyRes.json().catch(() => ({}))) as {
      publicKey?: string | null;
      configured?: boolean;
    };
    if (body.configured === false || !body.publicKey?.trim()) return;
    const publicKey = body.publicKey.trim();

    const perm = await Notification.requestPermission();
    sessionStorage.setItem("ca_push_attempted", "1");
    if (perm !== "granted") return;

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
    });

    const json = sub.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

    await fetch(apiUrl("/api/notifications/push/subscribe"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ subscription: json }),
    });
  } catch {
    sessionStorage.setItem("ca_push_attempted", "1");
  }
}
