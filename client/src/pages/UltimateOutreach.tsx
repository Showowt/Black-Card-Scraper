import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  MessageCircle, Mail, Send, Clock, CheckCircle2,
  Copy, ExternalLink, Building2, Loader2, Sparkles, Brain,
  Phone, Globe, Star, TrendingUp, AlertTriangle, Zap,
  DollarSign, Target, Heart, Shield, Clock3, ChevronRight,
  RefreshCw
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import { Link } from "wouter";
import type { Business } from "@shared/schema";
import { CITIES, CATEGORIES } from "@shared/schema";

interface SignalAnalysis {
  detectedSignals: string[];
  detectedProblem: string;
  customOffer: string;
  monthlyLoss: number;
  lossExplanation: string;
  identityStatement: string;
  fearTrigger: string;
  desireTrigger: string;
  urgencyAngle: string;
  painPoints: string[];
  hookAngles: string[];
}

interface MultiChannelScripts {
  whatsappScript: string;
  whatsappLink: string;
  instagramDm: string;
  emailSubject: string;
  emailBody: string;
  followUpDay3: string;
  followUpDay7: string;
  followUpDay14: string;
}

interface AnalyzedBusiness {
  business: Business;
  analysis: SignalAnalysis;
}

interface UltimateOutreachResult {
  total: number;
  businesses: AnalyzedBusiness[];
}

export default function UltimateOutreach() {
  const { toast } = useToast();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBusiness, setSelectedBusiness] = useState<AnalyzedBusiness | null>(null);
  const [scripts, setScripts] = useState<MultiChannelScripts | null>(null);
  const [scriptsDialogOpen, setScriptsDialogOpen] = useState(false);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [senderName, setSenderName] = useState("Carlos");
  const [batchLimit, setBatchLimit] = useState(20);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedCity !== "all") params.set("city", selectedCity);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    params.set("limit", "100");
    return params.toString();
  };

  const { data, isLoading, refetch } = useQuery<UltimateOutreachResult>({
    queryKey: ["/api/ultimate-outreach", selectedCity, selectedCategory],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const res = await fetch(`/api/ultimate-outreach?${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch businesses");
      return res.json();
    },
  });

  const generateMutation = useMutation({
    mutationFn: async ({ businessId }: { businessId: string }) => {
      const res = await apiRequest("POST", "/api/ultimate-outreach/generate", { businessId, senderName });
      return res.json();
    },
    onSuccess: (result) => {
      setScripts(result.scripts);
      setScriptsDialogOpen(true);
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes("/api/outreach") || String(query.queryKey[0]).includes("/api/ultimate")
      });
      toast({ title: "Scripts Generated", description: `Problem: ${result.analysis.detectedProblem.slice(0, 50)}...` });
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const batchGenerateMutation = useMutation({
    mutationFn: async () => {
      const filters: any = {};
      if (selectedCity !== "all") filters.city = selectedCity;
      if (selectedCategory !== "all") filters.category = selectedCategory;
      const res = await apiRequest("POST", "/api/ultimate-outreach/batch", { 
        filters: Object.keys(filters).length > 0 ? filters : undefined,
        limit: batchLimit,
        senderName
      });
      return res.json();
    },
    onSuccess: (result) => {
      setBatchDialogOpen(false);
      queryClient.invalidateQueries({ predicate: (query) => 
        String(query.queryKey[0]).includes("/api/outreach") || String(query.queryKey[0]).includes("/api/ultimate")
      });
      toast({ 
        title: "Batch Generation Complete", 
        description: `Generated ${result.generated} campaigns, $${result.totalMonthlyLoss?.toLocaleString() || 0} total monthly loss identified` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Batch Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${type} copied to clipboard` });
  };

  const openWhatsApp = (link: string) => {
    if (link) window.open(link, "_blank");
  };

  const totalMonthlyLoss = data?.businesses?.reduce((sum, b) => sum + (b.analysis.monthlyLoss || 0), 0) || 0;
  const avgLoss = data?.businesses?.length ? Math.round(totalMonthlyLoss / data.businesses.length) : 0;

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <Zap className="w-6 h-6 text-primary" />
            Ultimate Outreach System
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Signal-based intelligence with psychology-driven multi-channel scripts
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger className="w-36" data-testid="select-city">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Cities</SelectItem>
              {CITIES.map(city => (
                <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40" data-testid="select-category">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()} data-testid="button-refresh">
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button onClick={() => setBatchDialogOpen(true)} data-testid="button-batch-generate">
            <Sparkles className="w-4 h-4 mr-2" />
            Batch Generate
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-primary/10">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-prospects">{data?.total || 0}</p>
                <p className="text-xs text-muted-foreground">Outreach-Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-destructive/10">
                <DollarSign className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-total-loss">${totalMonthlyLoss.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Total Monthly Loss</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-amber-500/10">
                <TrendingUp className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-avg-loss">${avgLoss.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground">Avg Loss/Business</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-green-500/10">
                <SiWhatsapp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold" data-testid="text-with-whatsapp">
                  {data?.businesses?.filter(b => b.business.whatsapp || b.business.phone).length || 0}
                </p>
                <p className="text-xs text-muted-foreground">With Contact</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data?.businesses?.map(({ business, analysis }) => (
            <Card key={business.id} className="flex flex-col" data-testid={`card-business-${business.id}`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-base truncate">{business.name}</CardTitle>
                    <CardDescription className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{business.category}</Badge>
                      <span className="text-xs">{business.city}</span>
                    </CardDescription>
                  </div>
                  {business.rating && (
                    <Badge variant="secondary" className="flex items-center gap-1 shrink-0">
                      <Star className="w-3 h-3" /> {business.rating}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-start gap-2 p-2 rounded-md bg-destructive/5 border border-destructive/20">
                    <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-destructive">Problem Detected</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{analysis.detectedProblem}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                    <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs font-medium text-primary">Custom Offer</p>
                      <p className="text-xs text-muted-foreground line-clamp-2">{analysis.customOffer}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between p-2 rounded-md bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-amber-600" />
                      <span className="text-sm font-bold text-amber-700">${analysis.monthlyLoss.toLocaleString()}/mo</span>
                    </div>
                    <span className="text-xs text-muted-foreground">potential loss</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1">
                  {business.whatsapp && (
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      <SiWhatsapp className="w-3 h-3 mr-1" /> WhatsApp
                    </Badge>
                  )}
                  {business.phone && !business.whatsapp && (
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      <Phone className="w-3 h-3 mr-1" /> Phone
                    </Badge>
                  )}
                  {business.instagram && (
                    <Badge variant="outline" className="text-pink-600 border-pink-300">
                      <SiInstagram className="w-3 h-3 mr-1" /> IG
                    </Badge>
                  )}
                  {business.email && (
                    <Badge variant="outline" className="text-blue-600 border-blue-300">
                      <Mail className="w-3 h-3 mr-1" /> Email
                    </Badge>
                  )}
                </div>
              </CardContent>
              <CardFooter className="pt-0 gap-2">
                <Button 
                  variant="default" 
                  className="flex-1"
                  onClick={() => {
                    setSelectedBusiness({ business, analysis });
                    generateMutation.mutate({ businessId: business.id });
                  }}
                  disabled={generateMutation.isPending}
                  data-testid={`button-generate-${business.id}`}
                >
                  {generateMutation.isPending && selectedBusiness?.business.id === business.id ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  Generate Scripts
                </Button>
                <Button variant="outline" size="icon" asChild data-testid={`button-view-${business.id}`}>
                  <Link href={`/business/${business.id}`}>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={scriptsDialogOpen} onOpenChange={setScriptsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-primary" />
              {selectedBusiness?.business.name} - Ultimate Outreach Scripts
            </DialogTitle>
            <DialogDescription>
              Signal-based intelligence with psychology-driven messaging
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-6 p-1">
              {selectedBusiness && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-medium text-blue-700">Identity</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedBusiness.analysis.identityStatement}</p>
                  </div>
                  <div className="p-3 rounded-md bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-xs font-medium text-red-700">Fear</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedBusiness.analysis.fearTrigger}</p>
                  </div>
                  <div className="p-3 rounded-md bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Heart className="w-4 h-4 text-green-600" />
                      <span className="text-xs font-medium text-green-700">Desire</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedBusiness.analysis.desireTrigger}</p>
                  </div>
                  <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock3 className="w-4 h-4 text-amber-600" />
                      <span className="text-xs font-medium text-amber-700">Urgency</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-3">{selectedBusiness.analysis.urgencyAngle}</p>
                  </div>
                </div>
              )}

              {scripts && (
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

                  <TabsContent value="whatsapp" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <SiWhatsapp className="w-4 h-4 text-green-600" />
                            WhatsApp Script
                          </CardTitle>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(scripts.whatsappScript, "WhatsApp script")}>
                              <Copy className="w-3 h-3 mr-1" /> Copy
                            </Button>
                            {scripts.whatsappLink && (
                              <Button size="sm" onClick={() => openWhatsApp(scripts.whatsappLink)}>
                                <Send className="w-3 h-3 mr-1" /> Open WhatsApp
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                          {scripts.whatsappScript}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="instagram" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <SiInstagram className="w-4 h-4 text-pink-600" />
                            Instagram DM
                          </CardTitle>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(scripts.instagramDm, "Instagram DM")}>
                            <Copy className="w-3 h-3 mr-1" /> Copy
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                          {scripts.instagramDm}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="email" className="mt-4 space-y-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Mail className="w-4 h-4 text-blue-600" />
                            Email
                          </CardTitle>
                          <Button size="sm" variant="outline" onClick={() => copyToClipboard(`Subject: ${scripts.emailSubject}\n\n${scripts.emailBody}`, "Email")}>
                            <Copy className="w-3 h-3 mr-1" /> Copy All
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-xs text-muted-foreground">Subject</Label>
                          <p className="text-sm font-medium">{scripts.emailSubject}</p>
                        </div>
                        <Separator />
                        <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                          {scripts.emailBody}
                        </pre>
                      </CardContent>
                    </Card>
                  </TabsContent>

                  <TabsContent value="followups" className="mt-4 space-y-4">
                    <div className="grid gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" /> Day 3 Follow-up
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(scripts.followUpDay3, "Day 3 follow-up")}>
                              <Copy className="w-3 h-3 mr-1" /> Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                            {scripts.followUpDay3}
                          </pre>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" /> Day 7 Follow-up
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(scripts.followUpDay7, "Day 7 follow-up")}>
                              <Copy className="w-3 h-3 mr-1" /> Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                            {scripts.followUpDay7}
                          </pre>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Clock className="w-4 h-4" /> Day 14 Follow-up
                            </CardTitle>
                            <Button size="sm" variant="outline" onClick={() => copyToClipboard(scripts.followUpDay14, "Day 14 follow-up")}>
                              <Copy className="w-3 h-3 mr-1" /> Copy
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-md font-mono">
                            {scripts.followUpDay14}
                          </pre>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Batch Generate Ultimate Outreach
            </DialogTitle>
            <DialogDescription>
              Generate signal-based outreach campaigns for multiple businesses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Sender Name</Label>
              <Input 
                value={senderName} 
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your name for personalization"
                data-testid="input-sender-name"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Businesses</Label>
              <Input 
                type="number"
                value={batchLimit} 
                onChange={(e) => setBatchLimit(parseInt(e.target.value) || 20)}
                min={1}
                max={50}
                data-testid="input-batch-limit"
              />
            </div>
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                This will generate personalized outreach campaigns with:
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Signal-based problem detection
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Custom offer recommendations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Monthly loss calculations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Psychology-driven scripts
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Multi-channel messaging
                </li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => batchGenerateMutation.mutate()} disabled={batchGenerateMutation.isPending}>
              {batchGenerateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Zap className="w-4 h-4 mr-2" />
              )}
              Generate {batchLimit} Campaigns
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
