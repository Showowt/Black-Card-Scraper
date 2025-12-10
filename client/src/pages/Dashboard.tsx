import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUrlState, useScrollPosition } from "@/hooks/useUrlState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Building2, Search, Download, BarChart3, Mail, Phone, Globe, 
  MapPin, Star, Zap, RefreshCw, ExternalLink, ChevronRight,
  Users, TrendingUp, LogOut, Filter, Layers, Terminal, Calendar,
  MessageCircle, Brain, X, RotateCcw
} from "lucide-react";
import { Link } from "wouter";
import type { Business, Scan } from "@shared/schema";
import { CITIES, CATEGORIES, AI_READINESS_LEVELS } from "@shared/schema";

type DashboardFilters = {
  city: string;
  category: string;
  search: string;
  readiness: string;
  minScore: number;
  hasEmail: boolean;
  hasWebsite: boolean;
  [key: string]: string | number | boolean | undefined;
};

interface BusinessStats {
  total: number;
  byCategory: Record<string, number>;
  byCity: Record<string, number>;
  byReadiness: Record<string, number>;
  byOutreachStatus: Record<string, number>;
  withEmail: number;
  withWebsite: number;
  withPhone: number;
  avgScore: number;
  enriched: number;
}

const filterDefaults: DashboardFilters = {
  city: "",
  category: "",
  search: "",
  readiness: "",
  minScore: 0,
  hasEmail: false,
  hasWebsite: false,
};

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // URL-persisted filter state - survives navigation and back/forward
  const { state: filters, setState: setFilters, resetState: resetFilters, hasActiveFilters, activeFilterCount } = 
    useUrlState<DashboardFilters>({ defaults: filterDefaults });
  
  // Preserve scroll position when navigating back
  useScrollPosition("dashboard");
  
  // Local UI state (not persisted in URL)
  const [scanDialogOpen, setScanDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [enableAI, setEnableAI] = useState(true);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [batchCities, setBatchCities] = useState<string[]>([]);
  const [batchCategories, setBatchCategories] = useState<string[]>([]);

  // Extract filter values from URL state
  const filterCity = filters.city || "";
  const filterCategory = filters.category || "";
  const searchQuery = filters.search || "";
  const filterReadiness = filters.readiness || "";
  const minScore = filters.minScore || 0;
  const hasEmailFilter = filters.hasEmail || false;
  const hasWebsiteFilter = filters.hasWebsite || false;

  // Build URL with query params for filtering
  const businessesUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (filterCity && filterCity !== "all") params.append("city", filterCity);
    if (filterCategory && filterCategory !== "all") params.append("category", filterCategory);
    if (searchQuery) params.append("search", searchQuery);
    if (filterReadiness && filterReadiness !== "all") params.append("aiReadiness", filterReadiness);
    if (minScore > 0) params.append("minScore", minScore.toString());
    if (hasEmailFilter) params.append("hasEmail", "true");
    if (hasWebsiteFilter) params.append("hasWebsite", "true");
    const queryString = params.toString();
    return queryString ? `/api/businesses?${queryString}` : "/api/businesses";
  }, [filterCity, filterCategory, searchQuery, filterReadiness, minScore, hasEmailFilter, hasWebsiteFilter]);

  const { data: businesses, isLoading: loadingBusinesses } = useQuery<Business[]>({
    queryKey: [businessesUrl],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<BusinessStats>({
    queryKey: ["/api/businesses/stats"],
  });

  const { data: scans } = useQuery<Scan[]>({
    queryKey: ["/api/scans"],
  });

  const scanMutation = useMutation({
    mutationFn: async (data: { city: string; category: string; enableAI: boolean }) => {
      const res = await apiRequest("POST", "/api/scan", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Scan Started", description: "Business scan is now in progress" });
      setScanDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
    },
    onError: (error: Error) => {
      toast({ title: "Scan Failed", description: error.message, variant: "destructive" });
    },
  });

  const batchScanMutation = useMutation({
    mutationFn: async (data: { cities: string[]; categories: string[]; enableAI: boolean }) => {
      const res = await apiRequest("POST", "/api/scan/batch", data);
      return res.json();
    },
    onSuccess: (response: any) => {
      toast({ title: "Batch Scan Started", description: `Started ${response.scanIds?.length || 0} scans` });
      setScanDialogOpen(false);
      setBatchCities([]);
      setBatchCategories([]);
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
    },
    onError: (error: Error) => {
      toast({ title: "Batch Scan Failed", description: error.message, variant: "destructive" });
    },
  });

  const activeScan = scans?.find(s => s.status === "scanning");

  const handleStartScan = () => {
    if (!selectedCity || !selectedCategory) {
      toast({ title: "Missing Selection", description: "Please select both city and category", variant: "destructive" });
      return;
    }
    scanMutation.mutate({ city: selectedCity, category: selectedCategory, enableAI });
  };

  const getReadinessBadgeVariant = (readiness: string | null) => {
    if (readiness === "high") return "default";
    if (readiness === "medium") return "secondary";
    return "outline";
  };

  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;
  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;

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
              <Button variant="secondary" size="sm" data-testid="nav-dashboard">Dashboard</Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" size="sm" data-testid="nav-events">
                <Calendar className="h-4 w-4 mr-1" /> Events
              </Button>
            </Link>
            <Link href="/outreach-ready">
              <Button variant="ghost" size="sm" data-testid="nav-outreach-ready">
                <MessageCircle className="h-4 w-4 mr-1" /> Outreach
              </Button>
            </Link>
            <Link href="/ultimate-outreach">
              <Button variant="ghost" size="sm" data-testid="nav-ultimate-outreach">
                <Zap className="h-4 w-4 mr-1" /> Ultimate
              </Button>
            </Link>
            <Link href="/blackcard-intel">
              <Button variant="ghost" size="sm" data-testid="nav-blackcard-intel">
                <Layers className="h-4 w-4 mr-1" /> Black Card
              </Button>
            </Link>
            <Link href="/copilot">
              <Button variant="ghost" size="sm" data-testid="nav-copilot">
                <Brain className="h-4 w-4 mr-1" /> Copilot
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
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImageUrl || undefined} />
                <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <span className="text-sm hidden sm:inline">{user?.firstName || user?.email}</span>
            </div>
            <Button variant="ghost" size="icon" asChild data-testid="button-logout">
              <a href="/api/logout"><LogOut className="h-4 w-4" /></a>
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <h1 className="text-2xl font-medium" data-testid="text-page-title">Business Dashboard</h1>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" asChild data-testid="button-export-csv">
              <a href={`/api/export/csv?city=${filterCity}&category=${filterCategory}`} download>
                <Download className="h-4 w-4 mr-1" /> Export CSV
              </a>
            </Button>
            
            <Dialog open={scanDialogOpen} onOpenChange={setScanDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-new-scan">
                  <Zap className="h-4 w-4 mr-1" /> New Scan
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Start Business Scan</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="single" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="single" data-testid="tab-single-scan">Single Scan</TabsTrigger>
                    <TabsTrigger value="batch" data-testid="tab-batch-scan">Batch Scan</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Select value={selectedCity} onValueChange={setSelectedCity}>
                        <SelectTrigger data-testid="select-scan-city">
                          <SelectValue placeholder="Select city" />
                        </SelectTrigger>
                        <SelectContent>
                          {CITIES.map(city => (
                            <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger data-testid="select-scan-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(cat => (
                            <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="enable-ai">Enable AI Enrichment</Label>
                      <Switch 
                        id="enable-ai" 
                        checked={enableAI} 
                        onCheckedChange={setEnableAI}
                        data-testid="switch-enable-ai"
                      />
                    </div>
                    
                    <Button 
                      className="w-full" 
                      onClick={handleStartScan}
                      disabled={scanMutation.isPending}
                      data-testid="button-start-scan"
                    >
                      {scanMutation.isPending ? (
                        <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Starting...</>
                      ) : (
                        <><Zap className="h-4 w-4 mr-1" /> Start Scan</>
                      )}
                    </Button>
                  </TabsContent>
                  
                  <TabsContent value="batch" className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label>Select Cities</Label>
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                        {CITIES.map(city => (
                          <div key={city.value} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`city-${city.value}`}
                              checked={batchCities.includes(city.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBatchCities([...batchCities, city.value]);
                                } else {
                                  setBatchCities(batchCities.filter(c => c !== city.value));
                                }
                              }}
                              data-testid={`checkbox-city-${city.value}`}
                            />
                            <Label htmlFor={`city-${city.value}`} className="font-normal cursor-pointer">{city.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Select Categories</Label>
                      <div className="grid grid-cols-2 gap-2 border rounded-md p-3">
                        {CATEGORIES.map(cat => (
                          <div key={cat.value} className="flex items-center space-x-2">
                            <Checkbox 
                              id={`cat-${cat.value}`}
                              checked={batchCategories.includes(cat.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBatchCategories([...batchCategories, cat.value]);
                                } else {
                                  setBatchCategories(batchCategories.filter(c => c !== cat.value));
                                }
                              }}
                              data-testid={`checkbox-category-${cat.value}`}
                            />
                            <Label htmlFor={`cat-${cat.value}`} className="font-normal cursor-pointer">{cat.label}</Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between gap-2">
                      <Label htmlFor="enable-ai-batch">Enable AI Enrichment</Label>
                      <Switch 
                        id="enable-ai-batch" 
                        checked={enableAI} 
                        onCheckedChange={setEnableAI}
                        data-testid="switch-enable-ai-batch"
                      />
                    </div>
                    
                    {batchCities.length > 0 && batchCategories.length > 0 && (
                      <p className="text-sm text-muted-foreground">
                        This will start {batchCities.length * batchCategories.length} scans
                      </p>
                    )}
                    
                    <Button 
                      className="w-full" 
                      onClick={() => {
                        if (batchCities.length === 0 || batchCategories.length === 0) {
                          toast({ title: "Missing Selection", description: "Select at least one city and category", variant: "destructive" });
                          return;
                        }
                        batchScanMutation.mutate({ cities: batchCities, categories: batchCategories, enableAI });
                      }}
                      disabled={batchScanMutation.isPending}
                      data-testid="button-start-batch-scan"
                    >
                      {batchScanMutation.isPending ? (
                        <><RefreshCw className="h-4 w-4 mr-1 animate-spin" /> Starting...</>
                      ) : (
                        <><Layers className="h-4 w-4 mr-1" /> Start Batch Scan</>
                      )}
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {activeScan && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <div className="flex items-center justify-between gap-4 mb-2">
                <span className="font-medium flex items-center gap-2">
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Scanning {getCategoryLabel(activeScan.category)} in {getCityLabel(activeScan.city)}...
                </span>
                <Badge variant="secondary">
                  {activeScan.totalFound ?? 0} found, {activeScan.totalEnriched ?? 0} enriched
                </Badge>
              </div>
              <Progress value={(activeScan.totalFound ?? 0) > 0 ? ((activeScan.totalEnriched ?? 0) / (activeScan.totalFound ?? 1)) * 100 : 0} />
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Total Businesses</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-medium" data-testid="stat-total">{stats?.total || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Avg Score</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-medium" data-testid="stat-avg-score">{stats?.avgScore || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">With Email</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-medium" data-testid="stat-with-email">{stats?.withEmail || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal">Enriched</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingStats ? (
                <Skeleton className="h-8 w-16" />
              ) : (
                <div className="text-2xl font-medium" data-testid="stat-enriched">{stats?.enriched || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <CardTitle className="text-lg">Businesses</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search businesses..." 
                    className="pl-9 w-48"
                    value={searchQuery}
                    onChange={e => setFilters({ search: e.target.value })}
                    data-testid="input-search"
                  />
                </div>
                
                <Select value={filterCity || "all"} onValueChange={(v) => setFilters({ city: v === "all" ? "" : v })}>
                  <SelectTrigger className="w-36" data-testid="select-filter-city">
                    <SelectValue placeholder="All Cities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cities</SelectItem>
                    {CITIES.map(city => (
                      <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filterCategory || "all"} onValueChange={(v) => setFilters({ category: v === "all" ? "" : v })}>
                  <SelectTrigger className="w-40" data-testid="select-filter-category">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Button 
                  variant={showAdvancedFilters ? "secondary" : "outline"} 
                  size="sm"
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  data-testid="button-advanced-filters"
                >
                  <Filter className="h-4 w-4 mr-1" /> Filters
                  {activeFilterCount > 0 && (
                    <Badge variant="secondary" className="ml-1 h-5 px-1.5">{activeFilterCount}</Badge>
                  )}
                </Button>
                
                {hasActiveFilters && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={resetFilters}
                    data-testid="button-reset-all-filters"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" /> Reset
                  </Button>
                )}
              </div>
            </div>
            
            {showAdvancedFilters && (
              <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">AI Readiness</Label>
                  <Select value={filterReadiness || "all"} onValueChange={(v) => setFilters({ readiness: v === "all" ? "" : v })}>
                    <SelectTrigger data-testid="select-filter-readiness">
                      <SelectValue placeholder="All Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Levels</SelectItem>
                      {AI_READINESS_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>{level.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm text-muted-foreground">Min Score: {minScore}</Label>
                  <Slider
                    value={[minScore]}
                    onValueChange={([v]) => setFilters({ minScore: v })}
                    max={100}
                    step={5}
                    className="mt-2"
                    data-testid="slider-min-score"
                  />
                </div>
                
                <div className="space-y-3">
                  <Label className="text-sm text-muted-foreground">Contact Filters</Label>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="has-email"
                      checked={hasEmailFilter}
                      onCheckedChange={(v) => setFilters({ hasEmail: !!v })}
                      data-testid="checkbox-has-email"
                    />
                    <Label htmlFor="has-email" className="font-normal cursor-pointer">Has Email</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="has-website"
                      checked={hasWebsiteFilter}
                      onCheckedChange={(v) => setFilters({ hasWebsite: !!v })}
                      data-testid="checkbox-has-website"
                    />
                    <Label htmlFor="has-website" className="font-normal cursor-pointer">Has Website</Label>
                  </div>
                </div>
                
                <div className="flex items-end">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setFilters({ readiness: "", minScore: 0, hasEmail: false, hasWebsite: false })}
                    data-testid="button-clear-filters"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {loadingBusinesses ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : businesses && businesses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Business</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {businesses.map(business => (
                    <TableRow key={business.id} data-testid={`row-business-${business.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {business.photoUrl ? (
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={business.photoUrl} />
                              <AvatarFallback>{business.name[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium">{business.name}</div>
                            {business.address && (
                              <div className="text-xs text-muted-foreground flex items-center gap-1">
                                <MapPin className="h-3 w-3" /> {business.address.slice(0, 40)}...
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{getCategoryLabel(business.category)}</Badge>
                      </TableCell>
                      <TableCell>{getCityLabel(business.city)}</TableCell>
                      <TableCell>
                        {business.rating ? (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            <span className="text-sm">{business.rating}</span>
                            <span className="text-xs text-muted-foreground">({business.reviewCount})</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {business.aiScore !== null ? (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{business.aiScore}</span>
                            <Badge variant={getReadinessBadgeVariant(business.aiReadiness)} className="text-xs">
                              {business.aiReadiness}
                            </Badge>
                          </div>
                        ) : (
                          <Badge variant="outline" className="text-xs">Not Scored</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {business.phone && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={`tel:${business.phone}`}><Phone className="h-3 w-3" /></a>
                            </Button>
                          )}
                          {business.email && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={`mailto:${business.email}`}><Mail className="h-3 w-3" /></a>
                            </Button>
                          )}
                          {business.website && (
                            <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                              <a href={business.website} target="_blank" rel="noopener"><Globe className="h-3 w-3" /></a>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link href={`/business/${business.id}`}>
                          <Button variant="ghost" size="icon" className="h-7 w-7" data-testid={`button-view-${business.id}`}>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No Businesses Yet</h3>
                <p className="text-muted-foreground mb-4">Start by scanning businesses in a Colombian city</p>
                <Button onClick={() => setScanDialogOpen(true)} data-testid="button-empty-scan">
                  <Zap className="h-4 w-4 mr-1" /> Start Your First Scan
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
