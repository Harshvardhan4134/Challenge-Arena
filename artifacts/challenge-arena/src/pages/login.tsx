import { useState } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { useLogin } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { Swords, Eye, EyeOff, AlertCircle } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  const { mutate, isPending } = useLogin({
    mutation: {
      onSuccess: (data) => {
        setAuthToken(data.token);
        navigate("/home");
      },
      onError: (err: any) => {
        setError(err?.data?.message || "Invalid credentials. Try again.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    mutate({ data: { username, password } });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0" style={{
        backgroundImage: `radial-gradient(ellipse at 30% 50%, rgba(0,255,255,0.05) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(255,140,0,0.04) 0%, transparent 60%)`,
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
          <h1 className="text-2xl font-black">Welcome back</h1>
          <p className="text-muted-foreground text-sm mt-1">Log in to your account</p>
        </div>

        <div className="border border-border rounded-lg bg-card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2.5 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                placeholder="Your username"
                autoComplete="username"
              />
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider block mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 pr-10 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
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
              {isPending ? "Logging in..." : "Log In"}
            </button>
          </form>

          <div className="mt-4 text-center text-sm text-muted-foreground">
            No account?{" "}
            <button onClick={() => navigate("/register")} className="text-primary hover:underline font-medium">
              Register now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
