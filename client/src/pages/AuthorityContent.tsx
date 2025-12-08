import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, Search, BarChart3, Mail, Calendar, 
  LogOut, Plus, Terminal, MessageSquare, FileText,
  MapPin, Instagram, Trash2, Eye, Wand2, Copy, Check,
  Edit, Sparkles
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { AuthorityContent } from "@shared/schema";
import { CITIES } from "@shared/schema";
import { format } from "date-fns";

const CONTENT_TYPES = [
  { value: "listicle", label: "Listicle", description: "Top 10, Best of lists" },
  { value: "guide", label: "Guide", description: "Comprehensive how-to guides" },
  { value: "comparison", label: "Comparison", description: "Compare options side-by-side" },
  { value: "insider_tip", label: "Insider Tip", description: "Local secrets and tips" },
];

const CONTENT_STATUS = [
  { value: "draft", label: "Draft" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

export default function AuthorityContentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [filterType, setFilterType] = useState<string>("");
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedContent, setSelectedContent] = useState<AuthorityContent | null>(null);

  const contentUrl = (() => {
    const params = new URLSearchParams();
    if (filterType && filterType !== "all") params.append("contentType", filterType);
    if (filterCity && filterCity !== "all") params.append("city", filterCity);
    if (filterStatus && filterStatus !== "all") params.append("status", filterStatus);
    const queryString = params.toString();
    return queryString ? `/api/content?${queryString}` : "/api/content";
  })();

  const { data: contents, isLoading: loadingContents } = useQuery<AuthorityContent[]>({
    queryKey: [contentUrl],
  });

  const deleteContentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/content/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Content Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/content/${id}`, { 
        status,
        publishedAt: status === "published" ? new Date().toISOString() : null
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Status Updated" });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
    },
    onError: (error: Error) => {
      toast({ title: "Update Failed", description: error.message, variant: "destructive" });
    },
  });

  const getTypeLabel = (value: string) => CONTENT_TYPES.find(t => t.value === value)?.label || value;
  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;

  const getStatusBadgeVariant = (status: string): "default" | "secondary" | "outline" | "destructive" => {
    if (status === "published") return "default";
    if (status === "draft") return "secondary";
    return "outline";
  };

  const filteredContents = contents?.filter(c => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return c.title.toLowerCase().includes(search) || 
           c.content?.toLowerCase().includes(search);
  });

  const isActive = (path: string) => location === path;

  const draftCount = contents?.filter(c => c.status === "draft").length || 0;
  const publishedCount = contents?.filter(c => c.status === "published").length || 0;

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
                Signals
              </Button>
            </Link>
            <Link href="/venue-monitors">
              <Button variant={isActive("/venue-monitors") ? "secondary" : "ghost"} size="sm" data-testid="nav-venues">
                <Instagram className="h-4 w-4 mr-1" />
                Venues
              </Button>
            </Link>
            <Link href="/authority-content">
              <Button variant={isActive("/authority-content") ? "secondary" : "ghost"} size="sm" data-testid="nav-content">
                <FileText className="h-4 w-4 mr-1" />
                Content
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
          <h1 className="text-2xl font-semibold">Authority Content</h1>
          <Dialog open={generateDialogOpen} onOpenChange={setGenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-generate-content">
                <Sparkles className="h-4 w-4 mr-1" />
                Generate with AI
              </Button>
            </DialogTrigger>
            <GenerateContentDialog onClose={() => setGenerateDialogOpen(false)} />
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-primary">{contents?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Total Content</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-amber-500">{draftCount}</div>
              <div className="text-xs text-muted-foreground">Drafts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-green-500">{publishedCount}</div>
              <div className="text-xs text-muted-foreground">Published</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-blue-500">
                {new Set(contents?.map(c => c.contentType)).size}
              </div>
              <div className="text-xs text-muted-foreground">Content Types</div>
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
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-content"
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-type">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CONTENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-city">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {CITIES.map(city => (
                    <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {CONTENT_STATUS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loadingContents ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[120px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContents?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No content found. Generate authority content with AI to get started.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredContents?.map((content) => (
                    <TableRow key={content.id} data-testid={`row-content-${content.id}`}>
                      <TableCell>
                        <div className="font-medium">{content.title}</div>
                        {content.metaDescription && (
                          <div className="text-xs text-muted-foreground line-clamp-1">
                            {content.metaDescription}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="font-normal">
                          {getTypeLabel(content.contentType)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {content.city && (
                          <Badge variant="outline" className="font-normal">
                            <MapPin className="h-3 w-3 mr-1" />
                            {getCityLabel(content.city)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={content.status || "draft"} 
                          onValueChange={(v) => updateStatusMutation.mutate({ id: content.id, status: v })}
                        >
                          <SelectTrigger className="w-[100px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {CONTENT_STATUS.map(s => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {content.createdAt ? format(new Date(content.createdAt), "MMM d, yyyy") : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => {
                              setSelectedContent(content);
                              setViewDialogOpen(true);
                            }}
                            data-testid={`button-view-${content.id}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteContentMutation.mutate(content.id)}
                            data-testid={`button-delete-${content.id}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <ViewContentDialog content={selectedContent} onClose={() => setViewDialogOpen(false)} />
      </Dialog>
    </div>
  );
}

function GenerateContentDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    contentType: "listicle",
    city: "cartagena",
    category: "",
    prompt: "",
  });

  const generateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/content/generate", data);
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: "Content Generated", description: `Created: ${data.title}` });
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.prompt.trim()) {
      toast({ title: "Prompt Required", description: "Please provide a topic or prompt", variant: "destructive" });
      return;
    }
    generateMutation.mutate(formData);
  };

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generate Authority Content
        </DialogTitle>
        <DialogDescription>
          Use AI to generate SEO-optimized content for your target market
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label>Content Type</Label>
          <div className="grid grid-cols-2 gap-2">
            {CONTENT_TYPES.map(type => (
              <Button
                key={type.value}
                type="button"
                variant={formData.contentType === type.value ? "default" : "outline"}
                className="h-auto py-3 flex flex-col items-start text-left"
                onClick={() => setFormData({ ...formData, contentType: type.value })}
                data-testid={`button-type-${type.value}`}
              >
                <span className="font-medium">{type.label}</span>
                <span className="text-xs text-muted-foreground">{type.description}</span>
              </Button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select 
              value={formData.city} 
              onValueChange={(v) => setFormData({ ...formData, city: v })}
            >
              <SelectTrigger data-testid="select-content-city">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CITIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category (optional)</Label>
            <Input
              id="category"
              placeholder="e.g. restaurants, nightlife"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              data-testid="input-content-category"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="prompt">Topic / Prompt *</Label>
          <Textarea
            id="prompt"
            placeholder="e.g. Best rooftop bars in Cartagena for sunset cocktails..."
            value={formData.prompt}
            onChange={(e) => setFormData({ ...formData, prompt: e.target.value })}
            rows={3}
            data-testid="input-content-prompt"
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={generateMutation.isPending} data-testid="button-submit-generate">
            {generateMutation.isPending ? (
              <>
                <Wand2 className="h-4 w-4 mr-1 animate-pulse" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Generate Content
              </>
            )}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function ViewContentDialog({ content, onClose }: { content: AuthorityContent | null; onClose: () => void }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!content) return null;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(content.content);
      setCopied(true);
      toast({ title: "Copied to Clipboard" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Copy Failed", variant: "destructive" });
    }
  };

  return (
    <DialogContent className="max-w-3xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle>{content.title}</DialogTitle>
        <DialogDescription className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary">{CONTENT_TYPES.find(t => t.value === content.contentType)?.label}</Badge>
          {content.city && (
            <Badge variant="outline">
              <MapPin className="h-3 w-3 mr-1" />
              {CITIES.find(c => c.value === content.city)?.label}
            </Badge>
          )}
          <Badge variant={content.status === "published" ? "default" : "outline"}>
            {content.status}
          </Badge>
        </DialogDescription>
      </DialogHeader>
      <ScrollArea className="max-h-[50vh] pr-4">
        <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap">
          {content.content}
        </div>
      </ScrollArea>
      {content.metaDescription && (
        <div className="border-t pt-3">
          <Label className="text-xs text-muted-foreground">Meta Description</Label>
          <p className="text-sm">{content.metaDescription}</p>
        </div>
      )}
      {content.keywords && content.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <Label className="text-xs text-muted-foreground w-full">Keywords</Label>
          {content.keywords.map((kw, i) => (
            <Badge key={i} variant="outline" className="text-xs">{kw}</Badge>
          ))}
        </div>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={copyToClipboard}>
          {copied ? <Check className="h-4 w-4 mr-1" /> : <Copy className="h-4 w-4 mr-1" />}
          {copied ? "Copied" : "Copy Content"}
        </Button>
        <Button onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  );
}
