import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Home, Swords, Trophy, Bell, User } from "lucide-react";
import { useGetMe, useListNotifications, getGetMeQueryKey } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { registerWebPushForUser } from "@/lib/push-notifications";

const navItems = [
  { path: "/home", icon: Home, label: "HOME" },
  { path: "/challenges", icon: Swords, label: "MATCHES" },
  { path: "/leaderboard", icon: Trophy, label: "RANKS" },
  { path: "/notifications", icon: Bell, label: "ALERTS" },
  { path: "/profile/me", icon: User, label: "PROFILE" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const me = useGetMe({ query: { queryKey: getGetMeQueryKey() } });
  const notifications = useListNotifications({
    query: { queryKey: ["listNotifications"], refetchInterval: 30_000 },
  });
  const unread = notifications.data?.filter(n => !n.isRead).length ?? 0;

  useEffect(() => {
    if (me.data?.id) void registerWebPushForUser();
  }, [me.data?.id]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 z-50 border-b-4 border-black bg-black">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="display-font text-[#FFE600] text-xl tracking-widest flex items-center gap-2"
          >
            <Swords className="w-4 h-4" />
            CHALLENGE ARENA
          </button>
        </div>
      </header>

      <main className="flex-1 pt-12 pb-16 max-w-2xl mx-auto w-full px-3">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t-4 border-black bg-[#FFE600]">
        <div className="max-w-2xl mx-auto grid grid-cols-5 h-14">
          {navItems.map(({ path, icon: Icon, label }) => {
            const [isActive] = useRoute(path === "/home" ? "/home" : path + "*");
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors relative border-r-2 border-black last:border-r-0",
                  isActive ? "bg-black text-[#FFE600]" : "text-black hover:bg-black/10"
                )}
              >
                <div className="relative">
                  <Icon className="w-4 h-4" />
                  {label === "ALERTS" && unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#FF1E56] border border-black text-white text-[8px] font-black rounded-none flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className="text-[8px] font-black tracking-wider font-mono">{label}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
