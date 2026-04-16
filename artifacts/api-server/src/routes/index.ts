import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import challengesRouter from "./challenges";
import chatRouter from "./chat";
import notificationsRouter from "./notifications";
import leaderboardRouter from "./leaderboard";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/users", usersRouter);
router.use("/challenges", challengesRouter);
router.use("/challenges", chatRouter);
router.use("/notifications", notificationsRouter);
router.use("/leaderboard", leaderboardRouter);
router.use("/", statsRouter);

export default router;
