import { useState } from "react";
import { useLocation } from "wouter";
import { useRegister } from "@workspace/api-client-react";
import { setAuthToken } from "@/lib/auth";
import { firebaseAuth, googleProvider, isFirebaseConfigured } from "@/lib/firebase";
import { exchangeGoogleToken } from "@/lib/google-auth";
import { fetchIgnForUid } from "@/lib/freefire-lookup";
import { getPostAuthPath } from "@/lib/redirect-after-auth";
import { hasEnoughWhatsappDigits } from "@/lib/whatsapp-valid";
import { signInWithPopup } from "firebase/auth";
import { Swords, Eye, EyeOff, Mail, Lock, Gamepad2, Hash, Phone } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ password: "", email: "", whatsappPhone: "", freefireUid: "", ign: "", gender: "" });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [isFetchingIgn, setIsFetchingIgn] = useState(false);
  const [lookupRegion, setLookupRegion] = useState("IND");
  const [googleIdToken, setGoogleIdToken] = useState("");
  const [isGooglePending, setIsGooglePending] = useState(false);
  const [showGoogleProfileModal, setShowGoogleProfileModal] = useState(false);
  const [googleLookupRegion, setGoogleLookupRegion] = useState("IND");
  const [googleLookupError, setGoogleLookupError] = useState("");
  const [isFetchingGoogleIgn, setIsFetchingGoogleIgn] = useState(false);
  const [googleProfileForm, setGoogleProfileForm] = useState({
    username: "",
    freefireUid: "",
    ign: "",
    gender: "",
    whatsappPhone: "",
  });
  const [googleNeedsWhatsappOnly, setGoogleNeedsWhatsappOnly] = useState(false);

  const { mutate, isPending } = useRegister({
    mutation: {
      onSuccess: (data) => {
        setAuthToken(data.token);
        navigate(getPostAuthPath());
      },
      onError: (err: any) => {
        setError(err?.data?.message || "Registration failed. Try a different username.");
      },
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const wa = form.whatsappPhone.trim();
    if (!hasEnoughWhatsappDigits(wa)) {
      setError("Enter a valid WhatsApp number with country code (at least 10 digits).");
      return;
    }
    mutate({
      data: {
        username: form.ign.trim(),
        password: form.password,
        email: form.email || undefined,
        whatsappPhone: wa,
        freefireUid: form.freefireUid,
        ign: form.ign.trim() || undefined,
        gender: (form.gender as "male" | "female" | "other") || undefined,
      },
    });
  };

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const handleFreefireUidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uid = e.target.value;
    setForm((prev) => ({ ...prev, freefireUid: uid }));
  };

  const fetchIgnFromUid = async () => {
    setLookupError("");
    const uid = form.freefireUid.trim();
    if (!uid) {
      setLookupError("Enter Free Fire UID first.");
      return;
    }
    setIsFetchingIgn(true);
    try {
      const ign = await fetchIgnForUid(uid, lookupRegion);
      setForm((prev) => ({ ...prev, ign }));
    } catch (error) {
      setLookupError(
        error instanceof Error
          ? `${error.message} If UID lookup keeps failing, type your exact in-game name (IGN) below — it will be used as your username.`
          : "Could not verify UID right now. Enter your exact in-game name (IGN) below — it will be used as your username.",
      );
    } finally {
      setIsFetchingIgn(false);
    }
  };

  const fetchIgnForGoogleProfile = async () => {
    setGoogleLookupError("");
    const uid = googleProfileForm.freefireUid.trim();
    if (!uid) {
      setGoogleLookupError("Enter Free Fire UID first.");
      return;
    }
    setIsFetchingGoogleIgn(true);
    try {
      const ign = await fetchIgnForUid(uid, googleLookupRegion);
      setGoogleProfileForm((prev) => ({ ...prev, ign, username: ign }));
    } catch (error) {
      setGoogleLookupError(
        error instanceof Error
          ? `${error.message} If UID lookup keeps failing, type your IGN below.`
          : "Could not verify UID. Type your exact in-game name (IGN) below.",
      );
    } finally {
      setIsFetchingGoogleIgn(false);
    }
  };

  const setGoogleField = (k: "username" | "freefireUid" | "ign" | "gender" | "whatsappPhone") =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setGoogleProfileForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleGoogleSignup = async () => {
    setError("");
    if (!isFirebaseConfigured() || !firebaseAuth || !googleProvider) {
      setError("Google sign up is not configured yet. Ask admin to add Firebase env keys.");
      return;
    }
    setIsGooglePending(true);
    try {
      const cred = await signInWithPopup(firebaseAuth, googleProvider);
      const idToken = await cred.user.getIdToken();
      setGoogleIdToken(idToken);

      const { status, body } = await exchangeGoogleToken({ idToken });

      if (status === 428 && body.needsProfileCompletion) {
        setGoogleNeedsWhatsappOnly(!!body.needsWhatsappOnly);
        setGoogleProfileForm((prev) => ({
          ...prev,
          username: body.suggested?.username ?? prev.username,
        }));
        setShowGoogleProfileModal(true);
        return;
      }

      if (status >= 400 || !body.token) {
        setError(body.message || "Google sign up failed. Please try again.");
        return;
      }

      setAuthToken(body.token);
      navigate(getPostAuthPath());
    } catch {
      setError("Google sign up failed. Please try again.");
    } finally {
      setIsGooglePending(false);
    }
  };

  const submitGoogleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const wa = googleProfileForm.whatsappPhone.trim();
    if (!hasEnoughWhatsappDigits(wa)) {
      setError("Enter a valid WhatsApp number with country code (at least 10 digits).");
      return;
    }
    setIsGooglePending(true);
    try {
      const { status, body } = await exchangeGoogleToken(
        googleNeedsWhatsappOnly
          ? { idToken: googleIdToken, whatsappPhone: wa }
          : {
              idToken: googleIdToken,
              username: googleProfileForm.ign.trim() || googleProfileForm.username.trim(),
              freefireUid: googleProfileForm.freefireUid,
              ign: googleProfileForm.ign.trim() || undefined,
              gender: (googleProfileForm.gender as "male" | "female" | "other") || undefined,
              whatsappPhone: wa,
            },
      );

      if (status >= 400 || !body.token) {
        setError(body.message || "Could not complete Google sign up.");
        return;
      }

      setShowGoogleProfileModal(false);
      setGoogleNeedsWhatsappOnly(false);
      setAuthToken(body.token);
      navigate(getPostAuthPath());
    } finally {
      setIsGooglePending(false);
    }
  };

  return (
    <>
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
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={isGooglePending}
                className="btn-brutal w-full py-3 bg-white text-black text-sm mb-4 disabled:opacity-60"
              >
                {isGooglePending ? "CONNECTING GOOGLE..." : "SIGN UP WITH GOOGLE"}
              </button>

              {/* SECTION: Account */}
              <div className="mb-4">
                <div className="bg-black text-[#FFE600] text-[10px] font-black font-mono tracking-widest px-3 py-1.5 mb-3">
                  ACCOUNT DETAILS
                </div>

                <div className="space-y-3">
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

                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <Phone className="w-3.5 h-3.5 text-[#FF6B00]" />
                      WHATSAPP (MATCH ALERTS) *
                    </label>
                    <input
                      type="tel"
                      value={form.whatsappPhone}
                      onChange={set("whatsappPhone")}
                      required
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="+91… or country code + number"
                      autoComplete="tel"
                    />
                    <p className="text-[10px] font-mono text-gray-500 mt-1">Used for WhatsApp updates when your provider (e.g. Twilio) is configured.</p>
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
                      onChange={handleFreefireUidChange}
                      required
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="Enter your UID (required)"
                    />
                    <div className="flex gap-2 mt-2">
                      <select
                        value={lookupRegion}
                        onChange={(e) => setLookupRegion(e.target.value)}
                        className="px-2 py-2 bg-white border-2 border-black text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                      >
                        <option value="IND">IND</option>
                        <option value="SG">SG</option>
                        <option value="BR">BR</option>
                      </select>
                      <button
                        type="button"
                        onClick={fetchIgnFromUid}
                        disabled={isFetchingIgn}
                        className="btn-brutal px-3 py-2 bg-white text-black text-[10px] disabled:opacity-60"
                      >
                        {isFetchingIgn ? "FETCHING..." : "FETCH IGN FROM UID"}
                      </button>
                    </div>
                    {lookupError && (
                      <p className="text-[10px] font-bold text-[#FF1E56] mt-1">{lookupError}</p>
                    )}
                    <p className="text-[10px] font-mono text-gray-600 mt-1.5 leading-relaxed border-l-2 border-[#FF6B00] pl-2">
                      Having UID or fetch issues? No problem — enter your exact <strong>in-game name (IGN)</strong> in the field below. That name is your account username.
                    </p>
                  </div>

                  {/* IGN */}
                  <div>
                    <label className="flex items-center gap-1.5 text-black text-xs font-black mb-1">
                      <Gamepad2 className="w-3.5 h-3.5 text-[#FF6B00]" />
                      IN-GAME NAME (IGN) *
                    </label>
                    <input
                      type="text"
                      value={form.ign}
                      onChange={set("ign")}
                      required
                      minLength={3}
                      maxLength={30}
                      className="w-full px-3 py-2.5 bg-white border-2 border-black text-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] placeholder:text-gray-400 placeholder:font-normal"
                      placeholder="Your exact Free Fire in-game name"
                    />
                    <p className="text-[10px] font-mono text-gray-500 mt-1">
                      Your Free Fire in-game name is used as account username.
                    </p>
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
                onClick={() => navigate(`/login${window.location.search}`)}
                className="font-black text-[#FF6B00] underline hover:text-black transition-colors"
              >
                LOG IN
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
          <form onSubmit={submitGoogleProfile} className="p-5 space-y-3" noValidate={googleNeedsWhatsappOnly}>
            {googleNeedsWhatsappOnly && (
              <p className="text-xs font-bold text-gray-700 border-l-2 border-[#FF6B00] pl-2">
                Add your WhatsApp number for <span className="font-mono">{googleProfileForm.username || "your account"}</span> to finish signing in.
              </p>
            )}
            {!googleNeedsWhatsappOnly && (
              <>
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
                  <div className="flex gap-2 mt-2">
                    <select
                      value={googleLookupRegion}
                      onChange={(e) => setGoogleLookupRegion(e.target.value)}
                      className="px-2 py-2 bg-white border-2 border-black text-xs font-bold focus:outline-none focus:border-[#FF6B00]"
                    >
                      <option value="IND">IND</option>
                      <option value="SG">SG</option>
                      <option value="BR">BR</option>
                    </select>
                    <button
                      type="button"
                      onClick={fetchIgnForGoogleProfile}
                      disabled={isFetchingGoogleIgn}
                      className="btn-brutal px-3 py-2 bg-white text-black text-[10px] disabled:opacity-60"
                    >
                      {isFetchingGoogleIgn ? "FETCHING..." : "FETCH IGN FROM UID"}
                    </button>
                  </div>
                  {googleLookupError && (
                    <p className="text-[10px] font-bold text-[#FF1E56] mt-1">{googleLookupError}</p>
                  )}
                  <p className="text-[10px] font-mono text-gray-600 mt-1.5 leading-relaxed border-l-2 border-[#FF6B00] pl-2">
                    UID lookup broken? Enter your exact <strong>IGN</strong> next — we use it as your username.
                  </p>
                </div>
                <div>
                  <label className="section-label block mb-1">IGN *</label>
                  <input
                    type="text"
                    required
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
              </>
            )}
            <div>
              <label className="section-label block mb-1">WHATSAPP (MATCH ALERTS) *</label>
              <input
                type="tel"
                required
                value={googleProfileForm.whatsappPhone}
                onChange={setGoogleField("whatsappPhone")}
                className="w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00]"
                placeholder="+country code and number"
              />
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
