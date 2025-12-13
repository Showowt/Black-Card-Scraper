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
import GuestIntelligence from "@/pages/GuestIntelligence";
import CallCompanion from "@/pages/CallCompanion";
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
      
      {/* Unauthenticated routes */}
      {!isAuthenticated && <Route path="/" component={Landing} />}
      
      {/* Authenticated routes */}
      {isAuthenticated && <Route path="/" component={Dashboard} />}
      {isAuthenticated && <Route path="/business/:id" component={BusinessDetail} />}
      {isAuthenticated && <Route path="/statistics" component={Statistics} />}
      {isAuthenticated && <Route path="/outreach" component={Outreach} />}
      {isAuthenticated && <Route path="/outreach-ready" component={OutreachReady} />}
      {isAuthenticated && <Route path="/ultimate-outreach" component={UltimateOutreach} />}
      {isAuthenticated && <Route path="/copilot" component={Copilot} />}
      {isAuthenticated && <Route path="/operations" component={Operations} />}
      {isAuthenticated && <Route path="/events" component={Events} />}
      {isAuthenticated && <Route path="/intent-signals" component={IntentSignals} />}
      {isAuthenticated && <Route path="/venue-monitors" component={VenueMonitors} />}
      {isAuthenticated && <Route path="/authority-content" component={AuthorityContent} />}
      {isAuthenticated && <Route path="/blackcard-intel" component={BlackCardIntel} />}
      {isAuthenticated && <Route path="/blackcard-intel/:id" component={BlackCardIntel} />}
      {isAuthenticated && <Route path="/guest-intel" component={GuestIntelligence} />}
      {isAuthenticated && <Route path="/call-companion" component={CallCompanion} />}
      {isAuthenticated && <Route path="/team" component={TeamManagement} />}
      
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
