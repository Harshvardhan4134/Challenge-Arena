import { useEffect } from "react";
import { useLocation } from "wouter";
import { Home, Swords, Trophy, Bell, User, Shield } from "lucide-react";
import { useGetMe, useListNotifications, getGetMeQueryKey, getListNotificationsQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { registerWebPushForUser } from "@/lib/push-notifications";

const navItems = [
  { path: "/home", icon: Home, label: "HOME" },
  { path: "/challenges", icon: Swords, label: "MATCHES" },
  { path: "/leaderboard", icon: Trophy, label: "RANKS" },
  { path: "/notifications", icon: Bell, label: "ALERTS" },
  { path: "/profile/me", icon: User, label: "PROFILE" },
  { path: "/admin", icon: Shield, label: "ADMIN", adminOnly: true },
] as const;

/** Must not use hooks inside nav map — item count changes when admin tab appears. */
function isNavItemActive(navPath: string, location: string): boolean {
  const path = (location.replace(/\/$/, "") || "/").split("?")[0] ?? "/";
  const target = navPath.replace(/\/$/, "") || "/";
  if (target === "/home") return path === "/home";
  if (target === "/profile/me") return path.startsWith("/profile");
  return path === target || path.startsWith(`${target}/`);
}

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location, navigate] = useLocation();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const notifications = useListNotifications({
    query: { queryKey: getListNotificationsQueryKey(), refetchInterval: 30_000 },
  });
  const unread = notifications.data?.filter(n => !n.isRead).length ?? 0;
  const bottomNav = navItems.filter((item) => !("adminOnly" in item && item.adminOnly) || me.data?.isAdmin);

  useEffect(() => {
    if (me.data?.id) void registerWebPushForUser();
  }, [me.data?.id]);

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b-4 border-black bg-black pt-[env(safe-area-inset-top)]">
        <div className="max-w-2xl mx-auto px-3 sm:px-4 min-h-12 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/home")}
            className="display-font text-[#FFE600] text-base sm:text-xl tracking-widest flex items-center gap-1.5 sm:gap-2 min-h-11 min-w-0"
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span className="truncate">CHALLENGE ARENA</span>
          </button>
        </div>
      </header>

      <main className="flex-1 pt-[calc(3rem+env(safe-area-inset-top))] pb-[calc(4.5rem+env(safe-area-inset-bottom))] max-w-2xl mx-auto w-full px-3 sm:px-4">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-black bg-[#FFE600] pb-[env(safe-area-inset-bottom)]">
        <div
          className={cn(
            "max-w-2xl mx-auto flex w-full",
          )}
        >
          {bottomNav.map(({ path: navPath, icon: Icon, label }) => {
            const isActive = isNavItemActive(navPath, location);
            return (
              <button
                type="button"
                key={navPath}
                onClick={() => navigate(navPath)}
                className={cn(
                  "flex flex-1 min-w-0 min-h-[3.25rem] sm:min-h-14 flex-col items-center justify-center gap-0.5 px-0.5 py-2 transition-colors relative border-r-2 border-black last:border-r-0 touch-manipulation active:opacity-90",
                  isActive ? "bg-black text-[#FFE600]" : "text-black hover:bg-black/10",
                )}
              >
                <div className="relative shrink-0">
                  <Icon className="w-[18px] h-[18px] sm:w-5 sm:h-5" />
                  {label === "ALERTS" && unread > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-0.5 bg-[#FF1E56] border border-black text-white text-[8px] font-black rounded-none flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className="text-[7px] sm:text-[8px] font-black tracking-tight sm:tracking-wider font-mono text-center leading-tight max-w-full truncate px-0.5">
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
