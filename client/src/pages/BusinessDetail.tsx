import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Building2, ArrowLeft, Phone, Mail, Globe, MapPin, Star, 
  ExternalLink, Clock, Zap, RefreshCw, Copy, Check, LogOut, Search,
  AlertTriangle, Target, DollarSign, Shield, Heart, Clock3, Sparkles, Send,
  Play, Pause, StopCircle, Plus, ChevronDown, MessageSquare,
  BarChart3, Flame, Eye, Crown, Gem, Calendar, FileText, Lightbulb, Users, DoorClosed
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { SiInstagram, SiFacebook, SiWhatsapp } from "react-icons/si";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ClaudeCopilot from "@/components/ClaudeCopilot";
import IntelligencePanel from "@/components/IntelligencePanel";
import type { Business, OutreachCampaign, CallSession, CallObjection, CallPainPoint } from "@shared/schema";
import { CITIES, CATEGORIES, OUTREACH_STATUSES, BUYER_TYPES, URGENCY_LEVELS, AUTHORITY_LEVELS, BUDGET_LEVELS, OBJECTION_TYPES, CALL_DISPOSITIONS } from "@shared/schema";

interface CallSessionWithDetails extends CallSession {
  objections?: CallObjection[];
  painPoints?: CallPainPoint[];
}

export default function BusinessDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/business/:id");
  const businessId = params?.id;
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ultimateScripts, setUltimateScripts] = useState<any>(null);
  const [scriptsDialogOpen, setScriptsDialogOpen] = useState(false);

  const [callCompanionOpen, setCallCompanionOpen] = useState(true);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [activeSession, setActiveSession] = useState<CallSessionWithDetails | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [painPointInput, setPainPointInput] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [showStrategy, setShowStrategy] = useState(false);
  const [showCheatSheet, setShowCheatSheet] = useState(false);
  const [expandedCallId, setExpandedCallId] = useState<string | null>(null);
  const [selectedDisposition, setSelectedDisposition] = useState<string>("");

  const calculateDealScore = (session: CallSessionWithDetails) => {
    let score = 50;
    const urgencyScores: Record<string, number> = { bleeding: 25, urgent: 15, planning: 5, browsing: -10 };
    if (session.urgency) score += urgencyScores[session.urgency] || 0;
    const authorityScores: Record<string, number> = { sole: 15, influencer: 5, gatekeeper: -10 };
    if (session.authority) score += authorityScores[session.authority] || 0;
    const budgetScores: Record<string, number> = { flexible: 15, price_first: -5, constrained: -10 };
    if (session.budget) score += budgetScores[session.budget] || 0;
    const maxSeverity = Math.max(...(session.painPoints?.map(p => p.severity || 0) || [0]));
    if (maxSeverity >= 7) score += 15;
    else if (maxSeverity >= 4) score += 8;
    const unaddressed = session.objections?.filter(o => !o.addressed).length || 0;
    score -= unaddressed * 5;
    return Math.max(0, Math.min(100, score));
  };

  const getStrategyTips = (session: CallSessionWithDetails) => {
    const tips: string[] = [];
    if (session.buyerType === 'analytical') tips.push("Lead with DATA - ROI numbers, case studies, metrics. Don't rush the decision.");
    if (session.buyerType === 'driver') tips.push("Be DIRECT - bottom line first. Respect their time. Focus on results.");
    if (session.buyerType === 'expressive') tips.push("Paint the VISION - be enthusiastic. Share success stories with emotion.");
    if (session.buyerType === 'amiable') tips.push("Build TRUST first - reduce perceived risk. Don't pressure. Offer guarantees.");
    if (session.urgency === 'bleeding') tips.push("They're losing money NOW - emphasize immediate ROI and fast implementation.");
    if (session.urgency === 'browsing') tips.push("Create urgency - show what they're missing. Plant seeds for future follow-up.");
    if (session.authority === 'gatekeeper') tips.push("Get to the decision maker - ask to schedule a call with the owner.");
    if (session.authority === 'influencer') tips.push("Arm them with materials to convince their partner/owner.");
    if (session.budget === 'constrained') tips.push("Focus on ROI and payment plans. Show cost of inaction.");
    const unaddressedObjs = session.objections?.filter(o => !o.addressed) || [];
    if (unaddressedObjs.length > 0) tips.push(`Address remaining objections: ${unaddressedObjs.map(o => o.objectionType).join(', ')}`);
    return tips;
  };

  const OBJECTION_RESPONSES: Record<string, string> = {
    price: "Compared to what you're losing in unanswered inquiries, this pays for itself in the first week. What's ONE booking worth to you?",
    timing: "Every day you wait, 67% of your inquiries go unanswered. What's that costing you this month?",
    trust: "Totally understand. What specifically would you need to know to feel confident?",
    authority: "Great - can we schedule a quick call with both of you? I'd love to answer their questions directly.",
    competitor: "Smart to compare. What criteria are most important to you? [Then show where you win]",
    need: "What happens to inquiries that come in at 2am? Are you answering those personally?",
  };

  const POWER_QUESTIONS = [
    "What made you take this call today?",
    "What happens when an inquiry comes in at 2am?",
    "How many inquiries do you think you miss per week?",
    "If you could wave a magic wand, what would change?",
    "What's one booking worth to you?",
    "Who else would need to be involved in this decision?",
  ];

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/businesses", businessId],
    enabled: !!businessId,
  });

  const { data: outreachCampaigns } = useQuery<OutreachCampaign[]>({
    queryKey: ['/api/outreach', 'byBusiness', businessId],
    queryFn: async ({ queryKey }) => {
      const bId = queryKey[2] as string;
      if (!bId) throw new Error('Business ID is required');
      const res = await fetch(`/api/outreach?businessId=${bId}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch outreach campaigns');
      return res.json();
    },
    enabled: !!businessId,
  });

  const enrichMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/businesses/${businessId}/enrich`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Enrichment Complete", description: "Business has been analyzed with AI" });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId] });
    },
    onError: (error: Error) => {
      toast({ title: "Enrichment Failed", description: error.message, variant: "destructive" });
    },
  });

  const generateEmailMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/outreach/generate", { businessId });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Email Generated", description: "AI-powered outreach email is ready" });
      queryClient.invalidateQueries({ queryKey: ['/api/outreach', 'byBusiness', businessId] });
      setEmailDialogOpen(true);
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await apiRequest("PATCH", `/api/businesses/${businessId}/outreach-status`, { status });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId] });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/businesses/${businessId}/scrape`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Scrape Complete", description: "Website metadata extracted successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId] });
    },
    onError: (error: Error) => {
      toast({ title: "Scrape Failed", description: error.message, variant: "destructive" });
    },
  });

  const appendOutreachNotesMutation = useMutation({
    mutationFn: async ({ note, dealScore }: { note: string; dealScore: number }) => {
      const res = await apiRequest("POST", `/api/businesses/${businessId}/outreach-notes`, { note, dealScore });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId] });
    },
  });

  const { data: signalAnalysis } = useQuery<{
    detectedSignals: string[];
    detectedProblem: string;
    customOffer: string;
    monthlyLoss: number;
    lossExplanation: string;
    identityStatement: string;
    fearTrigger: string;
    desireTrigger: string;
    urgencyAngle: string;
  }>({
    queryKey: ['/api/ultimate-outreach/analyze', businessId],
    queryFn: async () => {
      const res = await fetch(`/api/ultimate-outreach/analyze/${businessId}`, { credentials: 'include' });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!businessId && !!business?.isEnriched,
  });

  const generateUltimateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ultimate-outreach/generate", { businessId });
      return res.json();
    },
    onSuccess: (result) => {
      setUltimateScripts(result.scripts);
      setScriptsDialogOpen(true);
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes("/api/outreach") || String(query.queryKey[0]).includes("/api/ultimate")
      });
      toast({ title: "Ultimate Scripts Generated", description: "Multi-channel scripts ready" });
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: callSessions, isLoading: loadingCalls } = useQuery<CallSession[]>({
    queryKey: ['/api/calls', 'byBusiness', businessId],
    queryFn: async () => {
      const res = await fetch(`/api/calls?businessId=${businessId}`, { credentials: 'include' });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!businessId,
  });

  const createCallSessionMutation = useMutation({
    mutationFn: async (data: { businessName: string; contactName: string; contactRole: string; phone: string; businessType: string; businessId: string }) => {
      const res = await apiRequest("POST", "/api/calls", data);
      return res.json();
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls', 'byBusiness', businessId] });
      setActiveSession(session);
      setCallDialogOpen(false);
      setContactName("");
      setContactRole("");
      startTimer();
      toast({ title: "Call started", description: "Timer is running" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create call session", variant: "destructive" });
    },
  });

  const updateCallSessionMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string } & Partial<CallSession>) => {
      const res = await apiRequest("PATCH", `/api/calls/${id}`, data);
      return res.json();
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['/api/calls', 'byBusiness', businessId] });
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
      const dealScore = calculateDealScore(activeSession);
      
      updateCallSessionMutation.mutate({
        id: activeSession.id,
        endedAt: new Date(),
        durationMinutes: minutes,
        status: "completed",
        dealScore,
        disposition: selectedDisposition || undefined,
      });

      // Sync followUpDate and disposition to business
      const businessUpdate: Record<string, any> = {
        lastContactedAt: new Date(),
      };
      if (activeSession.followUpDate) {
        businessUpdate.followUpDate = activeSession.followUpDate;
      }
      if (selectedDisposition) {
        businessUpdate.lastDisposition = selectedDisposition;
      }
      
      apiRequest("PATCH", `/api/businesses/${businessId}`, businessUpdate)
        .then(() => {
          queryClient.invalidateQueries({ queryKey: ["/api/businesses", businessId] });
          queryClient.invalidateQueries({ queryKey: ["/api/businesses/follow-ups"] });
        });

      const painSummary = activeSession.painPoints?.map(p => p.painText).join(", ") || "";
      const objectionSummary = activeSession.objections?.filter(o => !o.addressed).map(o => o.objectionType).join(", ") || "";
      const dispositionLabel = selectedDisposition ? CALL_DISPOSITIONS.find(d => d.value === selectedDisposition)?.label : "";
      const callSummary = [
        `Call ${new Date().toLocaleDateString()}: ${minutes}min`,
        activeSession.buyerType ? `Type: ${activeSession.buyerType}` : "",
        activeSession.urgency ? `Urgency: ${activeSession.urgency}` : "",
        activeSession.authority ? `Authority: ${activeSession.authority}` : "",
        painSummary ? `Pain: ${painSummary}` : "",
        objectionSummary ? `Open objections: ${objectionSummary}` : "",
        dispositionLabel ? `Disposition: ${dispositionLabel}` : "",
        `Deal Score: ${dealScore}`,
      ].filter(Boolean).join(" | ");

      appendOutreachNotesMutation.mutate({ note: callSummary, dealScore });

      toast({ title: "Call completed", description: `Deal score: ${dealScore}` });
    }
    setIsRunning(false);
    setElapsedSeconds(0);
    setActiveSession(null);
    setSelectedDisposition("");
  };

  // Resume active session on load
  useEffect(() => {
    if (!callSessions || callSessions.length === 0 || activeSession) return;
    
    const inProgressSession = callSessions.find(s => s.status === "in_progress");
    if (inProgressSession) {
      // Calculate elapsed time from startedAt
      const startedAt = new Date(inProgressSession.startedAt);
      const now = new Date();
      const elapsedMs = now.getTime() - startedAt.getTime();
      const elapsedSec = Math.max(0, Math.floor(elapsedMs / 1000));
      
      setActiveSession(inProgressSession as CallSessionWithDetails);
      setElapsedSeconds(elapsedSec);
      setIsRunning(true);
      toast({ title: "Call resumed", description: "Continuing active session" });
    }
  }, [callSessions]);

  // Timer interval effect
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setElapsedSeconds(s => s + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
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
    updateCallSessionMutation.mutate({ id: activeSession.id, [type]: value });
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

  const handleStartCall = () => {
    if (!business) return;
    
    // Guard against multiple active sessions
    const existingActiveSession = callSessions?.find(s => s.status === "in_progress");
    if (existingActiveSession || activeSession) {
      toast({ 
        title: "Active call in progress", 
        description: "Please end the current call before starting a new one",
        variant: "destructive"
      });
      return;
    }
    
    createCallSessionMutation.mutate({
      businessId: businessId!,
      businessName: business.name,
      phone: business.phone || "",
      businessType: business.category,
      contactName,
      contactRole,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Copied to clipboard" });
  };

  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;
  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;

  const latestEmail = outreachCampaigns?.[0];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-medium">Black Card Scanner</span>
          </div>
        </header>
        <main className="max-w-4xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid md:grid-cols-2 gap-6">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        </main>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Business Not Found</h2>
          <Link href="/">
            <Button variant="outline">Back to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-medium">Black Card Scanner</span>
          </div>
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

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Link href="/">
          <Button variant="ghost" className="mb-4" data-testid="button-back">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Dashboard
          </Button>
        </Link>

        <div className="flex items-start gap-4 mb-6 flex-wrap">
          {business.photoUrl ? (
            <Avatar className="h-16 w-16">
              <AvatarImage src={business.photoUrl} />
              <AvatarFallback>{business.name[0]}</AvatarFallback>
            </Avatar>
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
              <Building2 className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
          <div className="flex-1">
            <h1 className="text-3xl font-medium mb-1" data-testid="text-business-name">{business.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline">{getCategoryLabel(business.category)}</Badge>
              <span className="text-muted-foreground">{getCityLabel(business.city)}</span>
              {business.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  <span>{business.rating}</span>
                  <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Select value={business.outreachStatus || "pending"} onValueChange={status => updateStatusMutation.mutate(status)}>
              <SelectTrigger className="w-36" data-testid="select-outreach-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OUTREACH_STATUSES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Contact Information</CardTitle>
                  {business.website && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => scrapeMutation.mutate()}
                      disabled={scrapeMutation.isPending}
                      data-testid="button-scrape"
                    >
                      {scrapeMutation.isPending ? (
                        <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Scraping...</>
                      ) : (
                        <><Search className="h-4 w-4 mr-1" /> Scrape Website</>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {business.address && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Address</div>
                      <div data-testid="text-address">{business.address}</div>
                    </div>
                  </div>
                )}
                {business.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Phone</div>
                      <a href={`tel:${business.phone}`} className="hover:underline" data-testid="text-phone">{business.phone}</a>
                    </div>
                  </div>
                )}
                {business.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Email</div>
                      <a href={`mailto:${business.email}`} className="hover:underline" data-testid="text-email">{business.email}</a>
                    </div>
                  </div>
                )}
                {business.website && (
                  <div className="flex items-start gap-3">
                    <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">Website</div>
                      <a href={business.website} target="_blank" rel="noopener" className="hover:underline flex items-center gap-1" data-testid="link-website">
                        {business.website} <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
                {business.googleMapsUrl && (
                  <Button variant="outline" size="sm" asChild className="mt-2">
                    <a href={business.googleMapsUrl} target="_blank" rel="noopener">
                      <MapPin className="h-4 w-4 mr-1" /> View on Google Maps
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Social Media</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2 flex-wrap">
                  {business.instagram && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://instagram.com/${business.instagram}`} target="_blank" rel="noopener">
                        <SiInstagram className="h-4 w-4 mr-1" /> {business.instagram}
                      </a>
                    </Button>
                  )}
                  {business.facebook && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={business.facebook} target="_blank" rel="noopener">
                        <SiFacebook className="h-4 w-4 mr-1" /> Facebook
                      </a>
                    </Button>
                  )}
                  {business.whatsapp && (
                    <Button variant="outline" size="sm" asChild>
                      <a href={`https://wa.me/${business.whatsapp}`} target="_blank" rel="noopener">
                        <SiWhatsapp className="h-4 w-4 mr-1" /> WhatsApp
                      </a>
                    </Button>
                  )}
                  {!business.instagram && !business.facebook && !business.whatsapp && (
                    <p className="text-muted-foreground text-sm">No social media found</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {(() => {
              const hours = business.openingHours;
              if (!hours || !Array.isArray(hours)) return null;
              const hoursArray = hours as string[];
              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Clock className="h-4 w-4" /> Opening Hours
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-1 text-sm">
                      {hoursArray.map((h, i) => (
                        <li key={i}>{String(h)}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })()}
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">AI Insights</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => enrichMutation.mutate()}
                    disabled={enrichMutation.isPending}
                    data-testid="button-enrich"
                  >
                    {enrichMutation.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Analyzing...</>
                    ) : (
                      <><Zap className="h-4 w-4 mr-1" /> {business.isEnriched ? 'Re-analyze' : 'Enrich with AI'}</>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {business.isEnriched ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Opportunity Score</span>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-medium" data-testid="text-ai-score">{business.aiScore}</span>
                        <Badge variant={business.aiReadiness === 'high' ? 'default' : business.aiReadiness === 'medium' ? 'secondary' : 'outline'}>
                          {business.aiReadiness}
                        </Badge>
                      </div>
                    </div>
                    {business.aiClassification && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Classification</div>
                        <Badge variant="outline">{business.aiClassification}</Badge>
                      </div>
                    )}
                    {business.aiSummary && (
                      <div>
                        <div className="text-sm text-muted-foreground mb-1">Summary</div>
                        <p className="text-sm" data-testid="text-ai-summary">{business.aiSummary}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Click "Enrich with AI" to analyze this business</p>
                )}
              </CardContent>
            </Card>

            {signalAnalysis && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Target className="h-4 w-4 text-primary" /> Signal Intelligence
                    </CardTitle>
                    <Button 
                      variant="default" 
                      size="sm" 
                      onClick={() => generateUltimateMutation.mutate()}
                      disabled={generateUltimateMutation.isPending}
                      data-testid="button-generate-ultimate"
                    >
                      {generateUltimateMutation.isPending ? (
                        <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-1" /> Generate Scripts</>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 rounded-md bg-destructive/5 border border-destructive/20">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-destructive">Problem Detected</p>
                        <p className="text-sm mt-1" data-testid="text-detected-problem">{signalAnalysis.detectedProblem}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                    <div className="flex items-start gap-2">
                      <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-primary">Custom Offer</p>
                        <p className="text-sm mt-1" data-testid="text-custom-offer">{signalAnalysis.customOffer}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 rounded-md bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="text-lg font-bold text-amber-700" data-testid="text-monthly-loss">
                          ${signalAnalysis.monthlyLoss.toLocaleString()}/month
                        </p>
                        <p className="text-xs text-muted-foreground">potential loss</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-md bg-blue-500/10 border border-blue-500/20">
                      <div className="flex items-center gap-1 mb-1">
                        <Shield className="h-3 w-3 text-blue-600" />
                        <span className="text-xs font-medium text-blue-700">Identity</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{signalAnalysis.identityStatement}</p>
                    </div>
                    <div className="p-2 rounded-md bg-red-500/10 border border-red-500/20">
                      <div className="flex items-center gap-1 mb-1">
                        <AlertTriangle className="h-3 w-3 text-red-600" />
                        <span className="text-xs font-medium text-red-700">Fear</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{signalAnalysis.fearTrigger}</p>
                    </div>
                    <div className="p-2 rounded-md bg-green-500/10 border border-green-500/20">
                      <div className="flex items-center gap-1 mb-1">
                        <Heart className="h-3 w-3 text-green-600" />
                        <span className="text-xs font-medium text-green-700">Desire</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{signalAnalysis.desireTrigger}</p>
                    </div>
                    <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <div className="flex items-center gap-1 mb-1">
                        <Clock3 className="h-3 w-3 text-amber-600" />
                        <span className="text-xs font-medium text-amber-700">Urgency</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{signalAnalysis.urgencyAngle}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg">Outreach</CardTitle>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => generateEmailMutation.mutate()}
                    disabled={generateEmailMutation.isPending}
                    data-testid="button-generate-email"
                  >
                    {generateEmailMutation.isPending ? (
                      <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Generating...</>
                    ) : (
                      <><Mail className="h-4 w-4 mr-1" /> Generate Email</>
                    )}
                  </Button>
                </div>
                {business.aiOutreachHook && (
                  <CardDescription className="mt-2" data-testid="text-outreach-hook">
                    {business.aiOutreachHook}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {latestEmail ? (
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Subject</div>
                      <div className="font-medium" data-testid="text-email-subject">{latestEmail.emailSubject}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground mb-1">Preview</div>
                      <p className="text-sm line-clamp-3">{latestEmail.emailBody}</p>
                    </div>
                    <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" data-testid="button-view-email">View Full Email</Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Generated Outreach Email</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Subject</div>
                            <div className="font-medium">{latestEmail.emailSubject}</div>
                          </div>
                          <div>
                            <div className="text-sm text-muted-foreground mb-1">Body</div>
                            <Textarea 
                              value={latestEmail.emailBody || ''} 
                              readOnly 
                              className="min-h-[200px]"
                            />
                          </div>
                          <Button onClick={() => copyToClipboard(`Subject: ${latestEmail.emailSubject}\n\n${latestEmail.emailBody}`)}>
                            {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
                            {copied ? 'Copied!' : 'Copy to Clipboard'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">Generate an AI-powered outreach email for this business</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-6">
          <Collapsible open={callCompanionOpen} onOpenChange={setCallCompanionOpen}>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger asChild>
                  <div className="flex items-center justify-between gap-4 cursor-pointer" data-testid="trigger-call-companion">
                    <div className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Call Companion</CardTitle>
                      {activeSession && (
                        <Badge variant="default" className="ml-2">Active Call</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${callCompanionOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CollapsibleTrigger>
              </CardHeader>
              
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {activeSession ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-4 p-4 rounded-md bg-muted">
                        <div>
                          <div className="font-medium">{activeSession.businessName}</div>
                          <div className="text-sm text-muted-foreground">
                            {activeSession.contactName} {activeSession.contactRole && `(${activeSession.contactRole})`}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-2xl font-mono font-bold" data-testid="text-call-timer">
                              {formatTime(elapsedSeconds)}
                            </div>
                            <p className="text-xs text-muted-foreground">Duration</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Select value={selectedDisposition} onValueChange={setSelectedDisposition}>
                              <SelectTrigger className="w-32" data-testid="select-disposition">
                                <SelectValue placeholder="Disposition" />
                              </SelectTrigger>
                              <SelectContent>
                                {CALL_DISPOSITIONS.map(d => (
                                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {isRunning ? (
                              <Button size="icon" variant="outline" onClick={pauseTimer} data-testid="button-pause-call">
                                <Pause className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button size="icon" variant="outline" onClick={resumeTimer} data-testid="button-resume-call">
                                <Play className="h-4 w-4" />
                              </Button>
                            )}
                            <Button size="icon" variant="destructive" onClick={endCall} data-testid="button-end-call">
                              <StopCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium flex items-center gap-2">
                          <Target className="h-4 w-4" /> Deal Score
                        </Label>
                        <div className="flex items-center gap-4">
                          <div className={`text-3xl font-bold ${getDealScoreColor(activeSession.dealScore || 50)}`} data-testid="text-call-deal-score">
                            {activeSession.dealScore || 50}
                          </div>
                          <Progress value={activeSession.dealScore || 50} className="flex-1 h-3" />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block">Buyer Type</Label>
                            <div className="flex flex-wrap gap-1">
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
                            <div className="flex flex-wrap gap-1">
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
                            <div className="flex flex-wrap gap-1">
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
                            <div className="flex flex-wrap gap-1">
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
                        </div>

                        <div className="space-y-3">
                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Objections
                            </Label>
                            <div className="grid grid-cols-2 gap-2">
                              {OBJECTION_TYPES.map(ot => {
                                const objection = activeSession.objections?.find(o => o.objectionType === ot.value);
                                const isActive = !!objection;
                                const isAddressed = objection?.addressed;
                                
                                return (
                                  <Button
                                    key={ot.value}
                                    size="sm"
                                    variant={isAddressed ? "default" : isActive ? "secondary" : "outline"}
                                    className="justify-start"
                                    onClick={() => handleObjectionToggle(ot.value)}
                                    data-testid={`button-objection-${ot.value}`}
                                  >
                                    {isAddressed ? <Check className="h-3 w-3 mr-1" /> : null}
                                    {ot.label}
                                  </Button>
                                );
                              })}
                            </div>
                          </div>

                          <div>
                            <Label className="text-xs text-muted-foreground mb-2 block flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> Pain Points
                            </Label>
                            <div className="flex gap-2 mb-2">
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
                            <ScrollArea className="h-[100px]">
                              {activeSession.painPoints && activeSession.painPoints.length > 0 ? (
                                <div className="space-y-1">
                                  {activeSession.painPoints.map((pp, idx) => (
                                    <div key={pp.id || idx} className="p-2 rounded-md bg-muted text-sm" data-testid={`pain-point-${pp.id || idx}`}>
                                      {pp.painText}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center text-muted-foreground text-xs">
                                  No pain points captured yet
                                </div>
                              )}
                            </ScrollArea>
                          </div>
                        </div>
                      </div>

                      {/* Notes Section */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <FileText className="h-3 w-3" /> Notes
                        </Label>
                        <Textarea
                          placeholder="Type anything... quotes, observations, follow-up items..."
                          value={activeSession.notes || ""}
                          onChange={(e) => updateCallSessionMutation.mutate({ id: activeSession.id, notes: e.target.value })}
                          className="min-h-[80px]"
                          data-testid="textarea-call-notes"
                        />
                      </div>

                      {/* What They Need Section */}
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="h-3 w-3" /> What They Need to Decide
                        </Label>
                        <div className="grid grid-cols-2 gap-2">
                          <label className="flex items-center gap-2 p-2 rounded-md bg-muted cursor-pointer">
                            <Checkbox
                              checked={activeSession.needsDemo || false}
                              onCheckedChange={(checked) => updateCallSessionMutation.mutate({ id: activeSession.id, needsDemo: !!checked })}
                              data-testid="checkbox-needs-demo"
                            />
                            <span className="text-sm">Demo</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-md bg-muted cursor-pointer">
                            <Checkbox
                              checked={activeSession.needsProposal || false}
                              onCheckedChange={(checked) => updateCallSessionMutation.mutate({ id: activeSession.id, needsProposal: !!checked })}
                              data-testid="checkbox-needs-proposal"
                            />
                            <span className="text-sm">Proposal</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-md bg-muted cursor-pointer">
                            <Checkbox
                              checked={activeSession.needsCaseStudy || false}
                              onCheckedChange={(checked) => updateCallSessionMutation.mutate({ id: activeSession.id, needsCaseStudy: !!checked })}
                              data-testid="checkbox-needs-case-study"
                            />
                            <span className="text-sm">Case Study</span>
                          </label>
                          <label className="flex items-center gap-2 p-2 rounded-md bg-muted cursor-pointer">
                            <Checkbox
                              checked={activeSession.needsTrial || false}
                              onCheckedChange={(checked) => updateCallSessionMutation.mutate({ id: activeSession.id, needsTrial: !!checked })}
                              data-testid="checkbox-needs-trial"
                            />
                            <span className="text-sm">Trial</span>
                          </label>
                        </div>
                      </div>

                      {/* Next Steps Section */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Next Action
                          </Label>
                          <Input
                            placeholder="Schedule demo, send proposal..."
                            value={activeSession.nextAction || ""}
                            onChange={(e) => updateCallSessionMutation.mutate({ id: activeSession.id, nextAction: e.target.value })}
                            data-testid="input-next-action"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Follow-up Date
                          </Label>
                          <Input
                            type="date"
                            value={activeSession.followUpDate ? new Date(activeSession.followUpDate).toISOString().split('T')[0] : ""}
                            onChange={(e) => updateCallSessionMutation.mutate({ id: activeSession.id, followUpDate: e.target.value ? new Date(e.target.value) : null })}
                            data-testid="input-follow-up-date"
                          />
                        </div>
                      </div>

                      {/* Strategy Generator */}
                      <Collapsible open={showStrategy} onOpenChange={setShowStrategy}>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" className="w-full justify-between" data-testid="button-show-strategy">
                            <span className="flex items-center gap-2">
                              <Lightbulb className="h-4 w-4 text-amber-500" /> Closing Strategy
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showStrategy ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3">
                          <div className="space-y-2 p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                            {getStrategyTips(activeSession).length > 0 ? (
                              getStrategyTips(activeSession).map((tip, idx) => (
                                <div key={idx} className="flex items-start gap-2 text-sm">
                                  <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                                  <span>{tip}</span>
                                </div>
                              ))
                            ) : (
                              <p className="text-sm text-muted-foreground">Capture more signals to get personalized closing tips</p>
                            )}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>

                      {/* Cheat Sheet */}
                      <Collapsible open={showCheatSheet} onOpenChange={setShowCheatSheet}>
                        <CollapsibleTrigger asChild>
                          <Button variant="outline" className="w-full justify-between" data-testid="button-show-cheatsheet">
                            <span className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-primary" /> Call Cheat Sheet
                            </span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${showCheatSheet ? 'rotate-180' : ''}`} />
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-3 space-y-4">
                          {/* Power Questions */}
                          <div className="p-3 rounded-md bg-primary/10 border border-primary/20">
                            <h4 className="text-xs font-medium text-primary mb-2 flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" /> Power Questions
                            </h4>
                            <div className="space-y-1">
                              {POWER_QUESTIONS.map((q, idx) => (
                                <div key={idx} className="text-sm p-1.5 rounded bg-background/50">{q}</div>
                              ))}
                            </div>
                          </div>

                          {/* Objection Responses */}
                          <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                            <h4 className="text-xs font-medium text-destructive mb-2 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" /> Objection Quick Responses
                            </h4>
                            <div className="space-y-2">
                              {Object.entries(OBJECTION_RESPONSES).map(([key, response]) => (
                                <div key={key} className="text-sm">
                                  <div className="font-medium capitalize">{key}:</div>
                                  <div className="text-muted-foreground text-xs">{response}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <p className="text-sm text-muted-foreground">Track calls, signals, and objections for this business</p>
                        <Dialog open={callDialogOpen} onOpenChange={setCallDialogOpen}>
                          <DialogTrigger asChild>
                            <Button data-testid="button-start-business-call">
                              <Play className="h-4 w-4 mr-1" /> Start Call
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Start Call with {business.name}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="p-3 rounded-md bg-muted">
                                <div className="text-sm font-medium">{business.name}</div>
                                <div className="text-xs text-muted-foreground">{getCategoryLabel(business.category)}</div>
                                {business.phone && <div className="text-xs text-muted-foreground">{business.phone}</div>}
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor="contactName">Contact Name</Label>
                                  <Input
                                    id="contactName"
                                    value={contactName}
                                    onChange={(e) => setContactName(e.target.value)}
                                    placeholder="Contact name"
                                    data-testid="input-contact-name"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor="contactRole">Role</Label>
                                  <Input
                                    id="contactRole"
                                    value={contactRole}
                                    onChange={(e) => setContactRole(e.target.value)}
                                    placeholder="Owner, Manager, etc."
                                    data-testid="input-contact-role"
                                  />
                                </div>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                onClick={handleStartCall}
                                disabled={createCallSessionMutation.isPending}
                                data-testid="button-confirm-start-call"
                              >
                                {createCallSessionMutation.isPending ? "Starting..." : "Start Call"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>

                      {loadingCalls ? (
                        <div className="space-y-2">
                          <Skeleton className="h-12 w-full" />
                          <Skeleton className="h-12 w-full" />
                        </div>
                      ) : callSessions && callSessions.length > 0 ? (
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Call History ({callSessions.length} calls)</Label>
                          <ScrollArea className="h-[300px]">
                            <div className="space-y-2">
                              {callSessions.map((session) => (
                                <div
                                  key={session.id}
                                  className="rounded-md border"
                                  data-testid={`session-${session.id}`}
                                >
                                  <div 
                                    className="flex items-center justify-between p-3 cursor-pointer hover-elevate"
                                    onClick={() => setExpandedCallId(expandedCallId === session.id ? null : session.id)}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="p-2 rounded-full bg-primary/10">
                                        <Phone className="h-3 w-3 text-primary" />
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium">{session.contactName || "Unknown Contact"}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {new Date(session.startedAt).toLocaleDateString()} at {new Date(session.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                          {session.durationMinutes ? ` • ${session.durationMinutes} min` : ''}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {session.dealScore !== null && session.dealScore !== undefined && (
                                        <Badge variant="secondary" className={getDealScoreColor(session.dealScore)}>
                                          Score: {session.dealScore}
                                        </Badge>
                                      )}
                                      <ChevronDown className={`h-4 w-4 transition-transform ${expandedCallId === session.id ? 'rotate-180' : ''}`} />
                                    </div>
                                  </div>
                                  
                                  {expandedCallId === session.id && (
                                    <div className="px-3 pb-3 pt-0 border-t space-y-3">
                                      <div className="grid grid-cols-2 gap-2 pt-3">
                                        <div>
                                          <span className="text-xs text-muted-foreground">Contact</span>
                                          <p className="text-sm">{session.contactName || 'N/A'} {session.contactRole ? `(${session.contactRole})` : ''}</p>
                                        </div>
                                        <div>
                                          <span className="text-xs text-muted-foreground">Status</span>
                                          <p className="text-sm capitalize">{session.status}</p>
                                        </div>
                                      </div>
                                      
                                      {(session.buyerType || session.urgency || session.authority || session.budget) && (
                                        <div>
                                          <span className="text-xs text-muted-foreground">Signals Captured</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {session.buyerType && <Badge variant="outline" className="text-xs">{BUYER_TYPES.find(b => b.value === session.buyerType)?.label || session.buyerType}</Badge>}
                                            {session.urgency && <Badge variant="outline" className="text-xs">{URGENCY_LEVELS.find(u => u.value === session.urgency)?.label || session.urgency}</Badge>}
                                            {session.authority && <Badge variant="outline" className="text-xs">{AUTHORITY_LEVELS.find(a => a.value === session.authority)?.label || session.authority}</Badge>}
                                            {session.budget && <Badge variant="outline" className="text-xs">{BUDGET_LEVELS.find(b => b.value === session.budget)?.label || session.budget}</Badge>}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {session.notes && (
                                        <div>
                                          <span className="text-xs text-muted-foreground">Notes</span>
                                          <p className="text-sm mt-1 whitespace-pre-wrap">{session.notes}</p>
                                        </div>
                                      )}
                                      
                                      {(session.needsDemo || session.needsProposal || session.needsCaseStudy || session.needsTrial) && (
                                        <div>
                                          <span className="text-xs text-muted-foreground">What They Need</span>
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {session.needsDemo && <Badge variant="secondary" className="text-xs">Demo</Badge>}
                                            {session.needsProposal && <Badge variant="secondary" className="text-xs">Proposal</Badge>}
                                            {session.needsCaseStudy && <Badge variant="secondary" className="text-xs">Case Study</Badge>}
                                            {session.needsTrial && <Badge variant="secondary" className="text-xs">Trial</Badge>}
                                          </div>
                                        </div>
                                      )}
                                      
                                      {(session.nextAction || session.followUpDate) && (
                                        <div>
                                          <span className="text-xs text-muted-foreground">Next Steps</span>
                                          {session.nextAction && <p className="text-sm mt-1">{session.nextAction}</p>}
                                          {session.followUpDate && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Follow-up: {new Date(session.followUpDate).toLocaleDateString()}
                                            </p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </div>
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          <Phone className="h-8 w-8 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">No call history for this business</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        <div className="mt-6">
          <IntelligencePanel business={business} />
        </div>

        <div className="mt-6">
          <ClaudeCopilot business={business} />
        </div>
      </main>

      <Dialog open={scriptsDialogOpen} onOpenChange={setScriptsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {business?.name} - Ultimate Outreach Scripts
            </DialogTitle>
          </DialogHeader>
          
          {ultimateScripts && (
            <ScrollArea className="max-h-[60vh]">
              <Tabs defaultValue="whatsapp" className="w-full">
                <TabsList className="w-full grid grid-cols-4">
                  <TabsTrigger value="whatsapp" className="flex items-center gap-1">
                    <SiWhatsapp className="w-4 h-4" /> WhatsApp
                  </TabsTrigger>
                  <TabsTrigger value="instagram" className="flex items-center gap-1">
                    <SiInstagram className="w-4 h-4" /> Instagram
                  </TabsTrigger>
                  <TabsTrigger value="email" className="flex items-center gap-1">
                    <Mail className="w-4 h-4" /> Email
                  </TabsTrigger>
                  <TabsTrigger value="followups" className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> Follow-ups
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="whatsapp" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">WhatsApp Message</span>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(ultimateScripts.whatsappScript)}>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                        {ultimateScripts.whatsappLink && (
                          <Button size="sm" asChild>
                            <a href={ultimateScripts.whatsappLink} target="_blank" rel="noopener">
                              <Send className="w-3 h-3 mr-1" /> Open WhatsApp
                            </a>
                          </Button>
                        )}
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                      {ultimateScripts.whatsappScript}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="instagram" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Instagram DM</span>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(ultimateScripts.instagramDm)}>
                        <Copy className="w-3 h-3 mr-1" /> Copy
                      </Button>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                      {ultimateScripts.instagramDm}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="email" className="mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Email</span>
                      <Button size="sm" variant="outline" onClick={() => copyToClipboard(`Subject: ${ultimateScripts.emailSubject}\n\n${ultimateScripts.emailBody}`)}>
                        <Copy className="w-3 h-3 mr-1" /> Copy All
                      </Button>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground">Subject</span>
                      <p className="text-sm font-medium">{ultimateScripts.emailSubject}</p>
                    </div>
                    <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                      {ultimateScripts.emailBody}
                    </pre>
                  </div>
                </TabsContent>

                <TabsContent value="followups" className="mt-4">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Day 3 Follow-up</span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(ultimateScripts.followUpDay3)}>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md font-mono">
                        {ultimateScripts.followUpDay3}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Day 7 Follow-up</span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(ultimateScripts.followUpDay7)}>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md font-mono">
                        {ultimateScripts.followUpDay7}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Day 14 Follow-up</span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(ultimateScripts.followUpDay14)}>
                          <Copy className="w-3 h-3 mr-1" /> Copy
                        </Button>
                      </div>
                      <pre className="whitespace-pre-wrap text-sm bg-muted p-3 rounded-md font-mono">
                        {ultimateScripts.followUpDay14}
                      </pre>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
