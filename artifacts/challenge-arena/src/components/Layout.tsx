import { useLocation, useRoute } from "wouter";
import { Home, Swords, Trophy, Bell, User } from "lucide-react";
import { useListNotifications } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

const navItems = [
  { path: "/home", icon: Home, label: "Home" },
  { path: "/challenges", icon: Swords, label: "Matches" },
  { path: "/leaderboard", icon: Trophy, label: "Ranks" },
  { path: "/notifications", icon: Bell, label: "Alerts" },
  { path: "/profile/me", icon: User, label: "Profile" },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [, navigate] = useLocation();
  const notifications = useListNotifications({ query: { queryKey: ["listNotifications"] } });
  const unread = notifications.data?.filter(n => !n.isRead).length ?? 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
          <button
            onClick={() => navigate("/home")}
            className="flex items-center gap-1.5 text-primary font-mono font-bold text-xs tracking-widest"
          >
            <Swords className="w-4 h-4" />
            ARENA
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 pt-12 pb-16 max-w-2xl mx-auto w-full px-4">
        {children}
      </main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto grid grid-cols-5 h-14">
          {navItems.map(({ path, icon: Icon, label }) => {
            const [isActive] = useRoute(path === "/home" ? "/home" : path + "*");
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="relative">
                  <Icon className="w-5 h-5" />
                  {label === "Alerts" && unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">{label}</span>
                {isActive && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-b" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
