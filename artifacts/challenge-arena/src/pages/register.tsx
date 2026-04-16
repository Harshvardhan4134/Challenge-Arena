import { useState } from "react";
import { useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { Swords, Eye, EyeOff } from "lucide-react";

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

  const inputCls = "w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400";

  return (
    <div className="min-h-screen bg-[#FFE600] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <button onClick={() => navigate("/")} className="flex items-center gap-2 mb-8">
          <Swords className="w-5 h-5" />
          <span className="display-font text-2xl tracking-widest">CHALLENGE ARENA</span>
        </button>

        <div className="card-brutal overflow-hidden">
          <div className="bg-[#FF6B00] px-5 py-4">
            <div className="display-font text-3xl text-white">JOIN THE ARENA</div>
            <div className="text-white/70 text-xs font-mono mt-1">START DOMINATING TODAY</div>
          </div>

          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="section-label block mb-1">Username *</label>
                <input type="text" value={form.username} onChange={set("username")} required minLength={3} maxLength={30} className={inputCls} placeholder="Choose a username" />
              </div>

              <div>
                <label className="section-label block mb-1">Password *</label>
                <div className="relative">
                  <input type={showPass ? "text" : "password"} value={form.password} onChange={set("password")} required minLength={6} className={inputCls + " pr-10"} placeholder="Min. 6 characters" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="border-t-2 border-black pt-3 space-y-3">
                <div className="tag-black inline-block mb-1">FREE FIRE PROFILE (optional)</div>
                <div>
                  <label className="section-label block mb-1">Free Fire UID</label>
                  <input type="text" value={form.freefireUid} onChange={set("freefireUid")} className={inputCls} placeholder="Enter your UID" />
                </div>
                <div>
                  <label className="section-label block mb-1">In-Game Name (IGN)</label>
                  <input type="text" value={form.ign} onChange={set("ign")} className={inputCls} placeholder="Your in-game name" />
                </div>
                <div>
                  <label className="section-label block mb-1">Gender</label>
                  <select value={form.gender} onChange={set("gender")} className={inputCls}>
                    <option value="">Prefer not to say</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="border-2 border-[#FF1E56] bg-[#FF1E56]/10 px-3 py-2 text-sm font-bold text-[#FF1E56]">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="btn-brutal w-full py-3 bg-black text-[#FFE600] text-sm disabled:opacity-60"
              >
                {isPending ? "CREATING ACCOUNT..." : "CREATE ACCOUNT"}
              </button>
            </form>

            <div className="mt-4 text-center text-sm border-t-2 border-black pt-4">
              Already have an account?{" "}
              <button onClick={() => navigate("/login")} className="font-black underline hover:text-[#FF6B00] transition-colors">
                LOG IN
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
