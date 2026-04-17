import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import {
  useGetMe, useGetUser, useGetUserStats, useGetUserMatchHistory, useUpdateUser, useLogout,
  getGetMeQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { clearAuthToken } from "@/lib/auth";
import { apiUrl } from "@/lib/api-url";
import { ArrowLeft, Edit2, Save, X, Trophy, Target, Flame, Hash, LogOut } from "lucide-react";

export default function Profile() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const [, params] = useRoute("/profile/:id");
  const profileId = params?.id;

  const me = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const isOwnProfile = profileId === "me" || profileId === me.data?.id;
  const userId = isOwnProfile ? me.data?.id : profileId;

  const user = isOwnProfile ? me : useGetUser(userId ?? "", { query: { enabled: !!userId && !isOwnProfile, queryKey: ["getUser", userId] } });
  const stats = useGetUserStats(userId ?? "", { query: { enabled: !!userId, queryKey: ["getUserStats", userId] } });
  const history = useGetUserMatchHistory(userId ?? "", { query: { enabled: !!userId, queryKey: ["getUserMatchHistory", userId] } });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ email: "", whatsappPhone: "", freefireUid: "", ign: "", gender: "" });
  const [lookupRegion, setLookupRegion] = useState("IND");
  const [lookupError, setLookupError] = useState("");
  const [lookupSuccess, setLookupSuccess] = useState("");
  const [isFetchingIgn, setIsFetchingIgn] = useState(false);

  const updateUser = useUpdateUser({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setEditing(false);
      },
    },
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        clearAuthToken();
        navigate("/");
      },
    },
  });

  const startEdit = () => {
    const u = user.data;
    setForm({
      email: u?.email || "",
      whatsappPhone: u?.whatsappPhone || "",
      freefireUid: u?.freefireUid || "",
      ign: u?.ign || "",
      gender: u?.gender || "",
    });
    setLookupError("");
    setLookupSuccess("");
    setEditing(true);
  };

  const fetchIgnFromUid = async () => {
    setLookupError("");
    setLookupSuccess("");
    const uid = form.freefireUid.trim();
    if (!uid) {
      setLookupError("Enter Free Fire UID first.");
      return;
    }

    setIsFetchingIgn(true);
    try {
      const res = await fetch(
        apiUrl(`/api/freefire/profile?uid=${encodeURIComponent(uid)}&region=${encodeURIComponent(lookupRegion)}`),
      );
      const body = await res.json();
      if (!res.ok || !body?.ign) {
        setLookupError(body?.message || "Could not fetch IGN for this UID.");
        return;
      }
      setForm((prev) => ({ ...prev, ign: String(body.ign) }));
      setLookupSuccess(`Fetched IGN: ${body.ign}`);
    } catch {
      setLookupError("Profile lookup failed. Please try again.");
    } finally {
      setIsFetchingIgn(false);
    }
  };

  const handleSave = () => {
    if (!userId) return;
    updateUser.mutate({
      userId,
      data: {
        email: form.email.trim() || null,
        whatsappPhone: form.whatsappPhone.trim() || null,
        freefireUid: form.freefireUid || undefined,
        ign: form.ign || undefined,
        gender: (form.gender as "male" | "female" | "other") || undefined,
      },
    });
  };

  const u = user.data;
  const s = stats.data;

  const OUTCOME_STYLE: Record<string, { label: string; cls: string }> = {
    win: { label: "WIN", cls: "bg-[#00854B] text-white" },
    loss: { label: "LOSS", cls: "bg-[#FF1E56] text-white" },
    disputed: { label: "??", cls: "bg-gray-400 text-white" },
  };

  if (user.isLoading) {
    return <Layout><div className="py-8 text-center font-black text-gray-600">LOADING...</div></Layout>;
  }

  const inputCls = "w-full px-3 py-2.5 bg-white border-2 border-black text-sm font-bold focus:outline-none focus:border-[#FF6B00] transition-colors placeholder:font-normal placeholder:text-gray-400";

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {!isOwnProfile && (
            <button onClick={() => navigate(-1 as any)} className="text-black hover:text-[#FF6B00]">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <div className="tag-orange inline-block mb-1">{isOwnProfile ? "YOUR STATS & INFO" : "PLAYER PROFILE"}</div>
            <div className="display-font text-4xl leading-none">{isOwnProfile ? "MY PROFILE" : u?.username?.toUpperCase()}</div>
          </div>
          {isOwnProfile && !editing && (
            <button onClick={startEdit} className="btn-brutal p-2 bg-white text-black">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Profile card */}
        <div className="card-brutal overflow-hidden">
          <div className="bg-black px-5 py-3">
            <div className="text-[#FFE600] font-black text-lg">{u?.username}</div>
            {u?.ign && <div className="text-[#FF6B00] text-xs font-mono mt-0.5">{u.ign}</div>}
          </div>
          <div className="bg-white p-4">
            {u?.freefireUid && (
              <div className="flex items-center gap-1.5 text-xs font-mono text-gray-600 mb-1">
                <Hash className="w-3 h-3" />
                UID: {u.freefireUid}
              </div>
            )}
            {u?.gender && <div className="text-xs font-mono text-gray-500 capitalize">{u.gender}</div>}
            {u?.email && !editing && (
              <div className="text-xs font-mono text-gray-600 mt-1">Email: {u.email}</div>
            )}
            {u?.whatsappPhone && !editing && (
              <div className="text-xs font-mono text-gray-600 mt-1">WhatsApp: {u.whatsappPhone}</div>
            )}
            <div className="text-[10px] font-mono text-gray-400 mt-2">
              JOINED {new Date(u?.createdAt ?? "").toLocaleDateString()}
            </div>

            {editing && isOwnProfile && (
              <div className="border-t-2 border-black mt-3 pt-3 space-y-2">
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email (for match alerts)" className={inputCls} />
                <input type="tel" value={form.whatsappPhone} onChange={e => setForm(f => ({ ...f, whatsappPhone: e.target.value }))} placeholder="WhatsApp with country code" className={inputCls} />
                <input type="text" value={form.freefireUid} onChange={e => setForm(f => ({ ...f, freefireUid: e.target.value }))} placeholder="Free Fire UID" className={inputCls} />
                <div className="flex gap-2">
                  <select
                    value={lookupRegion}
                    onChange={e => setLookupRegion(e.target.value)}
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
                {lookupError && <p className="text-[10px] font-bold text-[#FF1E56]">{lookupError}</p>}
                {lookupSuccess && <p className="text-[10px] font-bold text-[#00854B]">{lookupSuccess}</p>}
                <input type="text" value={form.ign} onChange={e => setForm(f => ({ ...f, ign: e.target.value }))} placeholder="In-Game Name (IGN)" className={inputCls} />
                <select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))} className={inputCls}>
                  <option value="">Prefer not to say</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
                <div className="flex gap-2">
                  <button onClick={handleSave} disabled={updateUser.isPending} className="btn-brutal flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#FF6B00] text-white text-xs disabled:opacity-60">
                    <Save className="w-3.5 h-3.5" />
                    {updateUser.isPending ? "SAVING..." : "SAVE"}
                  </button>
                  <button onClick={() => setEditing(false)} className="btn-brutal flex items-center gap-1.5 py-2 px-4 bg-white text-black text-xs">
                    <X className="w-3.5 h-3.5" />
                    CANCEL
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {s && (
          <div>
            <div className="section-label mb-2">STATS</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "MATCHES", value: s.matchesPlayed, icon: Target, style: { backgroundColor: "#000000", color: "#FFE600" } },
                { label: "WINS", value: s.wins, icon: Trophy, style: { backgroundColor: "#FF6B00", color: "#FFFFFF" } },
                { label: "LOSSES", value: s.losses, icon: null, style: { backgroundColor: "#FF1E56", color: "#FFFFFF" } },
                { label: "WIN STREAK", value: s.winStreak, icon: Flame, style: { backgroundColor: "#00854B", color: "#FFFFFF" } },
              ].map(({ label, value, icon: Icon, style }) => (
                <div key={label} className="card-brutal-sm p-3 flex items-center gap-2" style={style}>
                  {Icon && <Icon className="w-5 h-5 shrink-0" />}
                  <div>
                    <div className="display-font text-4xl leading-none">{value}</div>
                    <div className="text-[9px] font-black font-mono tracking-wider mt-0.5 opacity-80">{label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="card-brutal-sm mt-2 p-3 bg-[#FFE600]">
              <div className="section-label">WEEKLY WINS</div>
              <div className="display-font text-5xl">{s.weeklyWins}</div>
            </div>
          </div>
        )}

        {/* Match History */}
        <div>
          <div className="section-label mb-2">MATCH HISTORY</div>
          {history.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 border-2 border-black bg-white animate-pulse" />)}
            </div>
          ) : history.data?.length === 0 ? (
            <div className="card-brutal p-8 text-center bg-white">
              <p className="font-black text-sm text-gray-600">NO MATCH HISTORY YET.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.data?.map(match => {
                const outcomeStyle = OUTCOME_STYLE[match.outcome] || OUTCOME_STYLE.disputed;
                return (
                  <button
                    key={match.challengeId}
                    onClick={() => navigate(`/challenges/${match.challengeId}`)}
                    className="w-full card-brutal-sm overflow-hidden text-left hover:shadow-[4px_4px_0_#000] transition-shadow"
                  >
                    <div className="flex items-stretch">
                      <div className={`${outcomeStyle.cls} w-14 flex items-center justify-center font-black font-mono text-xs shrink-0`} style={{ borderRight: "2px solid #000" }}>
                        {outcomeStyle.label}
                      </div>
                      <div className="bg-white flex-1 px-3 py-2">
                        <div className="font-black text-sm truncate">{match.title}</div>
                        <div className="text-xs font-mono text-gray-500 mt-0.5">
                          {match.mode} {match.opponent && `· vs ${match.opponent}`}
                          <span className="ml-2">{new Date(match.playedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Logout */}
        {isOwnProfile && (
          <button
            onClick={() => logoutMutation.mutate({})}
            className="btn-brutal w-full flex items-center justify-center gap-2 py-3 bg-[#FF1E56] text-white text-sm"
          >
            <LogOut className="w-4 h-4" />
            LOG OUT
          </button>
        )}
      </motion.div>
    </Layout>
  );
}
