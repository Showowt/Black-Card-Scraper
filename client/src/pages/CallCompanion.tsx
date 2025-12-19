import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, LogOut, Phone, Play, Pause, StopCircle, 
  Plus, User, Clock, Target, Brain, AlertCircle, Check,
  BarChart3, Zap, Timer, Crown, DollarSign,
  MessageSquare, Calendar, ChevronRight
} from "lucide-react";
import type { CallSession, CallObjection, CallPainPoint, Business } from "@shared/schema";
import { BUYER_TYPES, URGENCY_LEVELS, AUTHORITY_LEVELS, BUDGET_LEVELS, OBJECTION_TYPES, CATEGORIES } from "@shared/schema";

interface CallConfig {
  buyerTypes: typeof BUYER_TYPES;
  urgencyLevels: typeof URGENCY_LEVELS;
  authorityLevels: typeof AUTHORITY_LEVELS;
  budgetLevels: typeof BUDGET_LEVELS;
  objectionTypes: typeof OBJECTION_TYPES;
}

interface CallSessionWithDetails extends CallSession {
  objections?: CallObjection[];
  painPoints?: CallPainPoint[];
}

export default function CallCompanion() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [activeSession, setActiveSession] = useState<CallSessionWithDetails | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [painPointInput, setPainPointInput] = useState("");
  const [newSessionData, setNewSessionData] = useState({
    businessName: "",
    contactName: "",
    contactRole: "",
    phone: "",
    businessType: "",
  });

  const { data: config } = useQuery<CallConfig>({
    queryKey: ["/api/calls/config"],
  });

  const { data: sessions, isLoading: loadingSessions } = useQuery<CallSession[]>({
    queryKey: ["/api/calls"],
  });

  const createSessionMutation = useMutation({
    mutationFn: async (data: typeof newSessionData) => {
      const res = await apiRequest("POST", "/api/calls", data);
      return res.json();
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      setActiveSession(session);
      setDialogOpen(false);
      setNewSessionData({ businessName: "", contactName: "", contactRole: "", phone: "", businessType: "" });
      startTimer();
      toast({ title: "Call started", description: "Timer is running" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create call session", variant: "destructive" });
    },
  });

  const updateSessionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CallSession>) => {
      const res = await apiRequest("PATCH", `/api/calls/${id}`, data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["/api/calls"] });
      setActiveSession(prev => prev ? { ...prev, ...updated } : null);
    },
  });

  const addObjectionMutation = useMutation({
    mutationFn: async ({ sessionId, objectionType }: { sessionId: string; objectionType: string }) => {
      const res = await apiRequest("POST", `/api/calls/${sessionId}/objections`, { objectionType });
      return res.json();
    },
    onSuccess: (objection) => {
      setActiveSession(prev => prev ? {
        ...prev,
        objections: [...(prev.objections || []), objection]
      } : null);
    },
  });

  const updateObjectionMutation = useMutation({
    mutationFn: async ({ sessionId, objId, addressed }: { sessionId: string; objId: string; addressed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/calls/${sessionId}/objections/${objId}`, { addressed });
      return res.json();
    },
    onSuccess: (updated) => {
      setActiveSession(prev => prev ? {
        ...prev,
        objections: (prev.objections || []).map(o => o.id === updated.id ? updated : o)
      } : null);
    },
  });

  const addPainPointMutation = useMutation({
    mutationFn: async ({ sessionId, painText, severity }: { sessionId: string; painText: string; severity?: number }) => {
      const res = await apiRequest("POST", `/api/calls/${sessionId}/pain-points`, { painText, severity });
      return res.json();
    },
    onSuccess: (painPoint) => {
      setActiveSession(prev => prev ? {
        ...prev,
        painPoints: [...(prev.painPoints || []), painPoint]
      } : null);
      setPainPointInput("");
    },
  });

  const startTimer = () => {
    setIsRunning(true);
    setElapsedSeconds(0);
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resumeTimer = () => {
    setIsRunning(true);
  };

  const endCall = () => {
    if (activeSession) {
      const minutes = Math.ceil(elapsedSeconds / 60);
      updateSessionMutation.mutate({
        id: activeSession.id,
        endedAt: new Date(),
        durationMinutes: minutes,
        status: "completed",
      });
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setActiveSession(null);
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getDealScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-amber-500";
    return "text-red-500";
  };

  const handleSignalClick = (type: string, value: string) => {
    if (!activeSession) return;
    updateSessionMutation.mutate({ id: activeSession.id, [type]: value });
  };

  const handleObjectionToggle = (objType: string) => {
    if (!activeSession) return;
    const existing = activeSession.objections?.find(o => o.objectionType === objType);
    if (existing) {
      updateObjectionMutation.mutate({ sessionId: activeSession.id, objId: existing.id, addressed: !existing.addressed });
    } else {
      addObjectionMutation.mutate({ sessionId: activeSession.id, objectionType: objType });
    }
  };

  const handleAddPainPoint = () => {
    if (!activeSession || !painPointInput.trim()) return;
    addPainPointMutation.mutate({ sessionId: activeSession.id, painText: painPointInput.trim() });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-medium">Black Card Scanner</span>
          </div>
          
          <nav className="flex items-center gap-4 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="nav-dashboard">Dashboard</Button>
            </Link>
            <Link href="/follow-ups">
              <Button variant="ghost" size="sm" data-testid="nav-follow-ups">
                <Calendar className="h-4 w-4 mr-1" /> Follow-ups
              </Button>
            </Link>
            <Link href="/call-companion">
              <Button variant="ghost" size="sm" className="bg-accent" data-testid="nav-call-companion">
                <Phone className="h-4 w-4 mr-1" /> Calls
              </Button>
            </Link>
          </nav>
          
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>{user?.firstName?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <Button variant="ghost" size="icon" asChild>
              <a href="/api/logout"><LogOut className="h-4 w-4" /></a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Phone className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-medium" data-testid="text-page-title">Call Companion</h1>
              <p className="text-sm text-muted-foreground">Live call intelligence and deal scoring</p>
            </div>
          </div>
          
          {!activeSession && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-start-call">
                  <Play className="h-4 w-4 mr-1" /> Start Call
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Start New Call</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Business Name</Label>
                    <Input
                      id="businessName"
                      value={newSessionData.businessName}
                      onChange={(e) => setNewSessionData(d => ({ ...d, businessName: e.target.value }))}
                      placeholder="Business name"
                      data-testid="input-business-name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="contactName">Contact Name</Label>
                      <Input
                        id="contactName"
                        value={newSessionData.contactName}
                        onChange={(e) => setNewSessionData(d => ({ ...d, contactName: e.target.value }))}
                        placeholder="Contact name"
                        data-testid="input-contact-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contactRole">Role</Label>
                      <Input
                        id="contactRole"
                        value={newSessionData.contactRole}
                        onChange={(e) => setNewSessionData(d => ({ ...d, contactRole: e.target.value }))}
                        placeholder="Owner, Manager, etc."
                        data-testid="input-contact-role"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newSessionData.phone}
                        onChange={(e) => setNewSessionData(d => ({ ...d, phone: e.target.value }))}
                        placeholder="+1234567890"
                        data-testid="input-phone"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="businessType">Business Type</Label>
                      <Select
                        value={newSessionData.businessType}
                        onValueChange={(v) => setNewSessionData(d => ({ ...d, businessType: v }))}
                      >
                        <SelectTrigger data-testid="select-business-type">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={() => createSessionMutation.mutate(newSessionData)}
                    disabled={!newSessionData.businessName || createSessionMutation.isPending}
                    data-testid="button-confirm-start-call"
                  >
                    {createSessionMutation.isPending ? "Starting..." : "Start Call"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {activeSession ? (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
                  <div>
                    <CardTitle className="text-lg">{activeSession.businessName || "Call"}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {activeSession.contactName} {activeSession.contactRole && `(${activeSession.contactRole})`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-3xl font-mono font-bold" data-testid="text-timer">
                        {formatTime(elapsedSeconds)}
                      </div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                    </div>
                    <div className="flex gap-2">
                      {isRunning ? (
                        <Button size="icon" variant="outline" onClick={pauseTimer} data-testid="button-pause">
                          <Pause className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button size="icon" variant="outline" onClick={resumeTimer} data-testid="button-resume">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      <Button size="icon" variant="destructive" onClick={endCall} data-testid="button-end-call">
                        <StopCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-5 w-5" /> Deal Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-6">
                    <div className={`text-5xl font-bold ${getDealScoreColor(activeSession.dealScore || 50)}`} data-testid="text-deal-score">
                      {activeSession.dealScore || 50}
                    </div>
                    <Progress value={activeSession.dealScore || 50} className="flex-1 h-4" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-5 w-5" /> Quick Signals
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Buyer Type</Label>
                    <div className="flex flex-wrap gap-2">
                      {BUYER_TYPES.map(bt => (
                        <Button
                          key={bt.value}
                          size="sm"
                          variant={activeSession.buyerType === bt.value ? "default" : "outline"}
                          onClick={() => handleSignalClick("buyerType", bt.value)}
                          data-testid={`button-buyer-${bt.value}`}
                        >
                          {bt.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Urgency</Label>
                    <div className="flex flex-wrap gap-2">
                      {URGENCY_LEVELS.map(ul => (
                        <Button
                          key={ul.value}
                          size="sm"
                          variant={activeSession.urgency === ul.value ? "default" : "outline"}
                          onClick={() => handleSignalClick("urgency", ul.value)}
                          data-testid={`button-urgency-${ul.value}`}
                        >
                          {ul.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Authority</Label>
                    <div className="flex flex-wrap gap-2">
                      {AUTHORITY_LEVELS.map(al => (
                        <Button
                          key={al.value}
                          size="sm"
                          variant={activeSession.authority === al.value ? "default" : "outline"}
                          onClick={() => handleSignalClick("authority", al.value)}
                          data-testid={`button-authority-${al.value}`}
                        >
                          {al.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Budget</Label>
                    <div className="flex flex-wrap gap-2">
                      {BUDGET_LEVELS.map(bl => (
                        <Button
                          key={bl.value}
                          size="sm"
                          variant={activeSession.budget === bl.value ? "default" : "outline"}
                          onClick={() => handleSignalClick("budget", bl.value)}
                          data-testid={`button-budget-${bl.value}`}
                        >
                          {bl.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" /> Objections
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {OBJECTION_TYPES.map(ot => {
                      const objection = activeSession.objections?.find(o => o.objectionType === ot.value);
                      const isActive = !!objection;
                      const isAddressed = objection?.addressed;
                      
                      return (
                        <Button
                          key={ot.value}
                          variant={isAddressed ? "default" : isActive ? "secondary" : "outline"}
                          className="justify-start"
                          onClick={() => handleObjectionToggle(ot.value)}
                          data-testid={`button-objection-${ot.value}`}
                        >
                          {isAddressed ? <Check className="h-4 w-4 mr-2" /> : null}
                          {ot.label}
                        </Button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> Pain Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add pain point..."
                      value={painPointInput}
                      onChange={(e) => setPainPointInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddPainPoint()}
                      data-testid="input-pain-point"
                    />
                    <Button size="icon" onClick={handleAddPainPoint} disabled={!painPointInput.trim()} data-testid="button-add-pain-point">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[200px]">
                    {activeSession.painPoints && activeSession.painPoints.length > 0 ? (
                      <div className="space-y-2">
                        {activeSession.painPoints.map((pp, idx) => (
                          <div key={pp.id || idx} className="p-2 rounded-md bg-muted text-sm" data-testid={`pain-point-${pp.id || idx}`}>
                            {pp.painText}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
                        No pain points captured yet
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Checkbox className="h-5 w-5" /> Needs
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { key: "needsDemo", label: "Demo" },
                    { key: "needsProposal", label: "Proposal" },
                    { key: "needsCaseStudy", label: "Case Study" },
                    { key: "needsTrial", label: "Trial" },
                  ].map(need => (
                    <div key={need.key} className="flex items-center gap-2">
                      <Checkbox
                        id={need.key}
                        checked={activeSession[need.key as keyof CallSession] as boolean || false}
                        onCheckedChange={(checked) => 
                          updateSessionMutation.mutate({ id: activeSession.id, [need.key]: checked })
                        }
                        data-testid={`checkbox-${need.key}`}
                      />
                      <Label htmlFor={need.key} className="text-sm">{need.label}</Label>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Recent Calls
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingSessions ? (
                    <div className="space-y-3">
                      {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                    </div>
                  ) : sessions && sessions.length > 0 ? (
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-3">
                        {sessions.map((session) => (
                          <div
                            key={session.id}
                            className="flex items-center justify-between p-4 rounded-md border hover-elevate"
                            data-testid={`session-${session.id}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-full bg-primary/10">
                                <Phone className="h-4 w-4 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{session.businessName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {session.contactName} {session.durationMinutes ? `- ${session.durationMinutes} min` : ''}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {session.dealScore && (
                                <Badge variant="secondary" className={getDealScoreColor(session.dealScore)}>
                                  Score: {session.dealScore}
                                </Badge>
                              )}
                              <Badge variant="outline">
                                {session.status}
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  ) : (
                    <div className="h-[200px] flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <Phone className="h-12 w-12 opacity-30" />
                      <p>No call sessions yet</p>
                      <p className="text-sm">Start a call to begin tracking</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Brain className="h-5 w-5" /> Call Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-md bg-blue-50 dark:bg-blue-950">
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Buyer Types</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    Analytical = Data first | Driver = Results focus | Expressive = Vision driven | Amiable = Relationship first
                  </p>
                </div>
                <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Urgency Signals</p>
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    Listen for pain timeline: &quot;We need this by...&quot; | &quot;We&apos;re losing X per month&quot;
                  </p>
                </div>
                <div className="p-3 rounded-md bg-green-50 dark:bg-green-950">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">Authority Check</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Ask: &quot;Who else would need to be involved in this decision?&quot;
                  </p>
                </div>
                <div className="p-3 rounded-md bg-purple-50 dark:bg-purple-950">
                  <p className="text-sm font-medium text-purple-800 dark:text-purple-200">Objection Handling</p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Price: ROI focus | Timing: Cost of delay | Trust: Case studies | Need: Pain amplification
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
