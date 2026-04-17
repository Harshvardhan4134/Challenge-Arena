import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateChallenge } from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { ArrowLeft } from "lucide-react";
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
      onSuccess: (data) => navigate(`/challenges/${data.id}`),
      onError: (err: any) => setError(err?.data?.message || "Failed to create challenge. Try again."),
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

  const inputCls = "w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400";

  return (
    <Layout>
      <div className="py-4">
        <div className="flex items-center gap-3 mb-5">
          <button onClick={() => navigate("/challenges")} className="text-black hover:text-[#FF6B00] transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="tag-orange inline-block mb-1">NEW CHALLENGE</div>
            <div className="display-font text-4xl leading-none">CREATE CHALLENGE</div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Title */}
          <div>
            <label className="block mb-1.5 text-[10px] font-black font-mono uppercase tracking-widest text-black">Challenge Title *</label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              className={inputCls}
              placeholder="e.g. 1v1 Headshot Battle"
            />
          </div>

          {/* Mode */}
          <div>
            <label className="block mb-2 text-[10px] font-black font-mono uppercase tracking-widest text-black">Match Mode *</label>
            <div className="grid grid-cols-3 gap-0 border-2 border-black overflow-hidden">
              {MODES.map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn(
                    "py-3 font-black font-mono text-sm border-r-2 border-black last:border-r-0 transition-colors",
                    mode === m ? "bg-[#FF6B00] text-white" : "bg-white text-black hover:bg-[#FFE600]/50"
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Time */}
          <div>
            <label className="block mb-1.5 text-[10px] font-black font-mono uppercase tracking-widest text-black">Match Date & Time *</label>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={e => setScheduledAt(e.target.value)}
              required
              min={new Date().toISOString().slice(0, 16)}
              className={inputCls}
            />
          </div>

          {/* Rules */}
          <div>
            <label className="block mb-2 text-[10px] font-black font-mono uppercase tracking-widest text-black">Rules</label>
            <div className="grid grid-cols-2 gap-2">
              {PRESET_RULES.map(rule => (
                <button
                  key={rule}
                  type="button"
                  onClick={() => toggleRule(rule)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 border-2 border-black text-sm font-bold transition-colors text-left",
                    rules.includes(rule) ? "bg-[#FF6B00] text-white" : "bg-white text-black hover:bg-[#FFE600]/50"
                  )}
                >
                  <div className={cn("w-3.5 h-3.5 border-2 border-current flex items-center justify-center shrink-0", rules.includes(rule) ? "bg-white" : "")}>
                    {rules.includes(rule) && <div className="w-1.5 h-1.5 bg-[#FF6B00]" />}
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
                className={inputCls}
                placeholder="Custom rule (optional)..."
              />
            </div>
          </div>

          {/* Team name */}
          <div>
            <label className="block mb-1.5 text-[10px] font-black font-mono uppercase tracking-widest text-black">Your Team Name *</label>
            <input
              type="text"
              value={teamName}
              onChange={e => setTeamName(e.target.value)}
              required
              className={inputCls}
              placeholder={`e.g. ${mode} Squad`}
            />
          </div>

          {error && (
            <div className="border-2 border-[#FF1E56] bg-[#FF1E56] px-3 py-2 text-sm font-black text-white">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isPending}
            className="btn-brutal w-full py-4 bg-[#FF6B00] text-white text-base disabled:opacity-60"
          >
            {isPending ? "CREATING..." : "CREATE CHALLENGE"}
          </button>
        </form>
      </div>
    </Layout>
  );
}
