import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useListChallenges } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { Swords, Plus, Filter, Clock, Users } from "lucide-react";

const MODES = ["", "1v1", "2v2", "4v4"] as const;
const STATUS_COLORS: Record<string, string> = {
  open: "text-green-400 border-green-500/40 bg-green-500/10",
  full: "text-amber-400 border-amber-500/40 bg-amber-500/10",
  in_progress: "text-primary border-primary/40 bg-primary/10",
  completed: "text-muted-foreground border-border",
  cancelled: "text-muted-foreground border-border",
  disputed: "text-destructive border-destructive/40 bg-destructive/10",
};

export default function Challenges() {
  const [, navigate] = useLocation();
  const [modeFilter, setModeFilter] = useState<"" | "1v1" | "2v2" | "4v4">("");
  const [slotsOnly, setSlotsOnly] = useState(false);

  const challenges = useListChallenges({
    ...(modeFilter ? { params: { mode: modeFilter, hasSlots: slotsOnly || undefined } } : { params: slotsOnly ? { hasSlots: true } : undefined }),
    query: { queryKey: ["listChallenges", modeFilter, slotsOnly] },
  });

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } };
  const fadeUp = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } };

  return (
    <Layout>
      <div className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black">Challenges</h1>
            <div className="text-xs text-muted-foreground font-mono mt-0.5">BROWSE ACTIVE MATCHES</div>
          </div>
          <button
            onClick={() => navigate("/challenges/create")}
            className="flex items-center gap-1.5 px-3 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" />
            Create
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-3.5 h-3.5 text-muted-foreground" />
          <div className="flex gap-1.5 flex-wrap">
            {MODES.map(m => (
              <button
                key={m || "all"}
                onClick={() => setModeFilter(m)}
                className={`px-3 py-1 rounded-full text-xs font-mono font-medium border transition-all ${
                  modeFilter === m
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {m || "All"}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSlotsOnly(!slotsOnly)}
            className={`px-3 py-1 rounded-full text-xs font-mono border transition-all ${
              slotsOnly
                ? "bg-accent text-accent-foreground border-accent"
                : "border-border text-muted-foreground hover:border-accent/40"
            }`}
          >
            Has Slots
          </button>
        </div>

        {/* List */}
        {challenges.isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 rounded-lg border border-border bg-card animate-pulse" />
            ))}
          </div>
        ) : challenges.data?.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-lg bg-card">
            <Swords className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground text-sm">No challenges found.</p>
            <button
              onClick={() => navigate("/challenges/create")}
              className="mt-4 px-6 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Create the first one
            </button>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-3">
            {challenges.data?.map(c => (
              <motion.button
                key={c.id}
                variants={fadeUp}
                onClick={() => navigate(`/challenges/${c.id}`)}
                className="w-full text-left rounded-lg border border-border bg-card hover:border-primary/30 hover:bg-card/80 transition-all p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{c.title}</div>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-mono text-primary font-bold">{c.mode}</span>
                      <span className="text-muted-foreground">·</span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Users className="w-3 h-3" />
                        Team A: {c.teamA?.players.length ?? 0}/{c.teamA?.maxSize ?? 1}
                        {c.teamB && ` · Team B: ${c.teamB.players.length}/${c.teamB.maxSize}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(c.scheduledAt).toLocaleString()}
                    </div>
                    {c.rules.length > 0 && (
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        {c.rules.slice(0, 3).map(r => (
                          <span key={r} className="text-[10px] px-1.5 py-0.5 rounded border border-border/60 text-muted-foreground font-mono">{r}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[c.status] || ""}`}>
                    {c.status.toUpperCase().replace("_", " ")}
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
