import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useListChallenges } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Swords, Plus, Users, Clock } from "lucide-react";

const MODES = ["", "1v1", "2v2", "4v4"] as const;

const STATUS_BG: Record<string, string> = {
  open: "bg-[#00854B] text-white",
  full: "bg-[#FF6B00] text-white",
  in_progress: "bg-black text-[#FFE600]",
  completed: "bg-gray-400 text-white",
  cancelled: "bg-gray-300 text-gray-700",
  disputed: "bg-[#FF1E56] text-white",
};

export default function Challenges() {
  const [, navigate] = useLocation();
  const [modeFilter, setModeFilter] = useState<"" | "1v1" | "2v2" | "4v4">("");
  const [slotsOnly, setSlotsOnly] = useState(false);

  const challenges = useListChallenges({
    ...(modeFilter ? { params: { mode: modeFilter, hasSlots: slotsOnly || undefined } } : { params: slotsOnly ? { hasSlots: true } : undefined }),
    query: { queryKey: ["listChallenges", modeFilter, slotsOnly] },
  });

  return (
    <Layout>
      <div className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="tag-black inline-block mb-1">BROWSE ACTIVE MATCHES</div>
            <div className="display-font text-4xl">CHALLENGES</div>
          </div>
          <button
            onClick={() => navigate("/challenges/create")}
            className="btn-brutal flex items-center gap-1.5 px-4 py-2 bg-[#FF6B00] text-white text-sm"
          >
            <Plus className="w-4 h-4" />
            CREATE
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-0 border-2 border-black overflow-hidden">
            {MODES.map(m => (
              <button
                key={m || "all"}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1.5 text-xs font-black font-mono border-r-2 border-black last:border-r-0 transition-colors ${
                  modeFilter === m ? "bg-black text-[#FFE600]" : "bg-white text-black hover:bg-[#FFE600]/50"
                }`}
              >
                {m || "ALL"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSlotsOnly(!slotsOnly)}
            className={`px-3 py-1.5 text-xs font-black font-mono border-2 border-black transition-colors ${
              slotsOnly ? "bg-[#00854B] text-white" : "bg-white text-black hover:bg-[#FFE600]/50"
            }`}
          >
            HAS SLOTS
          </button>
        </div>

        {/* List */}
        {challenges.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 border-2 border-black bg-white animate-pulse" />
            ))}
          </div>
        ) : challenges.data?.length === 0 ? (
          <div className="card-brutal p-12 text-center">
            <Swords className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="font-bold text-sm text-gray-600">No challenges found.</p>
            <button
              onClick={() => navigate("/challenges/create")}
              className="btn-brutal mt-4 px-6 py-2 bg-[#FF6B00] text-white text-xs"
            >
              CREATE THE FIRST ONE
            </button>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-3"
          >
            {challenges.data?.map(c => (
              <motion.button
                key={c.id}
                variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                onClick={() => navigate(`/challenges/${c.id}`)}
                className="w-full card-brutal overflow-hidden text-left hover:shadow-[6px_6px_0_#000] transition-shadow"
              >
                {/* Card header band */}
                <div className="bg-[#FF6B00] px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black font-mono text-xs tracking-wider">{c.mode}</span>
                    <span className="text-white/60 text-[10px] font-mono">CUSTOM ROOM</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-white text-[10px] font-mono">
                    <Users className="w-3 h-3" />
                    {(c.teamA?.players.length ?? 0) + (c.teamB?.players.length ?? 0)}/{(c.teamA?.maxSize ?? 0) + (c.teamB?.maxSize ?? 0)}
                  </div>
                </div>

                {/* Card body */}
                <div className="bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-black text-base truncate">{c.title}</div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-600">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span className="font-mono">{new Date(c.scheduledAt).toLocaleDateString()}</span>
                        </div>
                        {c.rules.length > 0 && (
                          <div className="flex gap-1 flex-wrap">
                            {c.rules.slice(0, 2).map(r => (
                              <span key={r} className="tag-black" style={{ fontSize: 9 }}>{r}</span>
                            ))}
                            {c.rules.length > 2 && <span className="tag-black" style={{ fontSize: 9 }}>+{c.rules.length - 2}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                    <span className={`text-[10px] font-black font-mono px-2 py-1 ${STATUS_BG[c.status] || "bg-gray-400 text-white"}`}>
                      {c.status.toUpperCase().replace("_", " ")}
                    </span>
                  </div>

                  {/* Team slot bars */}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div>
                      <div className="text-[9px] font-black font-mono text-gray-500 mb-1">TEAM A</div>
                      <div className="flex gap-1">
                        {Array.from({ length: c.teamA?.maxSize ?? 1 }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 border border-black ${i < (c.teamA?.players.length ?? 0) ? "bg-black" : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] font-black font-mono text-gray-500 mb-1">TEAM B</div>
                      <div className="flex gap-1">
                        {Array.from({ length: c.teamB?.maxSize ?? (c.teamA?.maxSize ?? 1) }).map((_, i) => (
                          <div
                            key={i}
                            className={`h-2 flex-1 border border-black ${c.teamB && i < c.teamB.players.length ? "bg-[#FF6B00]" : "bg-gray-200"}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card footer */}
                <div className={`px-4 py-1.5 ${
                  c.status === "open" ? "bg-[#00854B]" :
                  c.status === "full" ? "bg-[#FF6B00]" :
                  c.status === "in_progress" ? "bg-black" : "bg-gray-700"
                }`}>
                  <span className="text-[9px] font-black font-mono text-white tracking-wider">
                    {c.teamA?.name || "TEAM A"} VS {c.teamB?.name || "AWAITING CHALLENGER"}
                  </span>
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
