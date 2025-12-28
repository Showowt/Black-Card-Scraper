import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Mail, Send, Clock, CheckCircle2, XCircle, Archive, Trash2,
  Copy, ExternalLink, Building2, ChevronRight, Loader2, Sparkles,
  FileText, Users, TrendingUp, RotateCcw, Terminal, BarChart3, Calendar
} from "lucide-react";
import { Link } from "wouter";
import type { Business, OutreachCampaign } from "@shared/schema";
import { CITIES, CATEGORIES } from "@shared/schema";

interface CampaignWithBusiness extends OutreachCampaign {
  business?: Business;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Mail }> = {
  draft: { label: "Draft", color: "bg-muted text-muted-foreground", icon: FileText },
  ready: { label: "Ready", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400", icon: Mail },
  sent: { label: "Sent", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400", icon: Send },
  responded: { label: "Responded", color: "bg-green-500/20 text-green-700 dark:text-green-400", icon: CheckCircle2 },
  converted: { label: "Converted", color: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400", icon: TrendingUp },
  rejected: { label: "Rejected", color: "bg-red-500/20 text-red-700 dark:text-red-400", icon: XCircle },
  archived: { label: "Archived", color: "bg-gray-500/20 text-gray-700 dark:text-gray-400", icon: Archive },
};

export default function Outreach() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] = useState<CampaignWithBusiness | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [batchCity, setBatchCity] = useState<string>("");
  const [batchCategory, setBatchCategory] = useState<string>("");
  const [batchLimit, setBatchLimit] = useState<number>(25);
  const [batchTone, setBatchTone] = useState<string>("professional");
  const [batchAutoReady, setBatchAutoReady] = useState(false);

  const OUTREACH_TONES = [
    { value: 'professional', label: 'Professional', description: 'Polished and business-focused' },
    { value: 'casual', label: 'Casual', description: 'Friendly and conversational' },
    { value: 'urgency', label: 'Urgency', description: 'Create FOMO and time pressure' },
    { value: 'value_focused', label: 'Value-Focused', description: 'Lead with ROI and numbers' },
    { value: 'curiosity', label: 'Curiosity', description: 'Intriguing hooks and questions' },
  ];

  const { data: campaigns, isLoading } = useQuery<CampaignWithBusiness[]>({
    queryKey: ["/api/outreach/all", selectedStatus],
    queryFn: async () => {
      const params = selectedStatus !== "all" ? `?status=${selectedStatus}` : "";
      const res = await fetch(`/api/outreach/all${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch campaigns");
      return res.json();
    },
  });

  const updateCampaignMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<OutreachCampaign> }) => {
      const res = await apiRequest("PATCH", `/api/outreach/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/all"] });
      toast({ title: "Campaign Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteCampaignMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/outreach/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/all"] });
      setSelectedCampaign(null);
      toast({ title: "Campaign Deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const batchOutreachMutation = useMutation({
    mutationFn: async (data: { filters: { city?: string; category?: string; limit: number }; tone?: string; autoReady?: boolean }) => {
      const res = await apiRequest("POST", "/api/outreach/batch", data);
      return res.json();
    },
    onSuccess: (result: any) => {
      setBatchDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/all"] });
      const statusLabel = result.tone ? ` (${result.tone} tone)` : '';
      toast({ 
        title: "Batch Outreach Complete", 
        description: `Generated ${result.generated} emails${statusLabel}, ${result.skipped} skipped, ${result.errors} errors` 
      });
    },
    onError: (error: Error) => {
      toast({ title: "Batch Outreach Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleStatusChange = (campaignId: string, newStatus: string) => {
    updateCampaignMutation.mutate({ 
      id: campaignId, 
      data: { 
        status: newStatus,
        ...(newStatus === "sent" ? { sentAt: new Date() } : {}),
        ...(newStatus === "responded" ? { respondedAt: new Date() } : {}),
        ...(newStatus === "converted" ? { convertedAt: new Date() } : {}),
      } 
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied to clipboard" });
  };

  const filteredCampaigns = campaigns || [];
  const stats = {
    total: campaigns?.length || 0,
    draft: campaigns?.filter(c => c.status === "draft").length || 0,
    ready: campaigns?.filter(c => c.status === "ready").length || 0,
    sent: campaigns?.filter(c => c.status === "sent").length || 0,
    responded: campaigns?.filter(c => c.status === "responded").length || 0,
    converted: campaigns?.filter(c => c.status === "converted").length || 0,
  };
  
  const conversionRate = stats.total > 0 
    ? Math.round((stats.converted / stats.total) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Building2 className="h-7 w-7 text-primary" />
              <span className="text-lg font-medium">Black Card Scanner</span>
            </div>
            
            <nav className="flex items-center gap-4 flex-wrap">
              <Link href="/">
                <Button variant="ghost" size="sm" data-testid="nav-dashboard">Dashboard</Button>
              </Link>
              <Link href="/events">
                <Button variant="ghost" size="sm" data-testid="nav-events">
                  <Calendar className="h-4 w-4 mr-1" /> Events
                </Button>
              </Link>
              <Link href="/outreach">
                <Button variant="secondary" size="sm" data-testid="nav-outreach">
                  <Mail className="h-4 w-4 mr-1" /> Outreach
                </Button>
              </Link>
              <Link href="/operations">
                <Button variant="ghost" size="sm" data-testid="nav-operations">
                  <Terminal className="h-4 w-4 mr-1" /> Operations
                </Button>
              </Link>
              <Link href="/statistics">
                <Button variant="ghost" size="sm" data-testid="nav-statistics">
                  <BarChart3 className="h-4 w-4 mr-1" /> Stats
                </Button>
              </Link>
            </nav>
            
            <div className="flex items-center gap-2">
              <Dialog open={batchDialogOpen} onOpenChange={setBatchDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-batch-outreach">
                    <Sparkles className="h-4 w-4 mr-2" />
                    Batch Generate
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-popover">
                  <DialogHeader>
                    <DialogTitle>Batch Generate Outreach</DialogTitle>
                    <DialogDescription>
                      Generate personalized outreach emails for enriched businesses with AI score 60+
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">City (optional)</label>
                      <Select value={batchCity} onValueChange={setBatchCity}>
                        <SelectTrigger data-testid="select-batch-city">
                          <SelectValue placeholder="All cities" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="all">All cities</SelectItem>
                          {CITIES.map(city => (
                            <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Category (optional)</label>
                      <Select value={batchCategory} onValueChange={setBatchCategory}>
                        <SelectTrigger data-testid="select-batch-category">
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          <SelectItem value="all">All categories</SelectItem>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Limit</label>
                      <Input 
                        type="number" 
                        value={batchLimit} 
                        onChange={(e) => setBatchLimit(parseInt(e.target.value) || 25)}
                        min={1}
                        max={100}
                        data-testid="input-batch-limit"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email Tone</label>
                      <Select value={batchTone} onValueChange={setBatchTone}>
                        <SelectTrigger data-testid="select-batch-tone">
                          <SelectValue placeholder="Select tone" />
                        </SelectTrigger>
                        <SelectContent className="bg-popover">
                          {OUTREACH_TONES.map(tone => (
                            <SelectItem key={tone.value} value={tone.value}>
                              <div className="flex flex-col">
                                <span>{tone.label}</span>
                                <span className="text-xs text-muted-foreground">{tone.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="autoReady"
                        checked={batchAutoReady}
                        onChange={(e) => setBatchAutoReady(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                        data-testid="checkbox-auto-ready"
                      />
                      <label htmlFor="autoReady" className="text-sm font-medium">
                        Auto-mark as Ready to Send
                      </label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setBatchDialogOpen(false)}>Cancel</Button>
                    <Button 
                      onClick={() => batchOutreachMutation.mutate({ 
                        filters: { 
                          city: batchCity && batchCity !== "all" ? batchCity : undefined,
                          category: batchCategory && batchCategory !== "all" ? batchCategory : undefined,
                          limit: batchLimit 
                        },
                        tone: batchTone,
                        autoReady: batchAutoReady,
                      })}
                      disabled={batchOutreachMutation.isPending}
                      data-testid="button-start-batch"
                    >
                      {batchOutreachMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Generate Emails</>
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-bold">{stats.total}</div>
                <Mail className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Total Campaigns</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedStatus("draft")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-bold">{stats.draft}</div>
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Drafts</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedStatus("ready")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-bold">{stats.ready}</div>
                <Mail className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-sm text-muted-foreground">Ready to Send</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedStatus("sent")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-bold">{stats.sent}</div>
                <Send className="h-5 w-5 text-amber-500" />
              </div>
              <p className="text-sm text-muted-foreground">Sent</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedStatus("responded")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-bold">{stats.responded}</div>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-sm text-muted-foreground">Responded</p>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover-elevate" onClick={() => setSelectedStatus("converted")}>
            <CardContent className="pt-4">
              <div className="flex items-center justify-between gap-2">
                <div className="text-2xl font-bold">{stats.converted}</div>
                <TrendingUp className="h-5 w-5 text-emerald-500" />
              </div>
              <p className="text-sm text-muted-foreground">Converted ({conversionRate}%)</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-6">
          <div className="flex-1">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-4">
                  <CardTitle className="text-lg">Campaigns</CardTitle>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-40" data-testid="select-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-popover">
                      <SelectItem value="all">All Status</SelectItem>
                      {Object.entries(statusConfig).map(([value, config]) => (
                        <SelectItem key={value} value={value}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
                  </div>
                ) : filteredCampaigns.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No campaigns found</p>
                    <p className="text-sm mt-1">Generate batch outreach to create campaigns</p>
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {filteredCampaigns.map((campaign) => {
                        const config = statusConfig[campaign.status || "draft"];
                        const StatusIcon = config?.icon || FileText;
                        return (
                          <div 
                            key={campaign.id}
                            className={`p-3 rounded-md border cursor-pointer hover-elevate transition-colors ${
                              selectedCampaign?.id === campaign.id ? "border-primary bg-accent/50" : ""
                            }`}
                            onClick={() => setSelectedCampaign(campaign)}
                            data-testid={`campaign-row-${campaign.id}`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                  <span className="font-medium truncate">{campaign.business?.name || "Unknown"}</span>
                                </div>
                                <p className="text-sm text-muted-foreground truncate">{campaign.emailSubject}</p>
                              </div>
                              <Badge className={`${config?.color} flex-shrink-0`}>
                                <StatusIcon className="h-3 w-3 mr-1" />
                                {config?.label}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="w-[450px] flex-shrink-0">
            {selectedCampaign ? (
              <Card className="sticky top-20">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{selectedCampaign.business?.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1 mt-1">
                        {selectedCampaign.business?.city && (
                          <Badge variant="outline" className="text-xs">
                            {CITIES.find(c => c.value === selectedCampaign.business?.city)?.label}
                          </Badge>
                        )}
                        {selectedCampaign.business?.category && (
                          <Badge variant="outline" className="text-xs">
                            {CATEGORIES.find(c => c.value === selectedCampaign.business?.category)?.label}
                          </Badge>
                        )}
                      </CardDescription>
                    </div>
                    {selectedCampaign.business && (
                      <Link href={`/business/${selectedCampaign.business.id}`}>
                        <Button variant="ghost" size="icon" data-testid="button-view-business">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Subject</label>
                    <div className="mt-1 p-2 bg-muted rounded-md flex items-center justify-between gap-2">
                      <span className="text-sm truncate">{selectedCampaign.emailSubject}</span>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => copyToClipboard(selectedCampaign.emailSubject || "")}
                        data-testid="button-copy-subject"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Email Body</label>
                    <div className="mt-1 relative">
                      <Textarea 
                        value={selectedCampaign.emailBody || ""} 
                        readOnly 
                        className="min-h-[200px] resize-none bg-muted"
                        data-testid="textarea-email-body"
                      />
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={() => copyToClipboard(selectedCampaign.emailBody || "")}
                        data-testid="button-copy-body"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Update Status</label>
                    <Select 
                      value={selectedCampaign.status || "draft"} 
                      onValueChange={(value) => handleStatusChange(selectedCampaign.id, value)}
                    >
                      <SelectTrigger data-testid="select-campaign-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-popover">
                        {Object.entries(statusConfig).map(([value, config]) => (
                          <SelectItem key={value} value={value}>
                            <div className="flex items-center gap-2">
                              <config.icon className="h-4 w-4" />
                              {config.label}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center gap-2 pt-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => copyToClipboard(`Subject: ${selectedCampaign.emailSubject}\n\n${selectedCampaign.emailBody}`)}
                      data-testid="button-copy-all"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy All
                    </Button>
                    {user?.role === 'admin' && (
                      <Button 
                        variant="destructive" 
                        size="icon"
                        onClick={() => deleteCampaignMutation.mutate(selectedCampaign.id)}
                        disabled={deleteCampaignMutation.isPending}
                        data-testid="button-delete-campaign"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  {selectedCampaign.business?.email && (
                    <div className="pt-2 border-t">
                      <a 
                        href={`mailto:${selectedCampaign.business.email}?subject=${encodeURIComponent(selectedCampaign.emailSubject || "")}&body=${encodeURIComponent(selectedCampaign.emailBody || "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button className="w-full" data-testid="button-send-email">
                          <Mail className="h-4 w-4 mr-2" />
                          Send via Email Client
                        </Button>
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-16 text-center text-muted-foreground">
                  <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select a campaign to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
