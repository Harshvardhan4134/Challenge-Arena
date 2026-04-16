import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetMe, useGetStatsOverview, useListChallenges, useListNotifications } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Swords, Search, Plus, Bell, ChevronRight, Trophy, Shield } from "lucide-react";

export default function Home() {
  const [, navigate] = useLocation();
  const me = useGetMe({ query: { queryKey: ["getMe"] } });
  const stats = useGetStatsOverview({ query: { queryKey: ["getStatsOverview"] } });
  const challenges = useListChallenges({ query: { queryKey: ["listChallenges"] } });
  const notifications = useListNotifications({ query: { queryKey: ["listNotifications"] } });

  const user = me.data;
  const unreadNotifs = notifications.data?.filter(n => !n.isRead) ?? [];

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
  const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

  return (
    <Layout>
      <motion.div initial="hidden" animate="show" variants={stagger} className="py-4 space-y-5">
        {/* Greeting */}
        <motion.div variants={fadeUp}>
          <div className="text-xs font-mono text-muted-foreground">WELCOME BACK</div>
          <h1 className="text-2xl font-black mt-0.5">
            {user?.ign || user?.username || "Player"}
          </h1>
          {user?.freefireUid && (
            <div className="text-xs text-muted-foreground font-mono mt-0.5">UID: {user.freefireUid}</div>
          )}
        </motion.div>

        {/* Primary actions */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/challenges/create")}
            className="group flex flex-col items-start p-4 rounded-lg border border-primary/40 bg-primary/10 hover:bg-primary/15 hover:border-primary/60 transition-all glow-cyan"
          >
            <Plus className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-sm">Create Challenge</div>
            <div className="text-xs text-muted-foreground mt-0.5">Set rules & invite</div>
          </button>
          <button
            onClick={() => navigate("/challenges")}
            className="group flex flex-col items-start p-4 rounded-lg border border-border bg-card hover:border-border/80 hover:bg-card/80 transition-all"
          >
            <Search className="w-6 h-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
            <div className="font-bold text-sm">Join Match</div>
            <div className="text-xs text-muted-foreground mt-0.5">Browse open challenges</div>
          </button>
        </motion.div>

        {/* Platform stats */}
        {stats.data && (
          <motion.div variants={fadeUp} className="grid grid-cols-3 gap-2">
            {[
              { label: "Active", value: stats.data.activeChallenges },
              { label: "Players", value: stats.data.totalPlayers },
              { label: "Today", value: stats.data.matchesToday },
            ].map(({ label, value }) => (
              <div key={label} className="border border-border rounded-lg bg-card p-3 text-center">
                <div className="text-xl font-black text-primary font-mono">{value}</div>
                <div className="text-[10px] text-muted-foreground font-mono uppercase mt-0.5">{label}</div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Notifications preview */}
        {unreadNotifs.length > 0 && (
          <motion.div variants={fadeUp}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                <Bell className="w-3.5 h-3.5" />
                NOTIFICATIONS
              </div>
              <button onClick={() => navigate("/notifications")} className="text-xs text-primary">View all</button>
            </div>
            <div className="space-y-2">
              {unreadNotifs.slice(0, 3).map(n => (
                <div
                  key={n.id}
                  onClick={() => navigate("/notifications")}
                  className="flex items-start gap-3 p-3 rounded border border-primary/20 bg-primary/5 cursor-pointer hover:bg-primary/8 transition-colors"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm font-semibold">{n.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recent challenges */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-mono text-muted-foreground">RECENT MATCHES</div>
            <button onClick={() => navigate("/challenges")} className="text-xs text-primary flex items-center gap-0.5">
              See all <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {challenges.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 rounded border border-border bg-card animate-pulse" />)}
            </div>
          ) : challenges.data?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm border border-border rounded-lg bg-card">
              <Swords className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No active challenges yet. Create the first one!
            </div>
          ) : (
            <div className="space-y-2">
              {challenges.data?.slice(0, 3).map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/challenges/${c.id}`)}
                  className="w-full flex items-center gap-3 p-3 rounded border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all text-left"
                >
                  <div className="flex-1">
                    <div className="font-semibold text-sm">{c.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2">
                      <span className="font-mono text-primary">{c.mode}</span>
                      <span>·</span>
                      <span>{c.teamA?.players.length ?? 0}/{c.teamA?.maxSize ?? 1} players</span>
                    </div>
                  </div>
                  <div className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    c.status === "open" ? "border-green-500/40 text-green-400 bg-green-500/10" :
                    c.status === "full" ? "border-accent/40 text-accent bg-accent/10" :
                    "border-border text-muted-foreground"
                  }`}>
                    {c.status.toUpperCase()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* Quick links */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/leaderboard")}
            className="flex items-center gap-2 p-3 rounded border border-border bg-card hover:border-primary/30 transition-colors text-sm"
          >
            <Trophy className="w-4 h-4 text-accent" />
            <span className="font-medium">Leaderboard</span>
          </button>
          <button
            onClick={() => navigate("/profile/me")}
            className="flex items-center gap-2 p-3 rounded border border-border bg-card hover:border-primary/30 transition-colors text-sm"
          >
            <Shield className="w-4 h-4 text-primary" />
            <span className="font-medium">My Stats</span>
          </button>
        </motion.div>
      </motion.div>
    </Layout>
  );
}
