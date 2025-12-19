import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { 
  Copy, Plus, Search, FileText, Phone, MessageCircle, Mail, 
  Mic, CheckCircle, ArrowLeft, Loader2, Trash2
} from "lucide-react";
import { Link } from "wouter";
import { SCRIPT_CATEGORIES, CATEGORIES, type SalesScript } from "@shared/schema";

export default function Scripts() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newScript, setNewScript] = useState({
    name: "",
    category: "opener",
    content: "",
    businessType: "",
    language: "en",
    tags: [] as string[],
  });

  const { data: scripts = [], isLoading } = useQuery<SalesScript[]>({
    queryKey: ['/api/scripts', { category: categoryFilter, businessType: businessTypeFilter, search }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (businessTypeFilter !== "all") params.append("businessType", businessTypeFilter);
      if (search) params.append("search", search);
      const url = `/api/scripts${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch scripts");
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: typeof newScript) => {
      const res = await apiRequest("POST", "/api/scripts", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/scripts' });
      toast({ title: "Script created successfully" });
      setIsDialogOpen(false);
      setNewScript({ name: "", category: "opener", content: "", businessType: "", language: "en", tags: [] });
    },
    onError: () => {
      toast({ title: "Failed to create script", variant: "destructive" });
    },
  });

  const copyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("POST", `/api/scripts/${id}/copy`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/scripts' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/scripts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/scripts' });
      toast({ title: "Script deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete script", variant: "destructive" });
    },
  });

  const copyToClipboard = async (script: SalesScript) => {
    try {
      await navigator.clipboard.writeText(script.content);
      copyMutation.mutate(script.id);
      toast({ title: "Copied to clipboard!" });
    } catch {
      toast({ title: "Failed to copy", variant: "destructive" });
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "opener": return <Phone className="h-4 w-4" />;
      case "discovery": return <Search className="h-4 w-4" />;
      case "objection": return <MessageCircle className="h-4 w-4" />;
      case "closing": return <CheckCircle className="h-4 w-4" />;
      case "followup": return <Mail className="h-4 w-4" />;
      case "whatsapp": return <MessageCircle className="h-4 w-4" />;
      case "voicemail": return <Mic className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredScripts = scripts.filter((script) => {
    if (categoryFilter !== "all" && script.category !== categoryFilter) return false;
    if (businessTypeFilter !== "all" && script.businessType !== businessTypeFilter) return false;
    if (search && !script.name.toLowerCase().includes(search.toLowerCase()) && 
        !script.content.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const groupedScripts = SCRIPT_CATEGORIES.reduce((acc, cat) => {
    acc[cat.value] = filteredScripts.filter(s => s.category === cat.value);
    return acc;
  }, {} as Record<string, SalesScript[]>);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Sales Scripts</h1>
              <p className="text-sm text-muted-foreground">Quick copy scripts for calls and messaging</p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-script">
                <Plus className="h-4 w-4 mr-2" />
                Add Script
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Create New Script</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newScript.name}
                    onChange={(e) => setNewScript({ ...newScript, name: e.target.value })}
                    placeholder="Script name"
                    data-testid="input-script-name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select 
                      value={newScript.category} 
                      onValueChange={(v) => setNewScript({ ...newScript, category: v })}
                    >
                      <SelectTrigger data-testid="select-script-category">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SCRIPT_CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Business Type (optional)</Label>
                    <Select 
                      value={newScript.businessType || "none"} 
                      onValueChange={(v) => setNewScript({ ...newScript, businessType: v === "none" ? "" : v })}
                    >
                      <SelectTrigger data-testid="select-script-business-type">
                        <SelectValue placeholder="Any" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Any</SelectItem>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Script Content</Label>
                  <Textarea
                    value={newScript.content}
                    onChange={(e) => setNewScript({ ...newScript, content: e.target.value })}
                    placeholder="Enter your script content..."
                    rows={8}
                    data-testid="input-script-content"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createMutation.mutate(newScript)}
                  disabled={createMutation.isPending || !newScript.name || !newScript.content}
                  data-testid="button-save-script"
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Save Script
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search scripts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
              data-testid="input-search-scripts"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {SCRIPT_CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-business-filter">
              <SelectValue placeholder="Business Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredScripts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No scripts found. Add your first script to get started.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue={SCRIPT_CATEGORIES[0].value}>
            <TabsList className="flex-wrap h-auto gap-1">
              {SCRIPT_CATEGORIES.map((cat) => (
                <TabsTrigger 
                  key={cat.value} 
                  value={cat.value}
                  className="gap-2"
                  data-testid={`tab-${cat.value}`}
                >
                  {getCategoryIcon(cat.value)}
                  {cat.label}
                  {groupedScripts[cat.value]?.length > 0 && (
                    <Badge variant="secondary" className="ml-1">{groupedScripts[cat.value].length}</Badge>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {SCRIPT_CATEGORIES.map((cat) => (
              <TabsContent key={cat.value} value={cat.value} className="mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {groupedScripts[cat.value]?.map((script) => (
                    <Card key={script.id} className="hover-elevate">
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-base truncate">{script.name}</CardTitle>
                            <CardDescription className="flex items-center gap-2 mt-1">
                              {script.businessType && (
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORIES.find(c => c.value === script.businessType)?.label || script.businessType}
                                </Badge>
                              )}
                              <span className="text-xs">Used {script.usageCount || 0}x</span>
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground line-clamp-4 mb-4">
                          {script.content}
                        </p>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            onClick={() => copyToClipboard(script)}
                            data-testid={`button-copy-${script.id}`}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy
                          </Button>
                          {user?.role === 'admin' && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(script.id)}
                              disabled={deleteMutation.isPending}
                              data-testid={`button-delete-${script.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!groupedScripts[cat.value] || groupedScripts[cat.value].length === 0) && (
                    <Card className="col-span-full">
                      <CardContent className="py-8 text-center">
                        <p className="text-muted-foreground">No {cat.label.toLowerCase()} scripts yet.</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>
    </div>
  );
}
