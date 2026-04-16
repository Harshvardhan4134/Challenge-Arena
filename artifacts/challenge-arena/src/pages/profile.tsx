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
  const [form, setForm] = useState({ freefireUid: "", ign: "", gender: "" });

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
    setForm({ freefireUid: u?.freefireUid || "", ign: u?.ign || "", gender: u?.gender || "" });
    setEditing(true);
  };

  const handleSave = () => {
    if (!userId) return;
    updateUser.mutate({
      userId,
      data: {
        freefireUid: form.freefireUid || undefined,
        ign: form.ign || undefined,
        gender: (form.gender as "male" | "female" | "other") || undefined,
      },
    });
  };

  const u = user.data;
  const s = stats.data;

  const OUTCOME_COLORS: Record<string, string> = {
    win: "text-green-400",
    loss: "text-destructive",
    disputed: "text-muted-foreground",
  };

  if (user.isLoading) {
    return <Layout><div className="py-8 text-center text-muted-foreground text-sm">Loading...</div></Layout>;
  }

  return (
    <Layout>
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {!isOwnProfile && (
            <button onClick={() => navigate(-1)} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl font-black">{isOwnProfile ? "My Profile" : u?.username}</h1>
            <div className="text-xs font-mono text-muted-foreground mt-0.5">
              {isOwnProfile ? "YOUR STATS & INFO" : "PLAYER PROFILE"}
            </div>
          </div>
          {isOwnProfile && !editing && (
            <button onClick={startEdit} className="p-2 border border-border rounded text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
              <Edit2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Profile card */}
        <div className="border border-border rounded-lg bg-card p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-lg font-black">{u?.username}</div>
              {u?.ign && <div className="text-sm text-primary font-mono">{u.ign}</div>}
              {u?.freefireUid && <div className="text-xs text-muted-foreground font-mono mt-0.5 flex items-center gap-1"><Hash className="w-3 h-3" />{u.freefireUid}</div>}
              {u?.gender && <div className="text-xs text-muted-foreground capitalize mt-0.5">{u.gender}</div>}
            </div>
            <div className="text-xs font-mono text-muted-foreground/50">
              Joined {new Date(u?.createdAt ?? "").toLocaleDateString()}
            </div>
          </div>

          {editing && isOwnProfile && (
            <div className="border-t border-border pt-3 space-y-2">
              <input
                type="text"
                value={form.freefireUid}
                onChange={e => setForm(f => ({ ...f, freefireUid: e.target.value }))}
                placeholder="Free Fire UID"
                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                type="text"
                value={form.ign}
                onChange={e => setForm(f => ({ ...f, ign: e.target.value }))}
                placeholder="In-Game Name (IGN)"
                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={form.gender}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                className="w-full px-3 py-2 bg-background border border-input rounded text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
              <div className="flex gap-2">
                <button onClick={handleSave} disabled={updateUser.isPending} className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-primary text-primary-foreground rounded text-sm font-bold hover:opacity-90 disabled:opacity-60">
                  <Save className="w-3.5 h-3.5" />
                  {updateUser.isPending ? "Saving..." : "Save"}
                </button>
                <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 py-2 px-4 border border-border rounded text-sm hover:bg-muted transition-colors">
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        {s && (
          <div>
            <div className="text-xs font-mono text-muted-foreground mb-2">STATS</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Matches", value: s.matchesPlayed, icon: Target, color: "text-foreground" },
                { label: "Wins", value: s.wins, icon: Trophy, color: "text-primary" },
                { label: "Losses", value: s.losses, icon: null, color: "text-destructive" },
                { label: "Win Streak", value: s.winStreak, icon: Flame, color: "text-accent" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="border border-border rounded-lg bg-card p-3 flex items-center gap-2">
                  {Icon && <Icon className={`w-4 h-4 ${color} shrink-0`} />}
                  <div>
                    <div className={`text-lg font-black font-mono ${color}`}>{value}</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-2 border border-border rounded-lg bg-card p-3">
              <div className="text-xs text-muted-foreground">Weekly Wins</div>
              <div className="text-2xl font-black text-primary font-mono">{s.weeklyWins}</div>
            </div>
          </div>
        )}

        {/* Match History */}
        <div>
          <div className="text-xs font-mono text-muted-foreground mb-2">MATCH HISTORY</div>
          {history.isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <div key={i} className="h-14 rounded border border-border bg-card animate-pulse" />)}
            </div>
          ) : history.data?.length === 0 ? (
            <div className="text-center py-8 border border-border rounded-lg bg-card text-muted-foreground text-sm">
              No match history yet.
            </div>
          ) : (
            <div className="space-y-2">
              {history.data?.map(match => (
                <button
                  key={match.challengeId}
                  onClick={() => navigate(`/challenges/${match.challengeId}`)}
                  className="w-full flex items-center gap-3 p-3 rounded border border-border bg-card hover:border-primary/30 transition-all text-left"
                >
                  <div className={`text-xs font-mono font-black w-8 ${OUTCOME_COLORS[match.outcome]}`}>
                    {match.outcome.toUpperCase().slice(0, 3)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold truncate">{match.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {match.mode} {match.opponent && `· vs ${match.opponent}`}
                    </div>
                  </div>
                  <div className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(match.playedAt).toLocaleDateString()}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Logout (own profile only) */}
        {isOwnProfile && (
          <button
            onClick={() => logoutMutation.mutate({})}
            className="w-full flex items-center justify-center gap-2 py-2.5 border border-destructive/40 text-destructive rounded hover:bg-destructive/10 transition-colors text-sm font-medium"
          >
            <LogOut className="w-4 h-4" />
            Log Out
          </button>
        )}
      </motion.div>
    </Layout>
  );
}
