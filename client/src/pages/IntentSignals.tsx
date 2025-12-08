import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Building2, Search, BarChart3, Mail, Calendar, 
  LogOut, ExternalLink, Plus, Terminal, MessageSquare,
  Users, AlertTriangle, TrendingUp, Eye, Trash2, CheckCircle
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { IntentSignal } from "@shared/schema";
import { format } from "date-fns";

const INTENT_LEVELS = [
  { value: "high", label: "High Intent", color: "green" },
  { value: "medium", label: "Medium Intent", color: "yellow" },
  { value: "low", label: "Low Intent", color: "gray" },
];

const SIGNAL_SOURCES = [
  { value: "reddit", label: "Reddit" },
  { value: "tripadvisor", label: "TripAdvisor" },
  { value: "twitter", label: "Twitter/X" },
  { value: "manual", label: "Manual" },
];

interface IntentStats {
  total: number;
  byIntentLevel: Record<string, number>;
  bySource: Record<string, number>;
  processed: number;
  unprocessed: number;
  complaints: number;
}

export default function IntentSignals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [filterIntent, setFilterIntent] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [filterProcessed, setFilterProcessed] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addSignalOpen, setAddSignalOpen] = useState(false);
  const [viewSignal, setViewSignal] = useState<IntentSignal | null>(null);

  const signalsUrl = (() => {
    const params = new URLSearchParams();
    if (filterIntent && filterIntent !== "all") params.append("intentLevel", filterIntent);
    if (filterSource && filterSource !== "all") params.append("source", filterSource);
    if (filterProcessed && filterProcessed !== "all") params.append("isProcessed", filterProcessed);
    if (searchQuery) params.append("search", searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/intent-signals?${queryString}` : "/api/intent-signals";
  })();

  const { data: signals, isLoading: loadingSignals } = useQuery<IntentSignal[]>({
    queryKey: [signalsUrl],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<IntentStats>({
    queryKey: ["/api/intent-signals/stats"],
  });

  const invalidateSignalQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/intent-signals');
      }
    });
  };

  const deleteSignalMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/intent-signals/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Signal Deleted" });
      invalidateSignalQueries();
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const markProcessedMutation = useMutation({
    mutationFn: async ({ id, isProcessed }: { id: string; isProcessed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/intent-signals/${id}`, { isProcessed });
      return res.json();
    },
    onSuccess: () => {
      invalidateSignalQueries();
    },
  });

  const getIntentInfo = (value: string) => INTENT_LEVELS.find(l => l.value === value) || { label: value, color: "gray" };
  const getSourceLabel = (value: string) => SIGNAL_SOURCES.find(s => s.value === value)?.label || value;

  const getIntentBadgeVariant = (level: string): "default" | "secondary" | "outline" | "destructive" => {
    if (level === "high") return "default";
    if (level === "medium") return "secondary";
    return "outline";
  };

  const isActive = (path: string) => location === path;

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
              <Button variant={isActive("/") ? "secondary" : "ghost"} size="sm" data-testid="nav-dashboard">Dashboard</Button>
            </Link>
            <Link href="/events">
              <Button variant={isActive("/events") ? "secondary" : "ghost"} size="sm" data-testid="nav-events">
                <Calendar className="h-4 w-4 mr-1" />
                Events
              </Button>
            </Link>
            <Link href="/intent-signals">
              <Button variant={isActive("/intent-signals") ? "secondary" : "ghost"} size="sm" data-testid="nav-intent-signals">
                <MessageSquare className="h-4 w-4 mr-1" />
                Intent Signals
              </Button>
            </Link>
            <Link href="/outreach">
              <Button variant={isActive("/outreach") ? "secondary" : "ghost"} size="sm" data-testid="nav-outreach">
                <Mail className="h-4 w-4 mr-1" />
                Outreach
              </Button>
            </Link>
            <Link href="/operations">
              <Button variant={isActive("/operations") ? "secondary" : "ghost"} size="sm" data-testid="nav-operations">
                <Terminal className="h-4 w-4 mr-1" />
                Operations
              </Button>
            </Link>
            <Link href="/statistics">
              <Button variant={isActive("/statistics") ? "secondary" : "ghost"} size="sm" data-testid="nav-stats">
                <BarChart3 className="h-4 w-4 mr-1" />
                Stats
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-2">
            {user && (
              <>
                <Avatar className="h-8 w-8">
                  <AvatarFallback>{user.firstName?.[0] || user.email?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm text-muted-foreground hidden sm:inline">{user.firstName || user.email}</span>
              </>
            )}
            <a href="/api/logout">
              <Button variant="ghost" size="icon" data-testid="button-logout">
                <LogOut className="h-4 w-4" />
              </Button>
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-semibold">Intent Signal Monitoring</h1>
          <Dialog open={addSignalOpen} onOpenChange={setAddSignalOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-signal">
                <Plus className="h-4 w-4 mr-1" />
                Add Signal
              </Button>
            </DialogTrigger>
            <AddSignalDialog onClose={() => setAddSignalOpen(false)} />
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-primary">{stats?.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total Signals</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-green-500">{stats?.byIntentLevel?.high || 0}</div>
              <div className="text-xs text-muted-foreground">High Intent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-yellow-500">{stats?.byIntentLevel?.medium || 0}</div>
              <div className="text-xs text-muted-foreground">Medium Intent</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-blue-500">{stats?.unprocessed || 0}</div>
              <div className="text-xs text-muted-foreground">Unprocessed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-muted-foreground">{stats?.processed || 0}</div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-red-500">{stats?.complaints || 0}</div>
              <div className="text-xs text-muted-foreground">Complaints</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search signals..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-signals"
                />
              </div>
              <Select value={filterIntent} onValueChange={setFilterIntent}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-intent">
                  <SelectValue placeholder="Intent Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Levels</SelectItem>
                  {INTENT_LEVELS.map(level => (
                    <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-source">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {SIGNAL_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterProcessed} onValueChange={setFilterProcessed}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-processed">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="false">Unprocessed</SelectItem>
                  <SelectItem value="true">Processed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loadingSignals ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Content</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Travel Info</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signals?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No intent signals found. Add signals manually or run the Reddit scraper.
                      </TableCell>
                    </TableRow>
                  )}
                  {signals?.map((signal) => {
                    const intentInfo = getIntentInfo(signal.intentLevel);
                    return (
                      <TableRow key={signal.id} data-testid={`row-signal-${signal.id}`}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="text-xs w-fit">
                              {getSourceLabel(signal.source)}
                            </Badge>
                            {signal.author && (
                              <span className="text-xs text-muted-foreground">@{signal.author}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="max-w-[300px]">
                          <div className="space-y-1">
                            {signal.title && (
                              <div className="font-medium text-sm line-clamp-1">{signal.title}</div>
                            )}
                            <div className="text-xs text-muted-foreground line-clamp-2">{signal.content}</div>
                            {signal.url && (
                              <a 
                                href={signal.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-xs text-primary flex items-center gap-1 hover:underline"
                              >
                                <ExternalLink className="h-3 w-3" />
                                View Original
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant={getIntentBadgeVariant(signal.intentLevel)}>
                              {intentInfo.label}
                            </Badge>
                            {signal.isComplaint && (
                              <Badge variant="destructive" className="text-xs w-fit">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Complaint
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {signal.travelDates && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {signal.travelDates}
                              </div>
                            )}
                            {signal.partySize && (
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {signal.partySize} people
                              </div>
                            )}
                            {signal.interests && signal.interests.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {signal.interests.slice(0, 2).map((interest, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {interest}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1 text-xs">
                            {signal.score !== null && (
                              <div className="flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                {signal.score}
                              </div>
                            )}
                            {signal.commentCount !== null && (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MessageSquare className="h-3 w-3" />
                                {signal.commentCount}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {signal.isProcessed ? (
                            <Badge variant="secondary">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Processed
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setViewSignal(signal)}
                              data-testid={`button-view-${signal.id}`}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => markProcessedMutation.mutate({ 
                                id: signal.id, 
                                isProcessed: !signal.isProcessed 
                              })}
                              data-testid={`button-toggle-processed-${signal.id}`}
                            >
                              <CheckCircle className={`h-4 w-4 ${signal.isProcessed ? 'text-green-500' : ''}`} />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteSignalMutation.mutate(signal.id)}
                              data-testid={`button-delete-${signal.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!viewSignal} onOpenChange={() => setViewSignal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Signal Details</DialogTitle>
            <DialogDescription>
              View full details of this intent signal
            </DialogDescription>
          </DialogHeader>
          {viewSignal && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Source</Label>
                  <div className="font-medium">{getSourceLabel(viewSignal.source)}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Intent Level</Label>
                  <Badge variant={getIntentBadgeVariant(viewSignal.intentLevel)}>
                    {getIntentInfo(viewSignal.intentLevel).label}
                  </Badge>
                </div>
                <div>
                  <Label className="text-muted-foreground">Author</Label>
                  <div className="font-medium">{viewSignal.author || "Unknown"}</div>
                </div>
                <div>
                  <Label className="text-muted-foreground">Posted At</Label>
                  <div className="font-medium">
                    {viewSignal.postedAt ? format(new Date(viewSignal.postedAt), "PPP") : "Unknown"}
                  </div>
                </div>
              </div>
              
              {viewSignal.title && (
                <div>
                  <Label className="text-muted-foreground">Title</Label>
                  <div className="font-medium">{viewSignal.title}</div>
                </div>
              )}
              
              <div>
                <Label className="text-muted-foreground">Content</Label>
                <div className="bg-muted/50 p-3 rounded-md text-sm max-h-[200px] overflow-y-auto">
                  {viewSignal.content}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {viewSignal.travelDates && (
                  <div>
                    <Label className="text-muted-foreground">Travel Dates</Label>
                    <div className="font-medium">{viewSignal.travelDates}</div>
                  </div>
                )}
                {viewSignal.partySize && (
                  <div>
                    <Label className="text-muted-foreground">Party Size</Label>
                    <div className="font-medium">{viewSignal.partySize} people</div>
                  </div>
                )}
              </div>

              {viewSignal.interests && viewSignal.interests.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Interests</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewSignal.interests.map((interest, i) => (
                      <Badge key={i} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewSignal.budgetSignals && viewSignal.budgetSignals.length > 0 && (
                <div>
                  <Label className="text-muted-foreground">Budget Signals</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {viewSignal.budgetSignals.map((signal, i) => (
                      <Badge key={i} variant="secondary">{signal}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {viewSignal.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <div className="text-sm">{viewSignal.notes}</div>
                </div>
              )}

              {viewSignal.url && (
                <a 
                  href={viewSignal.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="h-4 w-4" />
                  View Original Post
                </a>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewSignal(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AddSignalDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    source: "manual",
    url: "",
    title: "",
    content: "",
    author: "",
    intentLevel: "medium",
    isComplaint: false,
    travelDates: "",
    partySize: "",
    notes: "",
  });

  const createSignalMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/intent-signals", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Signal Added", description: "Intent signal created successfully" });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/intent-signals');
        }
      });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Signal", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.content.trim()) {
      toast({ title: "Content Required", description: "Please enter the signal content", variant: "destructive" });
      return;
    }
    createSignalMutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Manual Signal</DialogTitle>
        <DialogDescription>Add an intent signal manually for tracking</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            placeholder="Post title (optional)"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            data-testid="input-signal-title"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            placeholder="Signal content or message..."
            value={formData.content}
            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
            rows={4}
            data-testid="input-signal-content"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="source">Source</Label>
            <Select 
              value={formData.source} 
              onValueChange={(v) => setFormData({ ...formData, source: v })}
            >
              <SelectTrigger data-testid="select-signal-source">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SIGNAL_SOURCES.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="intentLevel">Intent Level</Label>
            <Select 
              value={formData.intentLevel} 
              onValueChange={(v) => setFormData({ ...formData, intentLevel: v })}
            >
              <SelectTrigger data-testid="select-signal-intent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTENT_LEVELS.map(l => (
                  <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="travelDates">Travel Dates</Label>
            <Input
              id="travelDates"
              placeholder="e.g. Dec 15-20"
              value={formData.travelDates}
              onChange={(e) => setFormData({ ...formData, travelDates: e.target.value })}
              data-testid="input-signal-dates"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="partySize">Party Size</Label>
            <Input
              id="partySize"
              placeholder="e.g. 4"
              value={formData.partySize}
              onChange={(e) => setFormData({ ...formData, partySize: e.target.value })}
              data-testid="input-signal-party"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="url">Source URL</Label>
          <Input
            id="url"
            placeholder="https://..."
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
            data-testid="input-signal-url"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="author">Author</Label>
          <Input
            id="author"
            placeholder="Username"
            value={formData.author}
            onChange={(e) => setFormData({ ...formData, author: e.target.value })}
            data-testid="input-signal-author"
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="isComplaint"
            checked={formData.isComplaint}
            onCheckedChange={(checked) => setFormData({ ...formData, isComplaint: !!checked })}
            data-testid="checkbox-complaint"
          />
          <Label htmlFor="isComplaint" className="text-sm">This is a complaint</Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            placeholder="Internal notes..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={2}
            data-testid="input-signal-notes"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createSignalMutation.isPending} data-testid="button-submit-signal">
            {createSignalMutation.isPending ? "Adding..." : "Add Signal"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
