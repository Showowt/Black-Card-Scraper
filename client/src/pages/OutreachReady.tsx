import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  MessageCircle, Instagram, Mail, Send, Clock, CheckCircle2,
  Copy, ExternalLink, Building2, Loader2, Sparkles, Brain,
  Phone, Globe, Star, TrendingUp, Filter, RefreshCw,
  ChevronRight, AlertCircle, Zap
} from "lucide-react";
import { SiWhatsapp, SiInstagram } from "react-icons/si";
import { Link } from "wouter";
import type { Business, OutreachCampaign } from "@shared/schema";
import { CITIES, CATEGORIES, PSYCHOLOGY_FRAMEWORKS } from "@shared/schema";

interface CampaignWithBusiness extends OutreachCampaign {
  business?: Business;
}

const channelConfig = {
  whatsapp: { label: "WhatsApp", icon: SiWhatsapp, color: "text-green-600" },
  instagram: { label: "Instagram", icon: SiInstagram, color: "text-pink-600" },
  email: { label: "Email", icon: Mail, color: "text-blue-600" },
};

const frameworkConfig: Record<string, { label: string; color: string; description: string }> = {
  loss_aversion: { label: "Loss Aversion", color: "bg-red-500/20 text-red-700", description: "Fear of missing out" },
  social_proof: { label: "Social Proof", color: "bg-blue-500/20 text-blue-700", description: "Others are doing it" },
  reciprocity: { label: "Reciprocity", color: "bg-green-500/20 text-green-700", description: "Give value first" },
  scarcity: { label: "Scarcity", color: "bg-amber-500/20 text-amber-700", description: "Limited availability" },
};

export default function OutreachReady() {
  const { toast } = useToast();
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [minScore, setMinScore] = useState<string>("60");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithBusiness | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    if (selectedCity !== "all") params.set("city", selectedCity);
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (minScore) params.set("minScore", minScore);
    params.set("isEnriched", "true");
    return params.toString();
  };

  const { data: businesses, isLoading: loadingBusinesses } = useQuery<Business[]>({
    queryKey: ["/api/businesses", selectedCity, selectedCategory, minScore],
    queryFn: async () => {
      const queryString = buildQueryParams();
      const res = await fetch(`/api/businesses?${queryString}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch businesses");
      return res.json();
    },
  });

  const { data: campaigns, isLoading: loadingCampaigns, refetch: refetchCampaigns } = useQuery<CampaignWithBusiness[]>({
    queryKey: ["/api/outreach/all"],
    queryFn: async () => {
      const res = await fetch("/api/outreach/all", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const generateScriptsMutation = useMutation({
    mutationFn: async ({ businessId, framework }: { businessId: string; framework?: string }) => {
      const res = await apiRequest("POST", "/api/outreach/multi-channel", { businessId, framework });
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/outreach/all" || query.queryKey[0] === "/api/businesses"
      });
      setSelectedCampaign(result.campaign);
      toast({ title: "Scripts Generated", description: `Using ${result.scripts.psychologyFramework} framework` });
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const batchGenerateMutation = useMutation({
    mutationFn: async (data: { filters?: { city?: string; category?: string }; limit: number }) => {
      const res = await apiRequest("POST", "/api/outreach/multi-channel/batch", data);
      return res.json();
    },
    onSuccess: (result) => {
      setBatchDialogOpen(false);
      setBatchProgress(0);
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === "/api/outreach/all" });
      toast({ 
        title: "Batch Generation Complete", 
        description: `Generated ${result.generated} scripts, ${result.errors} errors` 
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
    window.open(link, "_blank");
  };

  const getCampaignForBusiness = (businessId: string) => {
    return campaigns?.find(c => c.businessId === businessId);
  };

  const readyBusinesses = businesses?.filter(b => 
    b.phone || b.whatsapp || b.instagram
  ) || [];

  const stats = {
    total: businesses?.length || 0,
    withContact: readyBusinesses.length,
    withCampaign: readyBusinesses.filter(b => getCampaignForBusiness(b.id)).length,
    highScore: readyBusinesses.filter(b => (b.aiScore || 0) >= 70).length,
  };

  return (
    <div className="space-y-6 p-6" data-testid="outreach-ready-page">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Outreach Ready</h1>
        <p className="text-muted-foreground">
          Multi-channel outreach with AI-powered psychology scripts
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Enriched</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Phone className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withContact}</p>
                <p className="text-xs text-muted-foreground">With Contact</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Sparkles className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.withCampaign}</p>
                <p className="text-xs text-muted-foreground">Scripts Ready</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Star className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.highScore}</p>
                <p className="text-xs text-muted-foreground">High Value (70+)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>Lead Pipeline</CardTitle>
              <CardDescription>Generate and send multi-channel outreach</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={selectedCity} onValueChange={setSelectedCity}>
                <SelectTrigger className="w-[140px]" data-testid="select-city-filter">
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
                <SelectTrigger className="w-[140px]" data-testid="select-category-filter">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={minScore} onValueChange={setMinScore}>
                <SelectTrigger className="w-[130px]" data-testid="select-score-filter">
                  <SelectValue placeholder="Min Score" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Any Score</SelectItem>
                  <SelectItem value="40">40+ Score</SelectItem>
                  <SelectItem value="60">60+ Score</SelectItem>
                  <SelectItem value="70">70+ Score</SelectItem>
                  <SelectItem value="80">80+ Score</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                variant="outline"
                onClick={() => setBatchDialogOpen(true)}
                data-testid="button-batch-generate"
              >
                <Zap className="h-4 w-4 mr-2" />
                Batch Generate
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingBusinesses ? (
            <div className="space-y-3">
              {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : readyBusinesses.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No businesses with contact info found</p>
              <p className="text-sm">Scan and enrich businesses first, then scrape their websites</p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Channels</TableHead>
                    <TableHead>Framework</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {readyBusinesses.map(business => {
                    const campaign = getCampaignForBusiness(business.id);
                    return (
                      <TableRow key={business.id} data-testid={`row-business-${business.id}`}>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link href={`/business/${business.id}`}>
                              <span className="font-medium hover:underline cursor-pointer">
                                {business.name}
                              </span>
                            </Link>
                            <span className="text-xs text-muted-foreground">
                              {business.category} - {business.city}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            (business.aiScore || 0) >= 70 ? "default" :
                            (business.aiScore || 0) >= 50 ? "secondary" : "outline"
                          }>
                            {business.aiScore || "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {(business.phone || business.whatsapp) && (
                              <SiWhatsapp className="h-4 w-4 text-green-600" />
                            )}
                            {business.instagram && (
                              <SiInstagram className="h-4 w-4 text-pink-600" />
                            )}
                            {business.email && (
                              <Mail className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign?.psychologyFramework ? (
                            <Badge className={frameworkConfig[campaign.psychologyFramework]?.color || ""}>
                              {frameworkConfig[campaign.psychologyFramework]?.label || campaign.psychologyFramework}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {campaign ? (
                              <>
                                {campaign.whatsappLink && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => openWhatsApp(campaign.whatsappLink!)}
                                    data-testid={`button-whatsapp-${business.id}`}
                                  >
                                    <SiWhatsapp className="h-4 w-4 mr-1" />
                                    Open
                                  </Button>
                                )}
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    setSelectedBusiness(business);
                                    setSelectedCampaign(campaign);
                                  }}
                                  data-testid={`button-view-scripts-${business.id}`}
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => generateScriptsMutation.mutate({ businessId: business.id })}
                                disabled={generateScriptsMutation.isPending}
                                data-testid={`button-generate-${business.id}`}
                              >
                                {generateScriptsMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <Sparkles className="h-4 w-4 mr-1" />
                                    Generate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedCampaign} onOpenChange={(open) => !open && setSelectedCampaign(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              {selectedBusiness?.name} - Scripts
            </DialogTitle>
            <DialogDescription>
              {selectedCampaign?.psychologyFramework && (
                <Badge className={frameworkConfig[selectedCampaign.psychologyFramework]?.color || ""}>
                  {frameworkConfig[selectedCampaign.psychologyFramework]?.label}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          {selectedCampaign && (
            <Tabs defaultValue="whatsapp" className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="whatsapp" className="flex-1">
                  <SiWhatsapp className="h-4 w-4 mr-2" />
                  WhatsApp
                </TabsTrigger>
                <TabsTrigger value="instagram" className="flex-1">
                  <SiInstagram className="h-4 w-4 mr-2" />
                  Instagram
                </TabsTrigger>
                <TabsTrigger value="email" className="flex-1">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="followups" className="flex-1">
                  <Clock className="h-4 w-4 mr-2" />
                  Follow-ups
                </TabsTrigger>
              </TabsList>

              <TabsContent value="whatsapp" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">WhatsApp Script</label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedCampaign.whatsappScript || "", "WhatsApp script")}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                    {selectedCampaign.whatsappScript || "No script generated"}
                  </div>
                </div>
                {selectedCampaign.whatsappLink && (
                  <Button 
                    className="w-full" 
                    onClick={() => openWhatsApp(selectedCampaign.whatsappLink!)}
                    data-testid="button-open-whatsapp"
                  >
                    <SiWhatsapp className="h-4 w-4 mr-2" />
                    Open in WhatsApp
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="instagram" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Instagram DM</label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedCampaign.instagramDm || "", "Instagram DM")}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                    {selectedCampaign.instagramDm || "No script generated"}
                  </div>
                </div>
                {selectedBusiness?.instagram && (
                  <Button 
                    className="w-full" 
                    variant="outline"
                    onClick={() => window.open(`https://instagram.com/${selectedBusiness.instagram}`, "_blank")}
                  >
                    <SiInstagram className="h-4 w-4 mr-2" />
                    Open Instagram Profile
                  </Button>
                )}
              </TabsContent>

              <TabsContent value="email" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Subject</label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedCampaign.emailSubject || "", "Email subject")}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedCampaign.emailSubject || "No subject"}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Body</label>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => copyToClipboard(selectedCampaign.emailBody || "", "Email body")}
                    >
                      <Copy className="h-4 w-4 mr-1" /> Copy
                    </Button>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-sm whitespace-pre-wrap max-h-[300px] overflow-y-auto">
                    {selectedCampaign.emailBody || "No body generated"}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="followups" className="space-y-4 mt-4">
                {[
                  { label: "Day 3 Follow-up", value: selectedCampaign.followUpDay3 },
                  { label: "Day 7 Follow-up", value: selectedCampaign.followUpDay7 },
                  { label: "Day 14 Follow-up", value: selectedCampaign.followUpDay14 },
                ].map((followup, i) => (
                  <div key={i} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">{followup.label}</label>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => copyToClipboard(followup.value || "", followup.label)}
                      >
                        <Copy className="h-4 w-4 mr-1" /> Copy
                      </Button>
                    </div>
                    <div className="p-3 bg-muted rounded-lg text-sm whitespace-pre-wrap">
                      {followup.value || "No follow-up generated"}
                    </div>
                  </div>
                ))}
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batch Generate Scripts</DialogTitle>
            <DialogDescription>
              Generate multi-channel outreach scripts for multiple businesses
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">City Filter</label>
                <Select value={selectedCity} onValueChange={setSelectedCity}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {CITIES.map(city => (
                      <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Category Filter</label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              This will generate WhatsApp, Instagram, and Email scripts for up to 10 businesses with contact info.
            </p>
            {batchGenerateMutation.isPending && (
              <div className="space-y-2">
                <Progress value={batchProgress} />
                <p className="text-sm text-center text-muted-foreground">Generating scripts...</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => batchGenerateMutation.mutate({
                filters: {
                  ...(selectedCity !== "all" ? { city: selectedCity } : {}),
                  ...(selectedCategory !== "all" ? { category: selectedCategory } : {}),
                },
                limit: 10,
              })}
              disabled={batchGenerateMutation.isPending}
              data-testid="button-confirm-batch"
            >
              {batchGenerateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Generate Scripts
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
