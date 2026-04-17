export type GoogleAuthPayload = {
  idToken: string;
  username?: string;
  freefireUid?: string;
  ign?: string;
  gender?: "male" | "female" | "other";
};

export type GoogleAuthResponse = {
  token?: string;
  user?: unknown;
  needsProfileCompletion?: boolean;
  suggested?: {
    username?: string;
    email?: string;
  };
  message?: string;
};

export async function exchangeGoogleToken(payload: GoogleAuthPayload): Promise<{
  status: number;
  body: GoogleAuthResponse;
}> {
  const res = await fetch("/api/auth/google", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = (await res.json()) as GoogleAuthResponse;
  return { status: res.status, body };
}
