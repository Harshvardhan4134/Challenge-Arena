import { collections, type ChallengeDoc } from "./firestore-db";
import { logger } from "./logger";
import { getChallengeLeaderUserIds, notifyUser } from "./notify-user";

const REMINDER_LEAD_MS = 15 * 60 * 1000;
const TICK_MS = 60_000;

export function startMatchReminderScheduler(): void {
  const tick = async () => {
    try {
      const now = Date.now();
      const snap = await collections.challenges.get();
      for (const doc of snap.docs) {
        const c = doc.data() as ChallengeDoc;
        if (!["open", "full", "in_progress"].includes(c.status)) continue;
        if (c.matchReminder15mSent) continue;
        if (!c.teamBId) continue;
        const t = new Date(c.scheduledAt).getTime();
        if (Number.isNaN(t)) continue;
        const msUntil = t - now;
        if (msUntil <= 0 || msUntil > REMINDER_LEAD_MS) continue;

        const leaders = await getChallengeLeaderUserIds(c);
        const when = new Date(c.scheduledAt).toLocaleString();
        for (const uid of leaders) {
          await notifyUser(uid, {
            type: "match_reminder",
            title: "Match starting soon",
            message: `"${c.title}" begins around ${when}. Open the app for room details.`,
            challengeId: c.id,
          });
        }
        await collections.challenges.doc(c.id).set({ matchReminder15mSent: true }, { merge: true });
      }
    } catch (err) {
      logger.warn({ err }, "match reminder tick failed");
    }
  };

  setInterval(() => {
    void tick();
  }, TICK_MS);
  void tick();
}
