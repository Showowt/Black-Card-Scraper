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
  ExternalLink, Clock, Zap, RefreshCw, Copy, Check, LogOut, Search
} from "lucide-react";
import { SiInstagram, SiFacebook, SiWhatsapp } from "react-icons/si";
import type { Business, OutreachCampaign } from "@shared/schema";
import { CITIES, CATEGORIES, OUTREACH_STATUSES } from "@shared/schema";

export default function BusinessDetail() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, params] = useRoute("/business/:id");
  const businessId = params?.id;
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: business, isLoading } = useQuery<Business>({
    queryKey: ["/api/businesses", businessId],
    enabled: !!businessId,
  });

  const { data: outreachCampaigns } = useQuery<OutreachCampaign[]>({
    queryKey: ["/api/outreach", { businessId }],
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
      queryClient.invalidateQueries({ queryKey: ["/api/outreach", { businessId }] });
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

            {business.openingHours && Array.isArray(business.openingHours) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-4 w-4" /> Opening Hours
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm">
                    {(business.openingHours as string[]).map((hours, i) => (
                      <li key={i}>{hours}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
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
      </main>
    </div>
  );
}
