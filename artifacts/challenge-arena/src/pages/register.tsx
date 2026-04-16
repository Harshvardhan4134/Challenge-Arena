import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useRegister } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { Swords, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", password: "", freefireUid: "", ign: "", gender: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const { mutate, isPending } = useRegister({
    mutation: {
      onSuccess: (data) => {
        setAuthToken(data.token);
        navigate("/home");
      },
      onError: (err: any) => {
        setError(err?.data?.message || "Registration failed. Try a different username.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutate({
      data: {
        username: form.username,
        password: form.password,
        freefireUid: form.freefireUid || undefined,
        ign: form.ign || undefined,
        gender: (form.gender as "male" | "female" | "other") || undefined,
      },
    });
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10 relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(ellipse at 70% 30%, rgba(0,255,255,0.05) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(255,140,0,0.04) 0%, transparent 60%)`,
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <button onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-primary font-mono font-bold tracking-wider mb-6">
            <Swords className="w-5 h-5" />
            CHALLENGE ARENA
          </button>
          <h1 className="text-2xl font-black">Create your account</h1>
          <p className="text-muted-foreground text-sm mt-1">Join the arena. Start dominating.</p>
        </div>

        <div className="border border-border rounded-lg bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Username *</label>
              <input
                type="text"
                value={form.username}
                onChange={set("username")}
                required minLength={3} maxLength={30}
                className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Choose a username"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Password *</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={form.password}
                  onChange={set("password")}
                  required minLength={6}
                  className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  placeholder="Min. 6 characters"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="border-t border-border/50 pt-4">
              <p className="text-xs font-mono text-muted-foreground mb-3">FREE FIRE PROFILE (optional)</p>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Free Fire UID</label>
                  <input
                    type="text"
                    value={form.freefireUid}
                    onChange={set("freefireUid")}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Enter your UID"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">In-Game Name (IGN)</label>
                  <input
                    type="text"
                    value={form.ign}
                    onChange={set("ign")}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                    placeholder="Your in-game name"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={set("gender")}
                    className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  >
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
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
              className="w-full py-3 bg-primary text-primary-foreground font-bold rounded hover:opacity-90 transition-opacity disabled:opacity-60 text-sm"
            >
              {isPending ? "Creating account..." : "Create Account"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">
              Log in
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
