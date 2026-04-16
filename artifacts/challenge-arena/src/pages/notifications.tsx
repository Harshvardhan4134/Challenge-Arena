import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { useListNotifications, useMarkNotificationRead, useMarkAllNotificationsRead, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Bell, BellOff, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  player_joined: { label: "Player Joined", color: "text-green-400" },
  team_almost_full: { label: "Team Almost Full", color: "text-amber-400" },
  match_ready: { label: "Match Ready", color: "text-primary" },
  match_starting: { label: "Match Starting", color: "text-primary" },
  match_result: { label: "Match Result", color: "text-accent" },
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

  const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } };
  const fadeIn = { hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } };

  return (
    <Layout>
      <div className="py-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Notifications
            </h1>
            {unread > 0 && (
              <div className="text-xs text-muted-foreground mt-0.5">{unread} unread</div>
            )}
          </div>
          {unread > 0 && (
            <button
              onClick={() => markAll.mutate({})}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <CheckCheck className="w-4 h-4" />
              Mark all read
            </button>
          )}
        </div>

        {notifications.isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg border border-border bg-card animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-lg bg-card">
            <BellOff className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No notifications yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Join a challenge to get started.</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="show" variants={stagger} className="space-y-2">
            {items.map(n => {
              const typeInfo = TYPE_LABELS[n.type] || { label: n.type, color: "text-foreground" };
              return (
                <motion.div
                  key={n.id}
                  variants={fadeIn}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ notificationId: n.id });
                    if (n.challengeId) navigate(`/challenges/${n.challengeId}`);
                  }}
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-lg border cursor-pointer transition-all",
                    !n.isRead
                      ? "border-primary/25 bg-primary/5 hover:bg-primary/8"
                      : "border-border bg-card hover:bg-card/80"
                  )}
                >
                  <div className={cn("w-1.5 h-1.5 rounded-full mt-2 shrink-0", !n.isRead ? "bg-primary" : "bg-muted-foreground/30")} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{n.title}</span>
                      <span className={cn("text-[10px] font-mono", typeInfo.color)}>{typeInfo.label}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-1">
                      {new Date(n.createdAt).toLocaleString()}
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
