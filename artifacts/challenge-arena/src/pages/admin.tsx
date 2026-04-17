import { useState } from "react";
import { useLocation } from "wouter";
import {
  useGetMe,
  useGetAdminOverview,
  useGetAdminUsers,
  useGetAdminChallenges,
  useGetAdminNotifications,
  useGetAdminMatchResults,
  useGetAdminPushSubscriptions,
} from "@workspace/api-client-react";
import Layout from "@/components/Layout";
import { cn } from "@/lib/utils";

type Tab = "overview" | "users" | "challenges" | "notifications" | "results" | "push";

export default function AdminPage() {
  const [, navigate] = useLocation();
  const me = useGetMe({ query: { queryKey: ["getMe"] } });
  const isAdmin = Boolean(me.data?.isAdmin);

  const overview = useGetAdminOverview({
    query: { queryKey: ["adminOverview"], enabled: isAdmin },
  });
  const users = useGetAdminUsers({
    query: { queryKey: ["adminUsers"], enabled: isAdmin },
  });
  const challenges = useGetAdminChallenges({
    query: { queryKey: ["adminChallenges"], enabled: isAdmin },
  });
  const notifications = useGetAdminNotifications({
    query: { queryKey: ["adminNotifications"], enabled: isAdmin },
  });
  const matchResults = useGetAdminMatchResults({
    query: { queryKey: ["adminMatchResults"], enabled: isAdmin },
  });
  const pushSubs = useGetAdminPushSubscriptions({
    query: { queryKey: ["adminPushSubscriptions"], enabled: isAdmin },
  });

  const [tab, setTab] = useState<Tab>("overview");

  if (me.isLoading) {
    return (
      <Layout>
        <div className="py-12 text-center font-black text-black">LOADING...</div>
      </Layout>
    );
  }

  if (!me.data) {
    return (
      <Layout>
        <div className="py-8 space-y-3">
          <p className="font-black text-black">Sign in to continue.</p>
          <button type="button" className="btn-brutal px-4 py-2 bg-black text-[#FFE600] text-sm" onClick={() => navigate("/login")}>
            LOG IN
          </button>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="py-8 space-y-3 card-brutal bg-white p-4 border-[#FF1E56]">
          <div className="text-[10px] font-black font-mono text-[#FF1E56]">ACCESS DENIED</div>
          <p className="text-sm font-bold text-black">
            This area is for platform administrators only. On your API host (e.g. Render), set{" "}
            <code className="text-xs bg-gray-100 px-1">ADMIN_EMAILS</code> or put emails in{" "}
            <code className="text-xs bg-gray-100 px-1">ADMIN_USERNAMES</code> (entries with @ count as email). Your Firestore user must have the same email — open Profile and save your email, or sign out and sign in with Google again so it syncs. You can also set{" "}
            <code className="text-xs bg-gray-100 px-1">isAdmin: true</code> on your user document in Firestore.
          </p>
          <button type="button" className="btn-brutal px-4 py-2 bg-[#FF6B00] text-white text-sm" onClick={() => navigate("/home")}>
            BACK TO HOME
          </button>
        </div>
      </Layout>
    );
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "OVERVIEW" },
    { id: "users", label: "USERS" },
    { id: "challenges", label: "MATCHES" },
    { id: "notifications", label: "ALERTS" },
    { id: "results", label: "RESULTS" },
    { id: "push", label: "PUSH" },
  ];

  const err =
    overview.error || users.error || challenges.error || notifications.error || matchResults.error || pushSubs.error;

  return (
    <Layout>
      <div className="py-4 space-y-4">
        <div>
          <div className="tag-orange inline-block mb-1">ADMIN</div>
          <h1 className="display-font text-3xl text-black leading-none">PLATFORM DATA</h1>
          <p className="text-[10px] font-mono text-gray-600 mt-2">
            Full read-only view of users, matches, notifications, and submissions. No passwords are exposed.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 border-2 border-black p-1 bg-white">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-2 py-1.5 text-[10px] font-black font-mono border-2 border-black",
                tab === t.id ? "bg-black text-[#FFE600]" : "bg-white text-black hover:bg-[#FFE600]/40",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {err && (
          <div className="border-2 border-[#FF1E56] bg-[#FF1E56]/10 px-3 py-2 text-xs font-bold text-[#FF1E56]">
            Could not load admin data. Check that you are on the latest API deployment.
          </div>
        )}

        {tab === "overview" && (
          <div className="space-y-3">
            {overview.isLoading && <p className="text-xs font-mono">Loading overview…</p>}
            {overview.data && (
              <>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {[
                    ["Users", overview.data.usersTotal],
                    ["Challenges", overview.data.challengesTotal],
                    ["Teams", overview.data.teamsTotal],
                    ["Team members", overview.data.teamMembersTotal],
                    ["Chat messages", overview.data.messagesTotal],
                    ["Notifications", overview.data.notificationsTotal],
                    ["Unread notif.", overview.data.unreadNotifications],
                    ["Match results", overview.data.matchResultsTotal],
                    ["Push devices", overview.data.pushSubscriptionsTotal],
                  ].map(([label, val]) => (
                    <div key={String(label)} className="card-brutal-sm bg-white p-3 border-2 border-black">
                      <div className="text-[9px] font-black font-mono text-gray-500">{label}</div>
                      <div className="display-font text-2xl text-black">{val}</div>
                    </div>
                  ))}
                </div>
                <div className="card-brutal bg-white p-3">
                  <div className="text-[10px] font-black font-mono mb-2">CHALLENGES BY STATUS</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(overview.data.challengesByStatus).map(([k, v]) => (
                      <span key={k} className="tag-black text-[10px]">
                        {k}: {v}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="card-brutal bg-white p-3">
                  <div className="text-[10px] font-black font-mono mb-2">RECENT SIGNUPS</div>
                  <ul className="space-y-1 text-xs font-mono">
                    {overview.data.recentUsers.map((u) => (
                      <li key={u.id} className="flex justify-between gap-2 border-b border-gray-100 pb-1">
                        <span className="font-bold truncate">{u.username}</span>
                        <span className="text-gray-500 shrink-0">{new Date(u.createdAt).toLocaleString()}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        )}

        {tab === "users" && (
          <div className="overflow-x-auto border-2 border-black bg-white">
            {users.isLoading && <p className="p-3 text-xs">Loading users…</p>}
            {users.data && (
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-black text-[#FFE600] sticky top-0">
                  <tr>
                    {[
                      "username",
                      "id",
                      "email",
                      "whatsapp",
                      "UID",
                      "IGN",
                      "gender",
                      "admin",
                      "joined",
                      "W/L/MP",
                    ].map((h) => (
                      <th key={h} className="p-2 font-black border-r border-[#FFE600]/30 last:border-0 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((u) => (
                    <tr key={u.id} className="border-t border-gray-200 hover:bg-[#FFE600]/20">
                      <td className="p-2 font-bold text-black whitespace-nowrap">{u.username}</td>
                      <td className="p-2 max-w-[120px] truncate" title={u.id}>
                        {u.id}
                      </td>
                      <td className="p-2 max-w-[100px] truncate">{u.email ?? "—"}</td>
                      <td className="p-2 max-w-[90px] truncate">{u.whatsappPhone ?? "—"}</td>
                      <td className="p-2 max-w-[80px] truncate">{u.freefireUid ?? "—"}</td>
                      <td className="p-2 max-w-[80px] truncate">{u.ign ?? "—"}</td>
                      <td className="p-2">{u.gender ?? "—"}</td>
                      <td className="p-2">{u.isAdmin ? "yes" : "—"}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(u.createdAt).toLocaleString()}</td>
                      <td className="p-2 whitespace-nowrap">
                        {u.stats ? `${u.stats.wins}/${u.stats.losses}/${u.stats.matchesPlayed}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "challenges" && (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {challenges.isLoading && <p className="text-xs">Loading matches…</p>}
            {challenges.data?.map((c) => (
              <details key={c.id} className="card-brutal bg-white border-2 border-black open:border-[#FF6B00]">
                <summary className="p-3 cursor-pointer list-none font-black text-sm text-black flex flex-wrap gap-2 items-center">
                  <span>{c.title}</span>
                  <span className="tag-orange text-[9px]">{c.status}</span>
                  <span className="text-[9px] font-mono text-gray-500">{c.mode}</span>
                  <span className="text-[9px] font-mono ml-auto">{new Date(c.scheduledAt).toLocaleString()}</span>
                </summary>
                <pre className="p-3 pt-0 text-[9px] font-mono overflow-x-auto border-t-2 border-gray-100 bg-gray-50 max-h-64 overflow-y-auto">
                  {JSON.stringify(c, null, 2)}
                </pre>
              </details>
            ))}
          </div>
        )}

        {tab === "notifications" && (
          <div className="overflow-x-auto border-2 border-black bg-white max-h-[70vh] overflow-y-auto">
            {notifications.isLoading && <p className="p-3 text-xs">Loading…</p>}
            {notifications.data && (
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-black text-[#FFE600] sticky top-0">
                  <tr>
                    {["type", "userId", "read", "title", "challengeId", "created"].map((h) => (
                      <th key={h} className="p-2 font-black border-r border-[#FFE600]/30">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {notifications.data.map((n) => (
                    <tr key={n.id} className="border-t border-gray-200">
                      <td className="p-2 whitespace-nowrap">{n.type}</td>
                      <td className="p-2 max-w-[100px] truncate" title={n.userId}>
                        {n.userId}
                      </td>
                      <td className="p-2">{n.isRead ? "Y" : "N"}</td>
                      <td className="p-2 max-w-[140px] truncate" title={n.title}>
                        {n.title}
                      </td>
                      <td className="p-2 max-w-[80px] truncate">{n.challengeId ?? "—"}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(n.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "results" && (
          <div className="overflow-x-auto border-2 border-black bg-white max-h-[70vh] overflow-y-auto">
            {matchResults.isLoading && <p className="p-3 text-xs">Loading…</p>}
            {matchResults.data && (
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-black text-[#FFE600] sticky top-0">
                  <tr>
                    {["challengeId", "winner", "status", "submittedBy", "proof", "created"].map((h) => (
                      <th key={h} className="p-2 font-black border-r border-[#FFE600]/30">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matchResults.data.map((r) => (
                    <tr key={r.id} className="border-t border-gray-200">
                      <td className="p-2 max-w-[100px] truncate">{r.challengeId}</td>
                      <td className="p-2">{r.winningSide}</td>
                      <td className="p-2">{r.status}</td>
                      <td className="p-2 max-w-[100px] truncate">{r.submittedBy}</td>
                      <td className="p-2 max-w-[80px] truncate">{r.screenshotUrl ? "yes" : "—"}</td>
                      <td className="p-2 whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === "push" && (
          <div className="overflow-x-auto border-2 border-black bg-white max-h-[70vh] overflow-y-auto">
            {pushSubs.isLoading && <p className="p-3 text-xs">Loading…</p>}
            {pushSubs.data && (
              <table className="w-full text-left text-[10px] font-mono">
                <thead className="bg-black text-[#FFE600] sticky top-0">
                  <tr>
                    {["userId", "endpoint", "created"].map((h) => (
                      <th key={h} className="p-2 font-black border-r border-[#FFE600]/30">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pushSubs.data.map((p) => (
                    <tr key={p.id} className="border-t border-gray-200">
                      <td className="p-2 max-w-[120px] truncate">{p.userId}</td>
                      <td className="p-2 max-w-[200px] truncate" title={p.endpoint}>
                        {p.endpoint}
                      </td>
                      <td className="p-2 whitespace-nowrap">{new Date(p.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
