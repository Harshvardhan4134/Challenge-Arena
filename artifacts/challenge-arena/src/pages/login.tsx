import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { Swords, Eye, EyeOff } from "lucide-react";

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
    <div className="min-h-screen bg-[#FFE600] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 mb-8"
        >
          <Swords className="w-5 h-5" />
          <span className="display-font text-2xl tracking-widest">CHALLENGE ARENA</span>
        </button>

        <div className="card-brutal overflow-hidden">
          <div className="bg-black px-5 py-4">
            <div className="display-font text-3xl text-[#FFE600]">WELCOME BACK</div>
            <div className="text-[#FFE600]/60 text-xs font-mono mt-1">LOG IN TO YOUR ACCOUNT</div>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="section-label block mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  className="w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400"
                  placeholder="Your username"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="section-label block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 pr-10 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400"
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-black"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
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
                className="btn-brutal w-full py-3 bg-[#FF6B00] text-white text-sm disabled:opacity-60"
              >
                {isPending ? "LOGGING IN..." : "LOG IN"}
              </button>
            </form>

            <div className="mt-4 text-center text-sm border-t-2 border-black pt-4">
              No account?{" "}
              <button onClick={() => navigate("/register")} className="font-black underline hover:text-[#FF6B00] transition-colors">
                REGISTER NOW
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
