import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Bell, BellOff, CheckCheck } from "lucide-react";

const TYPE_STYLE: Record<string, { label: string; cls: string }> = {
  player_joined: { label: "PLAYER JOINED", cls: "tag-green" },
  team_almost_full: { label: "ALMOST FULL", cls: "tag-orange" },
  match_ready: { label: "MATCH READY", cls: "tag-black" },
  match_starting: { label: "STARTING", cls: "tag-black" },
  match_result: { label: "RESULT", cls: "tag-pink" },
  challenge_request: { label: "REQUEST", cls: "tag-orange" },
  challenge_accepted: { label: "ACCEPTED", cls: "tag-green" },
  match_reminder: { label: "REMINDER", cls: "tag-black" },
};

export default function Notifications() {
  const [, navigate] = useLocation();
  const qc = useQueryClient();
  const notifications = useListNotifications({ query: { queryKey: getListNotificationsQueryKey() } });
  const invalidate = () => qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });

  const markRead = useMarkNotificationRead({ mutation: { onSuccess: invalidate } });
  const markAll = useMarkAllNotificationsRead({ mutation: { onSuccess: invalidate } });

  const items = notifications.data ?? [];
  const unread = items.filter(n => !n.isRead).length;

  return (
    <Layout>
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="tag-orange inline-block mb-1">INBOX</div>
            <div className="display-font text-4xl flex items-center gap-2">
              <Bell className="w-6 h-6" />
              NOTIFICATIONS
              {unread > 0 && <span className="tag-pink">{unread}</span>}
            </div>
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate({})}
              className="btn-brutal flex items-center gap-1.5 px-3 py-2 bg-black text-[#FFE600] text-xs"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              MARK ALL READ
            </button>
          )}
        </div>

        {notifications.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 border-2 border-black bg-white animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="card-brutal p-12 text-center bg-white">
            <BellOff className="w-10 h-10 mx-auto mb-3 text-gray-400" />
            <p className="font-black text-sm text-gray-600">NO NOTIFICATIONS YET.</p>
            <p className="text-xs font-mono text-gray-400 mt-1">Join a challenge to get started.</p>
          </div>
        ) : (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
            className="space-y-2"
          >
            {items.map(n => {
              const typeInfo = TYPE_STYLE[n.type] || { label: n.type.toUpperCase(), cls: "tag-black" };
              return (
                <motion.div
                  key={n.id}
                  variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ notificationId: n.id });
                    if (n.challengeId) navigate(`/challenges/${n.challengeId}`);
                  }}
                  className={`card-brutal-sm bg-white cursor-pointer overflow-hidden hover:shadow-[5px_5px_0_#000] transition-shadow ${!n.isRead ? "border-[#FF6B00]" : ""}`}
                >
                  {!n.isRead && <div className="h-1 bg-[#FF6B00]" />}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-black text-sm">{n.title}</div>
                        <div className="text-xs text-gray-600 mt-0.5">{n.message}</div>
                        <div className="text-[10px] font-mono text-gray-400 mt-1">
                          {new Date(n.createdAt).toLocaleString()}
                        </div>
                      </div>
                      <div className="shrink-0 mt-0.5">
                        <span className={typeInfo.cls}>{typeInfo.label}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
