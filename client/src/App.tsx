import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import BusinessDetail from "@/pages/BusinessDetail";
import Statistics from "@/pages/Statistics";
import Outreach from "@/pages/Outreach";
import OutreachReady from "@/pages/OutreachReady";
import UltimateOutreach from "@/pages/UltimateOutreach";
import Copilot from "@/pages/Copilot";
import Operations from "@/pages/Operations";
import Events from "@/pages/Events";
import IntentSignals from "@/pages/IntentSignals";
import VenueMonitors from "@/pages/VenueMonitors";
import AuthorityContent from "@/pages/AuthorityContent";
import BlackCardIntel from "@/pages/BlackCardIntel";
import TeamLogin from "@/pages/TeamLogin";
import TeamManagement from "@/pages/TeamManagement";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <Switch>
      {/* Team login is always accessible */}
      <Route path="/team-login" component={TeamLogin} />
      
      {!isAuthenticated ? (
        <Route path="/" component={Landing} />
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/business/:id" component={BusinessDetail} />
          <Route path="/statistics" component={Statistics} />
          <Route path="/outreach" component={Outreach} />
          <Route path="/outreach-ready" component={OutreachReady} />
          <Route path="/ultimate-outreach" component={UltimateOutreach} />
          <Route path="/copilot" component={Copilot} />
          <Route path="/operations" component={Operations} />
          <Route path="/events" component={Events} />
          <Route path="/intent-signals" component={IntentSignals} />
          <Route path="/venue-monitors" component={VenueMonitors} />
          <Route path="/authority-content" component={AuthorityContent} />
          <Route path="/blackcard-intel" component={BlackCardIntel} />
          <Route path="/blackcard-intel/:id" component={BlackCardIntel} />
          <Route path="/team" component={TeamManagement} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
