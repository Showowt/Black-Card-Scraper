import { useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, ArrowLeft, Phone, Mail, Globe, MapPin, Star, 
  ExternalLink, Clock, Zap, RefreshCw, Copy, Check, LogOut, Search,
  AlertTriangle, Target, DollarSign, Shield, Heart, Clock3, Sparkles, Send
} from "lucide-react";
import { SiInstagram, SiFacebook, SiWhatsapp } from "react-icons/si";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import ClaudeCopilot from "@/components/ClaudeCopilot";
import IntelligencePanel from "@/components/IntelligencePanel";
import type { Business, OutreachCampaign } from "@shared/schema";
import { CITIES, CATEGORIES, OUTREACH_STATUSES } from "@shared/schema";

export default function BusinessDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/business/:id");
  const businessId = params?.id;
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ultimateScripts, setUltimateScripts] = useState<any>(null);
  const [scriptsDialogOpen, setScriptsDialogOpen] = useState(false);

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
