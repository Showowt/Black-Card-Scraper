import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, MessageSquare, Mic, FileText, Search, Send, Loader2, 
  Lightbulb, AlertTriangle, Target, DollarSign, TrendingUp, Zap,
  CheckCircle2, XCircle, Copy, Check, RefreshCw
} from "lucide-react";
import { SiInstagram } from "react-icons/si";
import type { Business } from "@shared/schema";

interface ClaudeCopilotProps {
  business: Business;
}

interface DeepScanResult {
  vertical: string;
  painPoints: string[];
  revenueLeakage: string[];
  recommendedSolutions: {
    starter: { name: string; desc: string; roi: string }[];
    core: { name: string; desc: string; roi: string }[];
    flagship: { name: string; desc: string; roi: string; price_range: string };
  };
  ownerPsychology: {
    fears: string[];
    wants: string[];
    objections: string[];
    leverage: string;
  };
  identityTransformation: {
    current: string;
    aspirational: string;
    gapStatement: string;
    transformation: string;
  };
  urgencyFactors: string[];
  competitorIntel: string[];
}

export default function ClaudeCopilot({ business }: ClaudeCopilotProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("deep-scan");
  const [conversationHistory, setConversationHistory] = useState("");
  const [theirMessage, setTheirMessage] = useState("");
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [reviews, setReviews] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [proposalTier, setProposalTier] = useState<"starter" | "core" | "flagship">("starter");
  const [deepScanData, setDeepScanData] = useState<DeepScanResult | null>(null);

  // Load cached deep scan data from localStorage on mount
  useEffect(() => {
    const cached = localStorage.getItem(`deepScan_${business.id}`);
    if (cached) {
      try {
        setDeepScanData(JSON.parse(cached));
      } catch (e) {
        console.error("Failed to parse cached deep scan data");
      }
    }
  }, [business.id]);

  const deepScanMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/copilot/deep-scan/${business.id}`, { 
        credentials: 'include' 
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed to fetch deep scan');
      }
      return res.json();
    },
    onSuccess: (data: DeepScanResult) => {
      setDeepScanData(data);
      // Cache to localStorage for persistence across page refreshes
      localStorage.setItem(`deepScan_${business.id}`, JSON.stringify(data));
      toast({ title: "Deep Scan Complete", description: "Vertical intelligence loaded" });
    },
    onError: (error: Error) => {
      toast({ title: "Deep Scan Failed", description: error.message, variant: "destructive" });
    },
  });

  const respondMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/copilot/respond", {
        businessId: business.id,
        theirMessage,
        conversationHistory,
        intent: "move toward booking a call",
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Response Generated", description: "Claude has drafted a response" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const objectionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/copilot/objection", {
        businessId: business.id,
        theirMessage,
        conversationHistory,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Objection Handled", description: "Claude analyzed the objection" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/copilot/analyze", {
        businessId: business.id,
        conversationHistory,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Analysis Complete", description: `Closing opportunity: ${data.closingOpportunity}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const voiceMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/copilot/voice", {
        businessId: business.id,
        transcript: voiceTranscript,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Voice Note Analyzed", description: `Interest level: ${data.interestLevel}%` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const reviewsMutation = useMutation({
    mutationFn: async () => {
      const reviewsArray = reviews.split("\n\n").filter(r => r.trim());
      const res = await apiRequest("POST", "/api/copilot/reviews", {
        businessId: business.id,
        reviews: reviewsArray,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Reviews Analyzed", description: `Found ${data.hooks?.length || 0} outreach hooks` });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const proposalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/copilot/proposal", {
        businessId: business.id,
        tier: proposalTier,
      });
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Proposal Generated", description: "AI-powered proposal is ready" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <Card data-testid="card-copilot">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Claude Copilot
        </CardTitle>
        <CardDescription>
          AI-powered sales intelligence and conversation assistance
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="deep-scan" data-testid="tab-deep-scan">
              <Search className="h-4 w-4 mr-1" /> Deep Scan
            </TabsTrigger>
            <TabsTrigger value="conversation" data-testid="tab-conversation">
              <MessageSquare className="h-4 w-4 mr-1" /> Chat
            </TabsTrigger>
            <TabsTrigger value="voice" data-testid="tab-voice">
              <Mic className="h-4 w-4 mr-1" /> Voice
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="tab-reviews">
              <Lightbulb className="h-4 w-4 mr-1" /> Reviews
            </TabsTrigger>
            <TabsTrigger value="proposal" data-testid="tab-proposal">
              <FileText className="h-4 w-4 mr-1" /> Proposal
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deep-scan">
            <div className="mb-4">
              <Button 
                onClick={() => deepScanMutation.mutate()} 
                disabled={deepScanMutation.isPending}
                data-testid="button-run-deep-scan"
              >
                {deepScanMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : deepScanData ? (
                  <RefreshCw className="h-4 w-4 mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                {deepScanData ? "Refresh Deep Scan" : "Run Deep Scan"}
              </Button>
            </div>
            {deepScanMutation.isPending ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : deepScanData ? (
              <ScrollArea className="h-[500px] pr-4">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      Pain Points
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {deepScanData.painPoints.slice(0, 5).map((point, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {point}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-red-500" />
                      Revenue Leakage
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {deepScanData.revenueLeakage.slice(0, 4).map((leak, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XCircle className="h-3 w-3 mt-1 text-red-400 shrink-0" />
                          {leak}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Zap className="h-4 w-4 text-yellow-500" />
                      Urgency Factors
                    </h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      {deepScanData.urgencyFactors.map((factor, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <AlertTriangle className="h-3 w-3 mt-1 text-yellow-400 shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      Identity Transformation
                    </h4>
                    <div className="bg-muted/50 rounded-md p-3 space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Current:</span>{" "}
                        {deepScanData.identityTransformation.current}
                      </div>
                      <div>
                        <span className="text-muted-foreground">Aspirational:</span>{" "}
                        {deepScanData.identityTransformation.aspirational}
                      </div>
                      <div className="pt-2 border-t border-border">
                        <span className="text-muted-foreground">Transformation:</span>{" "}
                        <span className="font-medium">{deepScanData.identityTransformation.transformation}</span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <Brain className="h-4 w-4 text-purple-500" />
                      Owner Psychology
                    </h4>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-red-500/10 rounded-md p-3">
                        <div className="text-xs text-red-400 mb-1">Fears</div>
                        <ul className="text-xs space-y-1">
                          {deepScanData.ownerPsychology.fears.slice(0, 2).map((fear, i) => (
                            <li key={i}>{fear}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-green-500/10 rounded-md p-3">
                        <div className="text-xs text-green-400 mb-1">Wants</div>
                        <ul className="text-xs space-y-1">
                          {deepScanData.ownerPsychology.wants.slice(0, 2).map((want, i) => (
                            <li key={i}>{want}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      <span className="font-medium">Leverage:</span> {deepScanData.ownerPsychology.leverage}
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      Recommended Solutions
                    </h4>
                    <div className="space-y-2">
                      <div className="bg-muted/30 rounded-md p-2">
                        <div className="text-xs text-muted-foreground mb-1">Starter</div>
                        {deepScanData.recommendedSolutions.starter.slice(0, 1).map((sol, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{sol.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">ROI: {sol.roi}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-blue-500/10 rounded-md p-2">
                        <div className="text-xs text-blue-400 mb-1">Core (Recommended)</div>
                        {deepScanData.recommendedSolutions.core.slice(0, 1).map((sol, i) => (
                          <div key={i} className="text-sm">
                            <span className="font-medium">{sol.name}</span>
                            <span className="text-muted-foreground ml-2 text-xs">ROI: {sol.roi}</span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-purple-500/10 rounded-md p-2">
                        <div className="text-xs text-purple-400 mb-1">Flagship</div>
                        <div className="text-sm">
                          <span className="font-medium">{deepScanData.recommendedSolutions.flagship.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">
                            {deepScanData.recommendedSolutions.flagship.price_range}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-2">
                  Click "Run Deep Scan" to analyze this business
                </p>
                <p className="text-xs text-muted-foreground">
                  Get vertical-specific pain points, psychology insights, and recommended solutions
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="conversation">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Conversation History (optional)</label>
                <Textarea
                  placeholder="Paste your previous conversation..."
                  value={conversationHistory}
                  onChange={(e) => setConversationHistory(e.target.value)}
                  className="min-h-[80px]"
                  data-testid="textarea-conversation-history"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Their Latest Message</label>
                <Textarea
                  placeholder="What did they say?"
                  value={theirMessage}
                  onChange={(e) => setTheirMessage(e.target.value)}
                  className="min-h-[60px]"
                  data-testid="textarea-their-message"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => respondMutation.mutate()} 
                  disabled={!theirMessage || respondMutation.isPending}
                  data-testid="button-draft-response"
                >
                  {respondMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Draft Response
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => objectionMutation.mutate()} 
                  disabled={!theirMessage || objectionMutation.isPending}
                  data-testid="button-handle-objection"
                >
                  {objectionMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 mr-2" />
                  )}
                  Handle Objection
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => analyzeMutation.mutate()} 
                  disabled={!conversationHistory || analyzeMutation.isPending}
                  data-testid="button-analyze-conversation"
                >
                  {analyzeMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <TrendingUp className="h-4 w-4 mr-2" />
                  )}
                  Analyze
                </Button>
              </div>

              {respondMutation.data && (
                <div className="bg-muted/50 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Suggested Response</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(respondMutation.data.draftResponse, "response")}
                    >
                      {copiedField === "response" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                  <p className="text-sm">{respondMutation.data.draftResponse}</p>
                  <div className="text-xs text-muted-foreground">
                    Psychology: {respondMutation.data.psychologyUsed}
                  </div>
                </div>
              )}

              {objectionMutation.data && (
                <div className="bg-orange-500/10 rounded-md p-3 space-y-2">
                  <div className="text-sm font-medium">
                    Objection Detected: {objectionMutation.data.detectedObjection}
                  </div>
                  <p className="text-sm">{objectionMutation.data.suggestedResponse}</p>
                  <div className="text-xs text-muted-foreground">
                    Framework: {objectionMutation.data.framework} | {objectionMutation.data.toneGuidance}
                  </div>
                </div>
              )}

              {analyzeMutation.data && (
                <div className="bg-blue-500/10 rounded-md p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Conversation Analysis</span>
                    <Badge>{analyzeMutation.data.closingOpportunity}% Close Rate</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Sentiment:</span> {analyzeMutation.data.sentiment}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Next:</span> {analyzeMutation.data.nextAction}
                    </div>
                  </div>
                  {analyzeMutation.data.buyingSignals?.length > 0 && (
                    <div className="text-xs">
                      <span className="text-green-400">Buying Signals:</span>{" "}
                      {analyzeMutation.data.buyingSignals.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="voice">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Voice Note Transcript</label>
                <Textarea
                  placeholder="Paste or type the voice note transcript..."
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-voice-transcript"
                />
              </div>
              <Button 
                onClick={() => voiceMutation.mutate()} 
                disabled={!voiceTranscript || voiceMutation.isPending}
                data-testid="button-analyze-voice"
              >
                {voiceMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Mic className="h-4 w-4 mr-2" />
                )}
                Analyze Voice Note
              </Button>

              {voiceMutation.data && (
                <div className="space-y-3">
                  <div className="bg-muted/50 rounded-md p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Summary</span>
                      <Badge variant={
                        voiceMutation.data.urgency === "high" ? "destructive" : 
                        voiceMutation.data.urgency === "medium" ? "default" : "secondary"
                      }>
                        {voiceMutation.data.urgency} priority
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{voiceMutation.data.transcriptSummary}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/30 rounded-md p-2">
                      <div className="text-xs text-muted-foreground mb-1">Sentiment</div>
                      <div className="text-sm font-medium">{voiceMutation.data.sentiment}</div>
                    </div>
                    <div className="bg-muted/30 rounded-md p-2">
                      <div className="text-xs text-muted-foreground mb-1">Interest Level</div>
                      <div className="text-sm font-medium">{voiceMutation.data.interestLevel}%</div>
                    </div>
                  </div>
                  {voiceMutation.data.questionsAsked?.length > 0 && (
                    <div className="bg-blue-500/10 rounded-md p-3">
                      <div className="text-xs text-blue-400 mb-1">Questions to Answer</div>
                      <ul className="text-sm space-y-1">
                        {voiceMutation.data.questionsAsked.map((q: string, i: number) => (
                          <li key={i}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="bg-green-500/10 rounded-md p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-green-400">Suggested Response</span>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(voiceMutation.data.suggestedResponse, "voice")}
                      >
                        {copiedField === "voice" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                      </Button>
                    </div>
                    <p className="text-sm">{voiceMutation.data.suggestedResponse}</p>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="reviews">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Google Reviews</label>
                <Textarea
                  placeholder="Paste Google reviews here (separate with blank lines)..."
                  value={reviews}
                  onChange={(e) => setReviews(e.target.value)}
                  className="min-h-[120px]"
                  data-testid="textarea-reviews"
                />
              </div>
              <Button 
                onClick={() => reviewsMutation.mutate()} 
                disabled={!reviews || reviewsMutation.isPending}
                data-testid="button-analyze-reviews"
              >
                {reviewsMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Lightbulb className="h-4 w-4 mr-2" />
                )}
                Find Outreach Hooks
              </Button>

              {reviewsMutation.data && (
                <div className="space-y-3">
                  {reviewsMutation.data.hooks?.length > 0 && (
                    <div className="bg-green-500/10 rounded-md p-3">
                      <div className="text-xs text-green-400 mb-2">Outreach Hooks</div>
                      <div className="flex flex-wrap gap-1">
                        {reviewsMutation.data.hooks.map((hook: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {hook}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {reviewsMutation.data.suggestedOpener && (
                    <div className="bg-blue-500/10 rounded-md p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-blue-400">Personalized Opener</span>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => copyToClipboard(reviewsMutation.data.suggestedOpener, "opener")}
                        >
                          {copiedField === "opener" ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                        </Button>
                      </div>
                      <p className="text-sm">{reviewsMutation.data.suggestedOpener}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    {reviewsMutation.data.positiveThemes?.length > 0 && (
                      <div className="bg-green-500/5 rounded-md p-2">
                        <div className="text-xs text-green-400 mb-1">Positive</div>
                        <ul className="text-xs space-y-1">
                          {reviewsMutation.data.positiveThemes.slice(0, 3).map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {reviewsMutation.data.negativeThemes?.length > 0 && (
                      <div className="bg-red-500/5 rounded-md p-2">
                        <div className="text-xs text-red-400 mb-1">Pain Points</div>
                        <ul className="text-xs space-y-1">
                          {reviewsMutation.data.negativeThemes.slice(0, 3).map((t: string, i: number) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    <span className="font-medium">Best Angle:</span> {reviewsMutation.data.outreachAngle}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="proposal">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Select Solution Tier</label>
                <div className="flex gap-2">
                  {(["starter", "core", "flagship"] as const).map((tier) => (
                    <Button
                      key={tier}
                      variant={proposalTier === tier ? "default" : "outline"}
                      onClick={() => setProposalTier(tier)}
                      className="flex-1 capitalize"
                      data-testid={`button-tier-${tier}`}
                    >
                      {tier}
                    </Button>
                  ))}
                </div>
              </div>
              <Button 
                onClick={() => proposalMutation.mutate()} 
                disabled={proposalMutation.isPending}
                className="w-full"
                data-testid="button-generate-proposal"
              >
                {proposalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Generate {proposalTier} Proposal
              </Button>

              {proposalMutation.data && (
                <ScrollArea className="h-[350px] pr-4">
                  <div className="space-y-4">
                    <div className="bg-muted/50 rounded-md p-3">
                      <div className="text-xs text-muted-foreground mb-1">Executive Summary</div>
                      <p className="text-sm">{proposalMutation.data.executiveSummary}</p>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">Problem Statement</div>
                      <p className="text-sm">{proposalMutation.data.problemStatement}</p>
                    </div>
                    <div className="bg-blue-500/10 rounded-md p-3">
                      <div className="font-medium mb-1">{proposalMutation.data.solution?.name}</div>
                      <p className="text-sm text-muted-foreground mb-2">{proposalMutation.data.solution?.description}</p>
                      {proposalMutation.data.solution?.features && (
                        <ul className="text-xs space-y-1">
                          {proposalMutation.data.solution.features.map((f: string, i: number) => (
                            <li key={i} className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-green-400" />
                              {f}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/30 rounded-md p-2 text-center">
                        <div className="text-xs text-muted-foreground">Setup</div>
                        <div className="text-sm font-medium">{proposalMutation.data.investment?.setup}</div>
                      </div>
                      <div className="bg-muted/30 rounded-md p-2 text-center">
                        <div className="text-xs text-muted-foreground">Monthly</div>
                        <div className="text-sm font-medium">{proposalMutation.data.investment?.monthly}</div>
                      </div>
                      <div className="bg-green-500/10 rounded-md p-2 text-center">
                        <div className="text-xs text-green-400">ROI</div>
                        <div className="text-sm font-medium">{proposalMutation.data.investment?.roi}</div>
                      </div>
                    </div>
                    <div className="text-xs">
                      <span className="text-muted-foreground">Timeline:</span> {proposalMutation.data.timeline}
                    </div>
                    {proposalMutation.data.guarantees?.length > 0 && (
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Guarantees</div>
                        <ul className="text-xs space-y-1">
                          {proposalMutation.data.guarantees.map((g: string, i: number) => (
                            <li key={i} className="flex items-center gap-1">
                              <CheckCircle2 className="h-3 w-3 text-blue-400" />
                              {g}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
