import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { firebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { exchangeGoogleToken } from "@/lib/google-auth";
import { signInWithPopup } from "firebase/auth";
import { Swords, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [, navigate] = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [showGoogleProfileModal, setShowGoogleProfileModal] = useState(false);
  const [googleProfileForm, setGoogleProfileForm] = useState({
    username: "",
    freefireUid: "",
    ign: "",
    gender: "",
  });

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

  const setGoogleField = (k: "username" | "freefireUid" | "ign" | "gender") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setGoogleProfileForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleGoogleLogin = async () => {
    setError("");
    if (!isFirebaseConfigured() || !firebaseAuth || !googleProvider) {
      setError("Google login is not configured yet. Ask admin to add Firebase env keys.");
      return;
    }
    setIsGooglePending(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await cred.user.getIdToken();
      setGoogleIdToken(idToken);

      const { status, body } = await exchangeGoogleToken({ idToken });

      if (status === 428 && body.needsProfileCompletion) {
        setGoogleProfileForm((prev) => ({
          ...prev,
          username: body.suggested?.username ?? prev.username,
        }));
        setShowGoogleProfileModal(true);
        return;
      }

      if (status >= 400 || !body.token) {
        setError(body.message || "Google login failed. Please try again.");
        return;
      }

      setAuthToken(body.token);
      navigate("/home");
    } catch {
      setError("Google login failed. Please try again.");
    } finally {
      setIsGooglePending(false);
    }
  };

  const submitGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsGooglePending(true);
    try {
      const { status, body } = await exchangeGoogleToken({
        idToken: googleIdToken,
        username: googleProfileForm.username,
        freefireUid: googleProfileForm.freefireUid,
        ign: googleProfileForm.ign || undefined,
        gender: (googleProfileForm.gender as "male" | "female" | "other") || undefined,
      });

      if (status >= 400 || !body.token) {
        setError(body.message || "Could not complete Google sign up.");
        return;
      }

      setShowGoogleProfileModal(false);
      setAuthToken(body.token);
      navigate("/home");
    } finally {
      setIsGooglePending(false);
    }
  };

  return (
    <>
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
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isGooglePending}
                className="btn-brutal w-full py-3 bg-white text-black text-sm disabled:opacity-60"
              >
                {isGooglePending ? "CONNECTING GOOGLE..." : "CONTINUE WITH GOOGLE"}
              </button>

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
    {showGoogleProfileModal && (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white border-4 border-black shadow-[8px_8px_0_#000]">
          <div className="bg-black px-5 py-3">
            <div className="display-font text-2xl text-[#FFE600]">COMPLETE YOUR PROFILE</div>
          </div>
          <form onSubmit={submitGoogleProfile} className="p-5 space-y-3">
            <div>
              <label className="section-label block mb-1">USERNAME *</label>
              <input
                type="text"
                required
                minLength={3}
                maxLength={30}
                value={googleProfileForm.username}
                onChange={setGoogleField("username")}
                className="w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="section-label block mb-1">FREE FIRE UID *</label>
              <input
                type="text"
                required
                value={googleProfileForm.freefireUid}
                onChange={setGoogleField("freefireUid")}
                className="w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="section-label block mb-1">IGN</label>
              <input
                type="text"
                value={googleProfileForm.ign}
                onChange={setGoogleField("ign")}
                className="w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00]"
              />
            </div>
            <div>
              <label className="section-label block mb-1">GENDER</label>
              <select
                value={googleProfileForm.gender}
                onChange={setGoogleField("gender")}
                className="w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00]"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={isGooglePending}
              className="btn-brutal w-full py-3 bg-[#FF6B00] text-white text-sm disabled:opacity-60"
            >
              {isGooglePending ? "SAVING..." : "CONTINUE"}
            </button>
          </form>
        </div>
      </div>
    )}
    </>
  );
}
