import { useState } from "react";
import { useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { Swords, Eye, EyeOff, Mail, Lock, User, Gamepad2, Hash } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ username: "", password: "", email: "", freefireUid: "", ign: "", gender: "" });
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
        email: form.email || undefined,
        freefireUid: form.freefireUid,
        ign: form.ign || undefined,
        gender: (form.gender as "male" | "female" | "other") || undefined,
      },
    });
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className="min-h-screen bg-[#FFE600] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <button onClick={() => navigate("/")} className="flex items-center gap-2 mb-6">
          <Swords className="w-5 h-5 text-black" />
          <span className="display-font text-2xl tracking-widest text-black">CHALLENGE ARENA</span>
        </button>

        <div className="card-brutal overflow-hidden">
          {/* Card header */}
          <div className="bg-[#FF6B00] px-5 py-4">
            <div className="display-font text-3xl text-white">JOIN THE ARENA</div>
            <div className="text-white text-xs font-mono mt-1 opacity-80">CREATE YOUR ACCOUNT TO START COMPETING</div>
          </div>

          <div className="bg-white p-5">
            <form onSubmit={handleSubmit} className="space-y-0">

              {/* SECTION: Account */}
              <div className="mb-4">
                <div className="bg-black text-[#FFE600] text-[10px] font-black font-mono tracking-widest px-3 py-1.5 mb-3">
                  ACCOUNT DETAILS
                </div>

                <div className="space-y-3">
                  {/* Username */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <User className="w-3.5 h-3.5 text-[#FF6B00]" />
                      USERNAME *
                    </label>
                    <input
                      type="text"
                      value={form.username}
                      onChange={set("username")}
                      required
                      minLength={3}
                      maxLength={30}
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="Choose a username"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <Mail className="w-3.5 h-3.5 text-[#FF6B00]" />
                      EMAIL ADDRESS *
                    </label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={set("email")}
                      required
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="your@gmail.com"
                      autoComplete="email"
                    />
                  </div>

                  {/* Password */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <Lock className="w-3.5 h-3.5 text-[#FF6B00]" />
                      PASSWORD *
                    </label>
                    <div className="relative">
                      <input
                        type={showPass ? "text" : "password"}
                        value={form.password}
                        onChange={set("password")}
                        required
                        minLength={6}
                        className="w-full px-3 py-2.5 pr-10 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                        placeholder="Min. 6 characters"
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black transition-colors"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: Free Fire Profile */}
              <div className="mb-4">
                <div className="bg-[#FF6B00] text-white text-[10px] font-black font-mono tracking-widest px-3 py-1.5 mb-3">
                  FREE FIRE PROFILE
                </div>

                <div className="space-y-3">
                  {/* Free Fire UID */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <Hash className="w-3.5 h-3.5 text-[#FF6B00]" />
                      FREE FIRE UID *
                    </label>
                    <input
                      type="text"
                      value={form.freefireUid}
                      onChange={set("freefireUid")}
                      required
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="Enter your UID (required)"
                    />
                  </div>

                  {/* IGN */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <Gamepad2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                      IN-GAME NAME (IGN)
                    </label>
                    <input
                      type="text"
                      value={form.ign}
                      onChange={set("ign")}
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="Your in-game name"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      GENDER
                    </label>
                    <select
                      value={form.gender}
                      onChange={set("gender")}
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="">Prefer not to say</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="border-2 border-[#FF1E56] bg-[#FF1E56] px-3 py-2 text-sm font-black text-white mb-3">
                  {error}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={isPending}
                className="btn-brutal w-full py-3.5 bg-black text-[#FFE600] text-sm disabled:opacity-60"
              >
                {isPending ? "CREATING ACCOUNT..." : "CREATE ACCOUNT — JOIN THE ARENA"}
              </button>
            </form>

            {/* Login link */}
            <div className="mt-4 text-center text-sm text-black border-t-2 border-black pt-4">
              Already have an account?{" "}
              <button
                onClick={() => navigate("/login")}
                className="font-black text-[#FF6B00] underline hover:text-black transition-colors"
              >
                LOG IN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
