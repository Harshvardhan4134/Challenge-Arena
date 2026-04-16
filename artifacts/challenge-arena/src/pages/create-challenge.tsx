import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useCreateChallenge } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { ArrowLeft, Plus, Minus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const PRESET_RULES = ["Headshot only", "No gloo wall", "No revive", "No spray", "Sniper only"];
const MODES = ["1v1", "2v2", "4v4"] as const;

export default function CreateChallenge() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"1v1" | "2v2" | "4v4">("1v1");
  const [scheduledAt, setScheduledAt] = useState("");
  const [rules, setRules] = useState<string[]>([]);
  const [customRule, setCustomRule] = useState("");
  const [teamName, setTeamName] = useState("");
  const [error, setError] = useState("");

  const { mutate, isPending } = useCreateChallenge({
    mutation: {
      onSuccess: (data) => {
        navigate(`/challenges/${data.id}`);
      },
      onError: (err: any) => {
        setError(err?.data?.message || "Failed to create challenge. Try again.");
      },
    },
  });

  const toggleRule = (rule: string) => {
    setRules(prev => prev.includes(rule) ? prev.filter(r => r !== rule) : [...prev, rule]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!scheduledAt) return setError("Please set a match date and time.");
    const allRules = [...rules, ...(customRule.trim() ? [customRule.trim()] : [])];
    mutate({
      data: {
        title,
        mode,
        scheduledAt: new Date(scheduledAt).toISOString(),
        rules: allRules,
        customRule: customRule.trim() || undefined,
        teamName: teamName || `${mode} Squad`,
      },
    });
  };

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="py-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate("/challenges")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black">Create Challenge</h1>
            <div className="text-xs font-mono text-muted-foreground">SET YOUR RULES</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Challenge Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              placeholder="e.g. 1v1 Headshot Battle"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">Match Mode *</label>
            <div className="grid grid-cols-3 gap-2">
              {MODES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "py-3 rounded border font-mono font-bold text-sm transition-all",
                    mode === m
                      ? "border-primary bg-primary/15 text-primary glow-cyan"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Match Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
            />
          </div>

          {/* Rules */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-2">Rules</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_RULES.map(rule => (
                <button
                  key={rule}
                  type="button"
                  onClick={() => toggleRule(rule)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded border text-sm transition-all text-left",
                    rules.includes(rule)
                      ? "border-accent bg-accent/15 text-accent"
                      : "border-border bg-card text-muted-foreground hover:border-accent/40"
                  )}
                >
                  <div className={cn("w-3 h-3 rounded-sm border flex items-center justify-center", rules.includes(rule) ? "border-accent bg-accent" : "border-muted-foreground")}>
                    {rules.includes(rule) && <div className="w-1.5 h-1 border-b border-r border-accent-foreground rotate-45 -translate-y-0.5" />}
                  </div>
                  {rule}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <input
                type="text"
                value={customRule}
                onChange={e => setCustomRule(e.target.value)}
                className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Custom rule (optional)..."
              />
            </div>
          </div>

          {/* Team name */}
          <div>
            <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Your Team Name</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
              placeholder={`e.g. ${mode} Squad`}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 border border-destructive/20 rounded px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 bg-primary text-primary-foreground font-black rounded hover:opacity-90 transition-opacity disabled:opacity-60 text-sm tracking-wide"
          >
            {isPending ? "Creating..." : "Create Challenge"}
          </button>
        </form>
      </motion.div>
    </Layout>
  );
}
