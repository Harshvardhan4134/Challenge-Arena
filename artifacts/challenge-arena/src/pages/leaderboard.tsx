import { motion } from "framer-motion";
import { useGetWeeklyLeaderboard } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Trophy, Flame, Zap } from "lucide-react";

const RANK_STYLE: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-[#FFD700]", text: "text-black", label: "#1" },
  2: { bg: "bg-gray-300", text: "text-black", label: "#2" },
  3: { bg: "bg-[#CD7F32]", text: "text-white", label: "#3" },
};

export default function Leaderboard() {
  const leaderboard = useGetWeeklyLeaderboard({ query: { queryKey: ["getWeeklyLeaderboard"] } });

  return (
    <Layout>
      <div className="py-4 space-y-4">
        {/* Header */}
        <div>
          <div className="tag-orange inline-block mb-1">RESETS EVERY WEEK</div>
          <div className="display-font text-5xl flex items-center gap-2">
            <Trophy className="w-8 h-8 text-[#FF6B00]" />
            LEADERBOARD
          </div>
        </div>

        {leaderboard.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 border-2 border-black bg-white animate-pulse" />
            ))}
          </div>
        ) : leaderboard.data?.length === 0 ? (
          <div className="card-brutal p-12 text-center">
            <Trophy className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="font-black text-sm text-gray-600">
              NO RANKINGS YET. FINISH AT LEAST ONE MATCH (HOST SUBMITS RESULT) TO APPEAR HERE.
            </p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
            className="space-y-2"
          >
            {leaderboard.data?.map(entry => {
              const rankStyle = RANK_STYLE[entry.rank] || { bg: "bg-white", text: "text-black", label: `#${entry.rank}` };
              return (
                <motion.div
                  key={entry.userId}
                  variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}
                  className="card-brutal overflow-hidden"
                >
                  <div className="flex items-stretch">
                    {/* Rank block */}
                    <div className={`${rankStyle.bg} ${rankStyle.text} w-14 flex flex-col items-center justify-center border-r-3 border-black font-black font-mono text-lg shrink-0`} style={{ borderRight: "3px solid #000" }}>
                      {entry.rank <= 3 ? (
                        <Trophy className="w-5 h-5 mb-0.5" />
                      ) : null}
                      <span style={{ fontSize: entry.rank <= 3 ? 12 : 18 }}>{rankStyle.label}</span>
                    </div>

                    {/* Info */}
                    <div className="bg-white flex-1 px-4 py-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-black text-sm">{entry.username}</div>
                          {entry.ign && <div className="text-[10px] font-mono text-gray-500 mt-0.5">{entry.ign}</div>}
                          {entry.badge && (
                            <span className={`inline-block mt-1 ${entry.badge === "Top Player" ? "tag-orange" : "tag-black"}`}>
                              {entry.badge === "Top Player" ? "👑 " : "🔥 "}{entry.badge}
                            </span>
                          )}
                        </div>

                        <div className="text-right">
                          <div className="display-font text-3xl text-[#FF6B00]">{entry.wins}W</div>
                          <div className="text-[10px] font-mono text-gray-500">{entry.matchesPlayed} PLAYED</div>
                          {entry.winStreak >= 2 && (
                            <div className="flex items-center gap-0.5 justify-end mt-1">
                              <Zap className="w-3 h-3 text-[#FF6B00]" />
                              <span className="text-[10px] font-black font-mono text-[#FF6B00]">{entry.winStreak} STREAK</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Win rate bar */}
                      <div className="mt-2">
                        <div className="text-[9px] font-mono text-gray-500 mb-1">WIN RATE</div>
                        <div className="h-2 bg-gray-200 border border-black overflow-hidden">
                          <div
                            className="h-full bg-[#FF6B00]"
                            style={{ width: entry.matchesPlayed > 0 ? `${Math.round((entry.wins / entry.matchesPlayed) * 100)}%` : "0%" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
