import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useGetMe, useGetStatsOverview, useListChallenges, useListNotifications } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Swords, Plus, Bell, ChevronRight, Trophy } from "lucide-react";
import { apiUrl } from "@/lib/api-url";
import { useEffect, useState } from "react";

export default function Home() {
  const [, navigate] = useLocation();
  const me = useGetMe({ query: { queryKey: ["getMe"] } });
  const stats = useGetStatsOverview({ query: { queryKey: ["getStatsOverview"] } });
  const challenges = useListChallenges({ query: { queryKey: ["listChallenges"] } });
  const notifications = useListNotifications({ query: { queryKey: ["listNotifications"] } });

  const user = me.data;
  const unreadNotifs = notifications.data?.filter(n => !n.isRead) ?? [];
  const [resolvedIgn, setResolvedIgn] = useState("");
  const [resolvedLevel, setResolvedLevel] = useState<number | null>(null);

  useEffect(() => {
    const uid = user?.freefireUid?.trim();
    const region = "IND";
    if (!uid || user?.ign) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          apiUrl(`/api/freefire/profile?uid=${encodeURIComponent(uid)}&region=${encodeURIComponent(region)}`),
        );
        const body = await res.json();
        if (!cancelled && res.ok) {
          if (body?.ign) setResolvedIgn(String(body.ign));
          if (typeof body?.level === "number") setResolvedLevel(body.level);
        }
      } catch {
        // Keep existing username fallback when lookup fails.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.freefireUid, user?.ign]);

  const displayName = user?.ign || resolvedIgn || user?.username || "PLAYER";

  return (
    <Layout>
      <div className="py-4 space-y-4">
        {/* Greeting */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="tag-black inline-block mb-2">WELCOME BACK</div>
          <div className="display-font text-5xl text-black leading-none">
            {displayName}
          </div>
          {user?.freefireUid && (
            <div className="text-xs font-mono font-bold mt-1 text-gray-700">
              UID: {user.freefireUid}
              {resolvedLevel !== null ? ` · LVL ${resolvedLevel}` : ""}
            </div>
          )}
        </motion.div>

        {/* Primary actions */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate("/challenges/create")}
            className="card-brutal p-4 flex flex-col items-start bg-[#FF6B00] text-white hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            style={{ backgroundColor: "#FF6B00", color: "#FFFFFF" }}
          >
            <Plus className="w-7 h-7 mb-2" />
            <div className="font-black text-sm">CREATE CHALLENGE</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>SET RULES & INVITE</div>
          </button>
          <button
            onClick={() => navigate("/challenges")}
            className="card-brutal p-4 flex flex-col items-start bg-black text-[#FFE600] hover:translate-x-0.5 hover:translate-y-0.5 transition-transform"
            style={{ backgroundColor: "#000000", color: "#FFE600" }}
          >
            <Swords className="w-7 h-7 mb-2" />
            <div className="font-black text-sm">JOIN MATCH</div>
            <div className="text-xs font-mono mt-0.5" style={{ color: "rgba(255,230,0,0.85)" }}>BROWSE OPEN MATCHES</div>
          </button>
        </div>

        {/* Platform stats */}
        {stats.data && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "ACTIVE", value: stats.data.activeChallenges, style: { backgroundColor: "#00854B", color: "#FFFFFF" } },
              { label: "REGISTERED", value: stats.data.totalPlayers, style: { backgroundColor: "#FF6B00", color: "#FFFFFF" } },
              { label: "TODAY", value: stats.data.matchesToday, style: { backgroundColor: "#FF1E56", color: "#FFFFFF" } },
            ].map(({ label, value, style }) => (
              <div key={label} className="card-brutal p-3 text-center" style={style}>
                <div className="display-font text-4xl">{value}</div>
                <div className="text-[9px] font-black font-mono tracking-widest mt-0.5" style={{ opacity: 0.9 }}>{label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Notifications preview */}
        {unreadNotifs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Bell className="w-4 h-4" />
                <span className="font-black text-sm">ALERTS</span>
                <span className="tag-pink">{unreadNotifs.length}</span>
              </div>
              <button onClick={() => navigate("/notifications")} className="text-xs font-black underline hover:text-[#FF6B00]">View all</button>
            </div>
            <div className="space-y-2">
              {unreadNotifs.slice(0, 3).map(n => (
                <div
                  key={n.id}
                  onClick={() => navigate("/notifications")}
                  className="card-brutal-sm p-3 flex items-start gap-3 cursor-pointer bg-white hover:bg-[#FFE600]/50 transition-colors"
                >
                  <div className="w-2 h-2 bg-[#FF1E56] mt-1.5 shrink-0" />
                  <div>
                    <div className="text-sm font-black">{n.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{n.message}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent challenges */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="font-black text-sm">RECENT MATCHES</div>
            <button onClick={() => navigate("/challenges")} className="text-xs font-black flex items-center gap-0.5 underline hover:text-[#FF6B00]">
              SEE ALL <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          {challenges.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 border-2 border-black bg-white animate-pulse" />)}
            </div>
          ) : challenges.data?.length === 0 ? (
            <div className="card-brutal p-8 text-center">
              <Swords className="w-8 h-8 mx-auto mb-2 text-gray-400" />
              <p className="font-bold text-sm text-black">No active challenges yet.</p>
              <button
                onClick={() => navigate("/challenges/create")}
                className="btn-brutal mt-3 px-5 py-2 bg-[#FF6B00] text-white text-xs"
              >
                CREATE FIRST ONE
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {challenges.data?.slice(0, 3).map(c => (
                <button
                  key={c.id}
                  onClick={() => navigate(`/challenges/${c.id}`)}
                  className="w-full card-brutal-sm overflow-hidden text-left hover:shadow-[5px_5px_0_#000] transition-shadow"
                >
                  <div className="bg-[#FF6B00] px-3 py-1 flex items-center justify-between">
                    <span className="text-white text-[10px] font-black font-mono tracking-wider">{c.mode}</span>
                    <span className={`text-[10px] font-black font-mono ${
                      c.status === "open" ? "text-[#FFE600]" :
                      c.status === "full" ? "text-white" : "text-white/60"
                    }`}>{c.status.toUpperCase().replace("_", " ")}</span>
                  </div>
                  <div className="p-3 bg-white">
                    <div className="font-black text-sm">{c.title}</div>
                    <div className="text-xs text-gray-600 mt-0.5 font-mono">
                      {c.teamA?.players.length ?? 0}/{c.teamA?.maxSize ?? 1} players · {new Date(c.scheduledAt).toLocaleDateString()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => navigate("/leaderboard")}
            className="card-brutal-sm flex items-center gap-2 p-3 bg-white hover:bg-[#FFE600]/30 transition-colors"
            style={{ color: "#000" }}
          >
            <Trophy className="w-5 h-5 text-[#FF6B00]" />
            <span className="font-black text-sm">LEADERBOARD</span>
          </button>
          <button
            onClick={() => navigate("/profile/me")}
            className="card-brutal-sm flex items-center gap-2 p-3 bg-white hover:bg-[#FFE600]/30 transition-colors"
            style={{ color: "#000" }}
          >
            <Swords className="w-5 h-5 text-[#FF6B00]" />
            <span className="font-black text-sm">MY STATS</span>
          </button>
        </div>
      </div>
    </Layout>
  );
}
