import { Router } from "express";
import { collections, type MatchResultProofDoc } from "../lib/firestore-db";

const router = Router();

function proofIdFromReq(req: { params: Record<string, string | string[] | undefined> }): string | undefined {
  const raw = req.params["proofId"];
  if (typeof raw === "string") return raw;
  if (Array.isArray(raw) && typeof raw[0] === "string") return raw[0];
  return undefined;
}

/** Public read: proof id is unguessable UUID. Used as screenshotUrl in match results. */
router.get("/match-result-proofs/:proofId", async (req, res) => {
  const proofId = proofIdFromReq(req);
  if (!proofId) return res.status(400).send("Missing proof id");

  const snap = await collections.matchResultProofs.doc(proofId).get();
  if (!snap.exists) return res.status(404).send("Not found");

  const data = snap.data() as MatchResultProofDoc;
  let buffer: Buffer;
  try {
    buffer = Buffer.from(data.imageBase64, "base64");
  } catch {
    return res.status(500).send("Invalid proof data");
  }

  res.setHeader("Content-Type", data.contentType || "image/jpeg");
  res.setHeader("Cache-Control", "private, max-age=86400");
  res.send(buffer);
});

export default router;
