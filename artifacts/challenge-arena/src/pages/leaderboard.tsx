import { motion } from "framer-motion";
import { useGetWeeklyLeaderboard } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Trophy, Flame, Zap } from "lucide-react";

export default function Leaderboard() {
  const leaderboard = useGetWeeklyLeaderboard({ query: { queryKey: ["getWeeklyLeaderboard"] } });

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } };

  return (
    <Layout>
      <div className="py-4 space-y-4">
        <div>
          <h1 className="text-xl font-black flex items-center gap-2">
            <Trophy className="w-5 h-5 text-accent" />
            Weekly Leaderboard
          </h1>
          <div className="text-xs font-mono text-muted-foreground mt-0.5">RESETS EVERY WEEK</div>
        </div>

        {leaderboard.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 rounded-lg border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : leaderboard.data?.length === 0 ? (
          <div className="text-center py-12 border border-border rounded-lg bg-card text-muted-foreground text-sm">
            <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
            No rankings yet. Play some matches!
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-2">
            {leaderboard.data?.map(entry => (
              <motion.div
                key={entry.userId}
                variants={fadeUp}
                className={`flex items-center gap-3 p-3.5 rounded-lg border transition-all ${
                  entry.rank === 1 ? "border-amber-500/50 bg-amber-500/8 glow-orange" :
                  entry.rank === 2 ? "border-slate-400/40 bg-slate-400/5" :
                  entry.rank === 3 ? "border-amber-700/40 bg-amber-700/5" :
                  "border-border bg-card"
                }`}
              >
                {/* Rank */}
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-mono font-black text-sm shrink-0 ${
                  entry.rank === 1 ? "bg-amber-500 text-amber-950" :
                  entry.rank === 2 ? "bg-slate-400 text-slate-900" :
                  entry.rank === 3 ? "bg-amber-700 text-amber-50" :
                  "bg-muted text-muted-foreground"
                }`}>
                  {entry.rank}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-sm truncate">{entry.username}</span>
                    {entry.badge && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        entry.badge === "Top Player" ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" : "bg-primary/20 text-primary border border-primary/30"
                      }`}>
                        {entry.badge === "Top Player" ? <Trophy className="w-2.5 h-2.5 inline mr-0.5" /> : <Flame className="w-2.5 h-2.5 inline mr-0.5" />}
                        {entry.badge}
                      </span>
                    )}
                  </div>
                  {entry.ign && <div className="text-xs text-muted-foreground truncate font-mono">{entry.ign}</div>}
                </div>

                {/* Stats */}
                <div className="text-right shrink-0">
                  <div className="text-sm font-black text-primary font-mono">{entry.wins}W</div>
                  <div className="text-[10px] text-muted-foreground">{entry.matchesPlayed} played</div>
                  {entry.winStreak >= 2 && (
                    <div className="flex items-center gap-0.5 justify-end text-[10px] text-accent">
                      <Zap className="w-2.5 h-2.5" />
                      {entry.winStreak} streak
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
