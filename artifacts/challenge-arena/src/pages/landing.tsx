import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGetStatsOverview } from "@workspace/api-client-react";
import { Shield, Zap, Users, Trophy, Target, Clock, ChevronRight, Swords } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();
  const stats = useGetStatsOverview();

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
  };

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-primary" />
            <span className="font-mono font-bold text-primary tracking-wider text-sm">CHALLENGE ARENA</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/register")}
              className="px-4 py-1.5 text-sm bg-primary text-primary-foreground rounded font-semibold hover:opacity-90 transition-opacity"
            >
              Get Started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative min-h-screen flex items-center justify-center pt-14 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(ellipse at 50% 0%, rgba(0,255,255,0.08) 0%, transparent 70%)`,
        }} />
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center">
          <motion.div initial="hidden" animate="show" variants={stagger}>
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono mb-6">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              GARENA FREE FIRE
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl sm:text-7xl font-black tracking-tight mb-4 leading-none">
              <span className="block text-foreground">FIND.</span>
              <span className="block text-primary text-glow-cyan">CHALLENGE.</span>
              <span className="block text-foreground">DOMINATE.</span>
            </motion.h1>

            <motion.p variants={fadeUp} className="text-lg text-muted-foreground max-w-xl mx-auto mt-6 mb-8 leading-relaxed">
              Create custom Free Fire matches instantly. No Discord chaos. No waiting. Just you, your squad, and the battlefield.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => navigate("/register")}
                className="group px-8 py-3.5 bg-primary text-primary-foreground font-bold rounded text-base hover:opacity-90 transition-all glow-cyan flex items-center gap-2 justify-center"
              >
                <Swords className="w-5 h-5" />
                Create Challenge
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/challenges")}
                className="px-8 py-3.5 border border-border bg-secondary text-foreground font-bold rounded text-base hover:border-primary/40 hover:bg-secondary/80 transition-all flex items-center gap-2 justify-center"
              >
                <Target className="w-5 h-5 text-primary" />
                Browse Matches
              </button>
            </motion.div>

            {/* Live stats */}
            <motion.div variants={fadeUp} className="mt-14 grid grid-cols-3 gap-4 max-w-lg mx-auto">
              {[
                { label: "Active Matches", value: stats.data?.activeChallenges ?? "—" },
                { label: "Players Online", value: stats.data?.totalPlayers ?? "—" },
                { label: "Matches Today", value: stats.data?.matchesToday ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="border border-border/50 rounded bg-card/50 py-3 px-2">
                  <div className="text-2xl font-black text-primary font-mono">{value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 border-t border-border/40">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-xs font-mono text-primary tracking-widest mb-2">HOW IT WORKS</div>
            <h2 className="text-3xl font-black">From signup to showdown in minutes</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-1 sm:grid-cols-3 gap-4"
          >
            {[
              { n: "01", icon: Users, title: "Create Your Profile", desc: "Sign up, enter your Free Fire UID and in-game name. Your competitive identity starts here." },
              { n: "02", icon: Swords, title: "Create or Join", desc: "Set match rules — mode, time, restrictions. Or browse open challenges and jump straight in." },
              { n: "03", icon: Trophy, title: "Compete & Rank", desc: "Play the match, submit the result. Build your win streak. Climb the weekly leaderboard." },
            ].map(({ n, icon: Icon, title, desc }) => (
              <motion.div
                key={n}
                variants={fadeUp}
                className="relative p-5 border border-border rounded-lg bg-card hover:border-primary/30 transition-colors group"
              >
                <div className="text-xs font-mono text-primary/40 mb-3">{n}</div>
                <Icon className="w-8 h-8 text-primary mb-3 group-hover:scale-110 transition-transform" />
                <h3 className="font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 border-t border-border/40 bg-card/30">
        <div className="max-w-5xl mx-auto px-4">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <div className="text-xs font-mono text-primary tracking-widest mb-2">FEATURES</div>
            <h2 className="text-3xl font-black">Built for serious players</h2>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-3 gap-3"
          >
            {[
              { icon: Swords, label: "1v1 / 2v2 / 4v4 modes" },
              { icon: Shield, label: "Custom rule presets" },
              { icon: Clock, label: "Scheduled matchmaking" },
              { icon: Zap, label: "Leader chat & room share" },
              { icon: Trophy, label: "Weekly leaderboard" },
              { icon: Target, label: "Match result system" },
            ].map(({ icon: Icon, label }) => (
              <motion.div
                key={label}
                variants={fadeUp}
                className="flex items-center gap-3 p-4 border border-border/50 rounded bg-background hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <Icon className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm font-medium">{label}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-border/40 relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(ellipse at 50% 50%, rgba(0,255,255,0.06) 0%, transparent 70%)`,
        }} />
        <div className="relative max-w-2xl mx-auto px-4 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl font-black mb-4">Ready to drop?</h2>
            <p className="text-muted-foreground mb-8">Join hundreds of Free Fire players already competing on Challenge Arena.</p>
            <button
              onClick={() => navigate("/register")}
              className="px-10 py-4 bg-primary text-primary-foreground font-black text-lg rounded glow-cyan hover:opacity-90 transition-opacity"
            >
              Start Now — It's Free
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 py-6 text-center">
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-xs font-mono">
          <Swords className="w-3 h-3 text-primary" />
          CHALLENGE ARENA — GARENA FREE FIRE MATCHMAKING
        </div>
      </footer>
    </div>
  );
}
