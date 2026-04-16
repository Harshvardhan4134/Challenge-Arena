import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetMe } from "@workspace/api-client-react";
import "@/lib/auth";
import Landing from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import Home from "@/pages/home";
import Challenges from "@/pages/challenges";
import CreateChallenge from "@/pages/create-challenge";
import ChallengeDetail from "@/pages/challenge-detail";
import Leaderboard from "@/pages/leaderboard";
import Notifications from "@/pages/notifications";
import Profile from "@/pages/profile";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const me = useGetMe({ query: { queryKey: ["getMe"], retry: false } });

  if (me.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (me.error || !me.data) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/home">
        <AuthGuard><Home /></AuthGuard>
      </Route>
      <Route path="/challenges/create">
        <AuthGuard><CreateChallenge /></AuthGuard>
      </Route>
      <Route path="/challenges/:id">
        <AuthGuard><ChallengeDetail /></AuthGuard>
      </Route>
      <Route path="/challenges">
        <AuthGuard><Challenges /></AuthGuard>
      </Route>
      <Route path="/leaderboard">
        <AuthGuard><Leaderboard /></AuthGuard>
      </Route>
      <Route path="/notifications">
        <AuthGuard><Notifications /></AuthGuard>
      </Route>
      <Route path="/profile/:id">
        <AuthGuard><Profile /></AuthGuard>
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
