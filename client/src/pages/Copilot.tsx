import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, MessageCircle, AlertTriangle, BarChart3, Send,
  Copy, Loader2, Sparkles, Lightbulb, Target, TrendingUp,
  ChevronRight, Clock, CheckCircle2, XCircle
} from "lucide-react";
import { SiWhatsapp } from "react-icons/si";
import type { Business } from "@shared/schema";
import { CITIES, CATEGORIES, PSYCHOLOGY_FRAMEWORKS, OBJECTION_PATTERNS } from "@shared/schema";

interface ResponseDraft {
  draftResponse: string;
  psychologyUsed: string;
  nextSteps: string[];
  warnings: string[];
}

interface ObjectionResult {
  detectedObjection: string;
  framework: string;
  suggestedResponse: string;
  alternativeResponses: string[];
  toneGuidance: string;
}

interface ConversationAnalysis {
  sentiment: string;
  buyingSignals: string[];
  objections: string[];
  nextAction: string;
  closingOpportunity: number;
}

const objectionLabels: Record<string, { label: string; color: string }> = {
  price: { label: "Price Objection", color: "bg-red-500/20 text-red-700" },
  time: { label: "Time Objection", color: "bg-amber-500/20 text-amber-700" },
  skepticism: { label: "Skepticism", color: "bg-purple-500/20 text-purple-700" },
  existing_solution: { label: "Has Solution", color: "bg-blue-500/20 text-blue-700" },
  not_now: { label: "Not Now", color: "bg-gray-500/20 text-gray-700" },
  general_hesitation: { label: "Hesitation", color: "bg-slate-500/20 text-slate-700" },
};

const frameworkLabels: Record<string, { label: string; color: string }> = {
  loss_aversion: { label: "Loss Aversion", color: "bg-red-500/20 text-red-700" },
  social_proof: { label: "Social Proof", color: "bg-blue-500/20 text-blue-700" },
  reciprocity: { label: "Reciprocity", color: "bg-green-500/20 text-green-700" },
  scarcity: { label: "Scarcity", color: "bg-amber-500/20 text-amber-700" },
};

const sentimentColors: Record<string, string> = {
  positive: "text-green-600",
  interested: "text-blue-600",
  neutral: "text-gray-600",
  skeptical: "text-amber-600",
  negative: "text-red-600",
};

export default function Copilot() {
  const { toast } = useToast();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>("");
  const [theirMessage, setTheirMessage] = useState<string>("");
  const [conversationHistory, setConversationHistory] = useState<string>("");
  const [intent, setIntent] = useState<string>("");
  const [responseResult, setResponseResult] = useState<ResponseDraft | null>(null);
  const [objectionResult, setObjectionResult] = useState<ObjectionResult | null>(null);
  const [analysisResult, setAnalysisResult] = useState<ConversationAnalysis | null>(null);

  const { data: businesses, isLoading: loadingBusinesses } = useQuery<Business[]>({
    queryKey: ["/api/businesses", "enriched"],
    queryFn: async () => {
      const res = await fetch("/api/businesses?isEnriched=true&limit=100", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch businesses");
      return res.json();
    },
  });

  const draftResponseMutation = useMutation({
    mutationFn: async (data: { businessId: string; theirMessage: string; conversationHistory?: string; intent?: string }) => {
      const res = await apiRequest("POST", "/api/copilot/respond", data);
      return res.json();
    },
    onSuccess: (result: ResponseDraft) => {
      setResponseResult(result);
      toast({ title: "Response Drafted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleObjectionMutation = useMutation({
    mutationFn: async (data: { businessId: string; theirMessage: string; conversationHistory?: string }) => {
      const res = await apiRequest("POST", "/api/copilot/objection", data);
      return res.json();
    },
    onSuccess: (result: ObjectionResult) => {
      setObjectionResult(result);
      toast({ title: "Objection Analyzed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const analyzeConversationMutation = useMutation({
    mutationFn: async (data: { businessId: string; conversationHistory: string }) => {
      const res = await apiRequest("POST", "/api/copilot/analyze", data);
      return res.json();
    },
    onSuccess: (result: ConversationAnalysis) => {
      setAnalysisResult(result);
      toast({ title: "Conversation Analyzed" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const selectedBusiness = businesses?.find(b => b.id === selectedBusinessId);

  const handleDraftResponse = () => {
    if (!selectedBusinessId || !theirMessage) {
      toast({ title: "Missing Info", description: "Select a business and enter their message", variant: "destructive" });
      return;
    }
    draftResponseMutation.mutate({
      businessId: selectedBusinessId,
      theirMessage,
      conversationHistory: conversationHistory || undefined,
      intent: intent || undefined,
    });
  };

  const handleObjection = () => {
    if (!selectedBusinessId || !theirMessage) {
      toast({ title: "Missing Info", description: "Select a business and enter their message", variant: "destructive" });
      return;
    }
    handleObjectionMutation.mutate({
      businessId: selectedBusinessId,
      theirMessage,
      conversationHistory: conversationHistory || undefined,
    });
  };

  const handleAnalyze = () => {
    if (!selectedBusinessId || !conversationHistory) {
      toast({ title: "Missing Info", description: "Select a business and enter conversation history", variant: "destructive" });
      return;
    }
    analyzeConversationMutation.mutate({
      businessId: selectedBusinessId,
      conversationHistory,
    });
  };

  return (
    <div className="space-y-6 p-6" data-testid="copilot-page">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Claude Copilot</h1>
            <p className="text-muted-foreground">
              AI-powered response drafting and objection handling
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Enter the conversation details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Business</label>
              <Select value={selectedBusinessId} onValueChange={setSelectedBusinessId}>
                <SelectTrigger data-testid="select-business">
                  <SelectValue placeholder="Choose a business" />
                </SelectTrigger>
                <SelectContent>
                  <ScrollArea className="h-[300px]">
                    {businesses?.map(business => (
                      <SelectItem key={business.id} value={business.id}>
                        <div className="flex items-center gap-2">
                          <span>{business.name}</span>
                          <span className="text-xs text-muted-foreground">
                            ({business.category}, {business.city})
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </ScrollArea>
                </SelectContent>
              </Select>
            </div>

            {selectedBusiness && (
              <div className="p-3 bg-muted rounded-lg text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{selectedBusiness.name}</span>
                  <Badge>{selectedBusiness.aiScore || "-"} pts</Badge>
                </div>
                <div className="text-muted-foreground text-xs mt-1">
                  {selectedBusiness.category} - {selectedBusiness.city}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Their Message</label>
              <Textarea
                placeholder="What did they say? e.g., 'Es muy caro' or 'No tengo tiempo ahora'"
                value={theirMessage}
                onChange={(e) => setTheirMessage(e.target.value)}
                className="min-h-[100px]"
                data-testid="input-their-message"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Conversation History (Optional)</label>
              <Textarea
                placeholder="Paste previous messages here for context..."
                value={conversationHistory}
                onChange={(e) => setConversationHistory(e.target.value)}
                className="min-h-[80px]"
                data-testid="input-conversation-history"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Intent (Optional)</label>
              <Input
                placeholder="e.g., 'Get them on a call' or 'Send pricing'"
                value={intent}
                onChange={(e) => setIntent(e.target.value)}
                data-testid="input-intent"
              />
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={handleDraftResponse}
                disabled={draftResponseMutation.isPending || !selectedBusinessId || !theirMessage}
                data-testid="button-draft-response"
              >
                {draftResponseMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-2" />
                )}
                Draft Response
              </Button>
              <Button 
                variant="outline"
                onClick={handleObjection}
                disabled={handleObjectionMutation.isPending || !selectedBusinessId || !theirMessage}
                data-testid="button-handle-objection"
              >
                {handleObjectionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <AlertTriangle className="h-4 w-4 mr-2" />
                )}
                Handle Objection
              </Button>
              <Button 
                variant="outline"
                onClick={handleAnalyze}
                disabled={analyzeConversationMutation.isPending || !selectedBusinessId || !conversationHistory}
                data-testid="button-analyze"
              >
                {analyzeConversationMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <BarChart3 className="h-4 w-4 mr-2" />
                )}
                Analyze
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {responseResult && (
            <Card data-testid="response-result">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" />
                    Drafted Response
                  </CardTitle>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    onClick={() => copyToClipboard(responseResult.draftResponse)}
                  >
                    <Copy className="h-4 w-4 mr-1" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm whitespace-pre-wrap text-green-900 dark:text-green-100">{responseResult.draftResponse}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium">Psychology:</span>
                  <span className="text-sm text-muted-foreground">{responseResult.psychologyUsed}</span>
                </div>

                {responseResult.nextSteps.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium">Next Steps</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      {responseResult.nextSteps.map((step, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <ChevronRight className="h-3 w-3 mt-1 flex-shrink-0" />
                          {step}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {responseResult.warnings.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-medium">Watch For</span>
                    </div>
                    <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                      {responseResult.warnings.map((warning, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <XCircle className="h-3 w-3 mt-1 flex-shrink-0 text-red-500" />
                          {warning}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {objectionResult && (
            <Card data-testid="objection-result">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Objection Handling
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge className={objectionLabels[objectionResult.detectedObjection]?.color || ""}>
                      {objectionLabels[objectionResult.detectedObjection]?.label || objectionResult.detectedObjection}
                    </Badge>
                    <Badge className={frameworkLabels[objectionResult.framework]?.color || ""}>
                      {frameworkLabels[objectionResult.framework]?.label || objectionResult.framework}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Suggested Response</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(objectionResult.suggestedResponse)}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm whitespace-pre-wrap text-blue-900 dark:text-blue-100">{objectionResult.suggestedResponse}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-sm font-medium">Alternatives</span>
                  {objectionResult.alternativeResponses.map((alt, i) => (
                    <div key={i} className="p-3 bg-muted rounded-lg flex items-start justify-between gap-2">
                      <p className="text-sm">{alt}</p>
                      <Button 
                        size="icon" 
                        variant="ghost"
                        className="flex-shrink-0"
                        onClick={() => copyToClipboard(alt)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-lg border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb className="h-4 w-4 text-amber-600" />
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-100">Tone Guidance</span>
                  </div>
                  <p className="text-sm text-amber-800 dark:text-amber-200">{objectionResult.toneGuidance}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {analysisResult && (
            <Card data-testid="analysis-result">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Conversation Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Sentiment</span>
                    <p className={`text-lg font-medium capitalize ${sentimentColors[analysisResult.sentiment] || ""}`}>
                      {analysisResult.sentiment}
                    </p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <span className="text-xs text-muted-foreground">Closing Chance</span>
                    <p className="text-lg font-medium">
                      {analysisResult.closingOpportunity}%
                    </p>
                  </div>
                </div>

                {analysisResult.buyingSignals.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-sm font-medium">Buying Signals</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.buyingSignals.map((signal, i) => (
                        <Badge key={i} variant="outline" className="bg-green-50 dark:bg-green-950/20">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {analysisResult.objections.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-sm font-medium">Objections Raised</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {analysisResult.objections.map((obj, i) => (
                        <Badge key={i} variant="outline" className="bg-red-50 dark:bg-red-950/20">
                          {obj}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="p-3 bg-primary/10 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">Recommended Action</span>
                  </div>
                  <p className="text-sm">{analysisResult.nextAction}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!responseResult && !objectionResult && !analysisResult && (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Brain className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  Select a business and enter their message to get AI-powered assistance
                </p>
                <div className="flex flex-wrap gap-2 mt-4 justify-center">
                  <Badge variant="outline">Draft Responses</Badge>
                  <Badge variant="outline">Handle Objections</Badge>
                  <Badge variant="outline">Analyze Conversations</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Psychology Quick Reference</CardTitle>
          <CardDescription>The 4 frameworks used for outreach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(PSYCHOLOGY_FRAMEWORKS).map(([key, framework]) => (
              <div key={key} className="p-4 border rounded-lg">
                <Badge className={frameworkLabels[key]?.color || ""} >
                  {framework.name}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  {framework.description}
                </p>
                <div className="mt-3">
                  <span className="text-xs font-medium">Trigger words:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {framework.triggers.slice(0, 3).map((trigger, i) => (
                      <code key={i} className="text-xs bg-muted px-1 rounded">
                        {trigger}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
