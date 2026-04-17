import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useGetStatsOverview } from "@workspace/api-client-react";
import { Swords, Zap, Users, Trophy } from "lucide-react";

export default function Landing() {
  const [, navigate] = useLocation();
  const stats = useGetStatsOverview();

  return (
    <div className="min-h-screen bg-[#FFE600] text-black overflow-x-hidden">
      {/* Nav */}
      <nav className="border-b-4 border-black bg-black sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Swords className="w-5 h-5 text-[#FFE600]" />
            <span className="display-font text-[#FFE600] text-2xl tracking-widest">CHALLENGE ARENA</span>
          </div>
          <div className="flex items-center gap-0">
            <button
              onClick={() => navigate("/login")}
              className="px-4 py-2 text-sm font-black text-[#FFE600] hover:bg-white/10 transition-colors font-mono tracking-wider"
            >
              LOGIN
            </button>
            <button
              onClick={() => navigate("/register")}
              className="btn-brutal px-4 py-2 text-sm bg-[#FFE600] text-black"
            >
              GET STARTED
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-4 border-b-4 border-black">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 mb-6"
          >
            <div className="tag-black flex items-center gap-1.5">
              <div className="w-2 h-2 bg-[#FF1E56] rounded-full animate-pulse" />
              GARENA FREE FIRE — CUSTOM MATCH PLATFORM
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="display-font text-[80px] sm:text-[120px] leading-none text-black mb-2"
          >
            FIND.
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.08 }}
            className="display-font text-[80px] sm:text-[120px] leading-none text-[#FF6B00] mb-2"
            style={{ WebkitTextStroke: "3px #000" }}
          >
            CHALLENGE.
          </motion.h1>
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.16 }}
            className="display-font text-[80px] sm:text-[120px] leading-none text-black mb-8"
          >
            DOMINATE.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-lg font-bold max-w-xl mb-8"
          >
            Create custom Free Fire matches instantly. No Discord chaos. No waiting. Just you, your squad, and the battlefield.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="flex flex-col sm:flex-row gap-3 mb-12"
          >
            <button
              onClick={() => navigate("/register")}
              className="btn-brutal px-8 py-4 bg-[#FF6B00] text-white text-lg flex items-center gap-2 justify-center"
            >
              <Swords className="w-5 h-5" />
              CREATE CHALLENGE
            </button>
            <button
              onClick={() => navigate("/login")}
              className="btn-brutal px-8 py-4 bg-black text-[#FFE600] text-lg flex items-center gap-2 justify-center"
            >
              BROWSE MATCHES
            </button>
          </motion.div>

          {/* Live stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-3 gap-3 max-w-lg"
          >
            {[
              { label: "ACTIVE MATCHES", value: stats.data?.activeChallenges ?? "—" },
              { label: "LEGENDS IN BATTLE", value: stats.data?.totalPlayers ?? "—" },
              { label: "TODAY", value: stats.data?.matchesToday ?? "—" },
            ].map(({ label, value }) => (
              <div key={label} className="card-brutal p-3 text-center">
                <div className="display-font text-4xl text-[#FF6B00]">{value}</div>
                <div className="text-[9px] font-black font-mono tracking-widest mt-1">{label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-4 border-b-4 border-black bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="tag-orange inline-block mb-4">HOW IT WORKS</div>
          <h2 className="display-font text-5xl sm:text-6xl mb-10">FROM SIGNUP TO SHOWDOWN IN MINUTES</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { n: "01", icon: Users, title: "CREATE YOUR PROFILE", desc: "Sign up, enter your Free Fire UID and in-game name. Your competitive identity starts here." },
              { n: "02", icon: Swords, title: "HOST OR JOIN", desc: "Host a match to compete as Team A — challengers request to face you and you approve. Or join an open roster spot; competing as the challenger side always needs the host leader’s OK." },
              { n: "03", icon: Trophy, title: "COMPETE & RANK", desc: "Play the match, submit the result. Build your win streak. Climb the weekly leaderboard." },
            ].map(({ n, icon: Icon, title, desc }) => (
              <div key={n} className="card-brutal p-5">
                <div className="display-font text-5xl text-[#FF6B00] mb-3">{n}</div>
                <Icon className="w-7 h-7 mb-3" />
                <div className="font-black text-sm mb-2">{title}</div>
                <p className="text-sm text-gray-600 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 border-b-4 border-black">
        <div className="max-w-5xl mx-auto">
          <div className="tag-black inline-block mb-4 text-[#FFE600]">FEATURES</div>
          <h2 className="display-font text-5xl sm:text-6xl mb-10 text-black [text-shadow:2px_2px_0_#fff]">BUILT FOR SERIOUS PLAYERS</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { icon: Swords, label: "1v1 / 2v2 / 4v4 MODES", bg: "#FF6B00", fg: "#fff" },
              { icon: Zap, label: "LEADER CHAT & ROOM SHARE", bg: "#000000", fg: "#fff" },
              { icon: Trophy, label: "WEEKLY LEADERBOARD", bg: "#00854B", fg: "#fff" },
              { icon: Users, label: "CUSTOM RULE PRESETS", bg: "#FF1E56", fg: "#fff" },
              { icon: Swords, label: "MATCH RESULT SYSTEM", bg: "#FF6B00", fg: "#fff" },
              { icon: Zap, label: "INSTANT NOTIFICATIONS", bg: "#000000", fg: "#fff" },
            ].map(({ icon: Icon, label, bg, fg }) => (
              <div key={label} className="card-brutal p-4" style={{ backgroundColor: bg, color: fg }}>
                <Icon className="w-6 h-6 mb-2" />
                <div className="font-black text-xs tracking-wide">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-black border-b-4 border-black">
        <div className="max-w-2xl mx-auto text-center">
          <div className="display-font text-6xl sm:text-8xl text-[#FFE600] mb-4">READY TO DROP?</div>
          <p className="text-white font-bold mb-8">Join hundreds of Free Fire players already competing on Challenge Arena.</p>
          <button
            onClick={() => navigate("/register")}
            className="btn-brutal px-12 py-5 bg-[#FFE600] text-black text-xl"
          >
            START NOW — IT'S FREE
          </button>
        </div>
      </section>

      <footer className="border-t-4 border-black py-6 bg-[#FFE600] text-center">
        <div className="display-font text-base tracking-widest text-black flex items-center justify-center gap-2">
          <Swords className="w-4 h-4" />
          CHALLENGE ARENA — GARENA FREE FIRE MATCHMAKING
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
          <button onClick={() => navigate("/privacy-policy")} className="underline">Privacy Policy</button>
          <span>|</span>
          <button onClick={() => navigate("/terms-and-conditions")} className="underline">Terms & Conditions</button>
        </div>
        <div className="mt-3 text-xs font-mono">
          Support: <a href="mailto:support@lendlly.in" className="underline font-bold">support@lendlly.in</a>
        </div>
        <div className="text-xs font-mono">
          Ads & collaboration: <a href="mailto:harsh@lendlly.in" className="underline font-bold">harsh@lendlly.in</a>
        </div>
        <div className="mt-2 text-[11px] font-bold">
          Challenge Arena is not a betting or gambling platform.
        </div>
      </footer>
    </div>
  );
}
