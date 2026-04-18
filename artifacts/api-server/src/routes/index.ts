import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import challengesRouter from "./challenges";
import chatRouter from "./chat";
import notificationsRouter from "./notifications";
import leaderboardRouter from "./leaderboard";
import statsRouter from "./stats";
import freefireRouter from "./freefire";
import adminRouter from "./admin";
import matchResultProofsRouter from "./match-result-proofs";

const router: IRouter = Router();

router.use(healthRouter);
router.use(matchResultProofsRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/challenges", challengesRouter);
router.use("/challenges", chatRouter);
router.use("/notifications", notificationsRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/freefire", freefireRouter);
router.use("/", statsRouter);
router.use("/admin", adminRouter);

export default router;
