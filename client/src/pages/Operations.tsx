import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Terminal, Play, Loader2, CheckCircle2, XCircle, Clock, 
  Search, Sparkles, Download, Building2, RefreshCw,
  Layers, Database, FileText, Mail, BarChart3, Calendar, ArrowLeft
} from "lucide-react";
import { Link } from "wouter";
import { CITIES, CATEGORIES } from "@shared/schema";

interface OperationLog {
  id: string;
  timestamp: Date;
  type: "scan" | "enrich" | "outreach" | "export";
  message: string;
  status: "pending" | "running" | "success" | "error";
  details?: any;
}

export default function Operations() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [logs, setLogs] = useState<OperationLog[]>([]);
  
  const [scanCities, setScanCities] = useState<string[]>([]);
  const [scanCategories, setScanCategories] = useState<string[]>([]);
  const [scanEnableAI, setScanEnableAI] = useState(true);
  
  const [enrichLimit, setEnrichLimit] = useState(25);
  const [enrichCity, setEnrichCity] = useState<string>("");
  const [enrichCategory, setEnrichCategory] = useState<string>("");
  
  const [outreachLimit, setOutreachLimit] = useState(25);
  const [outreachCity, setOutreachCity] = useState<string>("");
  const [outreachCategory, setOutreachCategory] = useState<string>("");
  
  const [exportCity, setExportCity] = useState<string>("");
  const [exportCategory, setExportCategory] = useState<string>("");
  const [exportFormat, setExportFormat] = useState<"csv" | "movvia">("csv");

  const addLog = (log: Omit<OperationLog, "id" | "timestamp">) => {
    const newLog: OperationLog = {
      ...log,
      id: Date.now().toString(),
      timestamp: new Date(),
    };
    setLogs(prev => [newLog, ...prev]);
    return newLog.id;
  };

  const updateLog = (id: string, updates: Partial<OperationLog>) => {
    setLogs(prev => prev.map(log => log.id === id ? { ...log, ...updates } : log));
  };

  const batchScanMutation = useMutation({
    mutationFn: async (data: { cities: string[]; categories: string[]; enableAI: boolean }) => {
      const res = await apiRequest("POST", "/api/scan/batch", data);
      return res.json();
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scans"] });
      toast({ title: "Batch Scan Started", description: `${result.scanIds?.length || 0} scans initiated` });
    },
  });

  const batchEnrichMutation = useMutation({
    mutationFn: async (data: { filters?: { city?: string; category?: string }; limit: number }) => {
      const res = await apiRequest("POST", "/api/businesses/enrich/batch", data);
      return res.json();
    },
  });

  const batchOutreachMutation = useMutation({
    mutationFn: async (data: { filters: { city?: string; category?: string; limit: number } }) => {
      const res = await apiRequest("POST", "/api/outreach/batch", data);
      return res.json();
    },
  });

  const handleBatchScan = async () => {
    if (scanCities.length === 0 || scanCategories.length === 0) {
      toast({ title: "Selection Required", description: "Select at least one city and category", variant: "destructive" });
      return;
    }
    
    const logId = addLog({
      type: "scan",
      message: `Starting batch scan: ${scanCities.length} cities x ${scanCategories.length} categories`,
      status: "running",
    });
    
    try {
      const result = await batchScanMutation.mutateAsync({ 
        cities: scanCities, 
        categories: scanCategories, 
        enableAI: scanEnableAI 
      });
      
      updateLog(logId, { 
        status: "success", 
        message: `Batch scan started: ${result.scanIds?.length || 0} scans initiated`,
        details: result 
      });
    } catch (error: any) {
      updateLog(logId, { status: "error", message: `Scan failed: ${error.message}` });
    }
  };

  const handleBatchEnrich = async () => {
    const logId = addLog({
      type: "enrich",
      message: `Starting batch enrichment: up to ${enrichLimit} businesses`,
      status: "running",
    });
    
    try {
      const result = await batchEnrichMutation.mutateAsync({
        filters: {
          city: enrichCity && enrichCity !== "all" ? enrichCity : undefined,
          category: enrichCategory && enrichCategory !== "all" ? enrichCategory : undefined,
        },
        limit: enrichLimit,
      });
      
      updateLog(logId, { 
        status: "success", 
        message: `Enriched ${result.enriched} businesses, ${result.errors} errors`,
        details: result 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
    } catch (error: any) {
      updateLog(logId, { status: "error", message: `Enrichment failed: ${error.message}` });
    }
  };

  const handleBatchOutreach = async () => {
    const logId = addLog({
      type: "outreach",
      message: `Starting batch outreach: up to ${outreachLimit} emails`,
      status: "running",
    });
    
    try {
      const result = await batchOutreachMutation.mutateAsync({
        filters: {
          city: outreachCity && outreachCity !== "all" ? outreachCity : undefined,
          category: outreachCategory && outreachCategory !== "all" ? outreachCategory : undefined,
          limit: outreachLimit,
        },
      });
      
      updateLog(logId, { 
        status: "success", 
        message: `Generated ${result.generated} emails, ${result.skipped} skipped, ${result.errors} errors`,
        details: result 
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/outreach/all"] });
    } catch (error: any) {
      updateLog(logId, { status: "error", message: `Outreach failed: ${error.message}` });
    }
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (exportCity && exportCity !== "all") params.append("city", exportCity);
    if (exportCategory && exportCategory !== "all") params.append("category", exportCategory);
    
    const url = `/api/export/${exportFormat}?${params.toString()}`;
    
    addLog({
      type: "export",
      message: `Exporting to ${exportFormat.toUpperCase()}...`,
      status: "success",
    });
    
    window.open(url, "_blank");
  };

  const toggleCity = (city: string) => {
    setScanCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city]);
  };

  const toggleCategory = (cat: string) => {
    setScanCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const getStatusIcon = (status: OperationLog["status"]) => {
    switch (status) {
      case "running": return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: OperationLog["type"]) => {
    switch (type) {
      case "scan": return <Search className="h-4 w-4" />;
      case "enrich": return <Sparkles className="h-4 w-4" />;
      case "outreach": return <Mail className="h-4 w-4" />;
      case "export": return <Download className="h-4 w-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => window.history.back()}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Building2 className="h-6 w-6 text-primary" />
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
                <Button variant="ghost" size="sm" data-testid="nav-outreach">
                  <Mail className="h-4 w-4 mr-1" /> Outreach
                </Button>
              </Link>
              <Link href="/operations">
                <Button variant="secondary" size="sm" data-testid="nav-operations">
                  <Terminal className="h-4 w-4 mr-1" /> Operations
                </Button>
              </Link>
              <Link href="/statistics">
                <Button variant="ghost" size="sm" data-testid="nav-statistics">
                  <BarChart3 className="h-4 w-4 mr-1" /> Stats
                </Button>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <Tabs defaultValue="scan" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="scan" data-testid="tab-scan">
                  <Search className="h-4 w-4 mr-1" /> Scan
                </TabsTrigger>
                <TabsTrigger value="enrich" data-testid="tab-enrich">
                  <Sparkles className="h-4 w-4 mr-1" /> Enrich
                </TabsTrigger>
                <TabsTrigger value="outreach" data-testid="tab-outreach">
                  <Mail className="h-4 w-4 mr-1" /> Outreach
                </TabsTrigger>
                {user?.role === 'admin' && (
                  <TabsTrigger value="export" data-testid="tab-export">
                    <Download className="h-4 w-4 mr-1" /> Export
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="scan">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Layers className="h-5 w-5" />
                      Batch Scan
                    </CardTitle>
                    <CardDescription>Scan multiple cities and categories simultaneously</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Cities ({scanCities.length} selected)</Label>
                      <div className="flex flex-wrap gap-2">
                        {CITIES.map(city => (
                          <Badge 
                            key={city.value}
                            variant={scanCities.includes(city.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleCity(city.value)}
                            data-testid={`badge-city-${city.value}`}
                          >
                            {city.label}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setScanCities(CITIES.map(c => c.value))}>Select All</Button>
                        <Button variant="outline" size="sm" onClick={() => setScanCities([])}>Clear</Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Categories ({scanCategories.length} selected)</Label>
                      <div className="flex flex-wrap gap-2">
                        {CATEGORIES.map(cat => (
                          <Badge 
                            key={cat.value}
                            variant={scanCategories.includes(cat.value) ? "default" : "outline"}
                            className="cursor-pointer"
                            onClick={() => toggleCategory(cat.value)}
                            data-testid={`badge-category-${cat.value}`}
                          >
                            {cat.label}
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button variant="outline" size="sm" onClick={() => setScanCategories(CATEGORIES.map(c => c.value))}>Select All</Button>
                        <Button variant="outline" size="sm" onClick={() => setScanCategories([])}>Clear</Button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox 
                        checked={scanEnableAI} 
                        onCheckedChange={(checked) => setScanEnableAI(!!checked)}
                        id="enable-ai"
                      />
                      <Label htmlFor="enable-ai">Enable AI enrichment during scan</Label>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleBatchScan}
                      disabled={batchScanMutation.isPending || scanCities.length === 0 || scanCategories.length === 0}
                      data-testid="button-run-scan"
                    >
                      {batchScanMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Running...</>
                      ) : (
                        <><Play className="h-4 w-4 mr-2" /> Run Batch Scan ({scanCities.length * scanCategories.length} operations)</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="enrich">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      Batch Enrich
                    </CardTitle>
                    <CardDescription>AI-enrich unenriched businesses with scores and insights</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City (optional)</Label>
                        <Select value={enrichCity} onValueChange={setEnrichCity}>
                          <SelectTrigger data-testid="select-enrich-city">
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
                        <Label>Category (optional)</Label>
                        <Select value={enrichCategory} onValueChange={setEnrichCategory}>
                          <SelectTrigger data-testid="select-enrich-category">
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
                    </div>

                    <div className="space-y-2">
                      <Label>Limit</Label>
                      <Input 
                        type="number" 
                        value={enrichLimit} 
                        onChange={(e) => setEnrichLimit(parseInt(e.target.value) || 25)}
                        min={1}
                        max={100}
                        data-testid="input-enrich-limit"
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleBatchEnrich}
                      disabled={batchEnrichMutation.isPending}
                      data-testid="button-run-enrich"
                    >
                      {batchEnrichMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Enriching...</>
                      ) : (
                        <><Sparkles className="h-4 w-4 mr-2" /> Enrich Up to {enrichLimit} Businesses</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="outreach">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Batch Outreach
                    </CardTitle>
                    <CardDescription>Generate personalized outreach emails for qualified leads</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City (optional)</Label>
                        <Select value={outreachCity} onValueChange={setOutreachCity}>
                          <SelectTrigger data-testid="select-outreach-city">
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
                        <Label>Category (optional)</Label>
                        <Select value={outreachCategory} onValueChange={setOutreachCategory}>
                          <SelectTrigger data-testid="select-outreach-category">
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
                    </div>

                    <div className="space-y-2">
                      <Label>Limit</Label>
                      <Input 
                        type="number" 
                        value={outreachLimit} 
                        onChange={(e) => setOutreachLimit(parseInt(e.target.value) || 25)}
                        min={1}
                        max={100}
                        data-testid="input-outreach-limit"
                      />
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleBatchOutreach}
                      disabled={batchOutreachMutation.isPending}
                      data-testid="button-run-outreach"
                    >
                      {batchOutreachMutation.isPending ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                      ) : (
                        <><Mail className="h-4 w-4 mr-2" /> Generate Up to {outreachLimit} Emails</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {user?.role === 'admin' && (
                <TabsContent value="export">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Export Data
                      </CardTitle>
                      <CardDescription>Export business data in various formats</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>City (optional)</Label>
                          <Select value={exportCity} onValueChange={setExportCity}>
                            <SelectTrigger data-testid="select-export-city">
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
                          <Label>Category (optional)</Label>
                          <Select value={exportCategory} onValueChange={setExportCategory}>
                            <SelectTrigger data-testid="select-export-category">
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
                      </div>

                      <div className="space-y-2">
                        <Label>Format</Label>
                        <Select value={exportFormat} onValueChange={(v: "csv" | "movvia") => setExportFormat(v)}>
                          <SelectTrigger data-testid="select-export-format">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-popover">
                            <SelectItem value="csv">CSV (Standard)</SelectItem>
                            <SelectItem value="movvia">Movvia Vendor Format</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <Button 
                        className="w-full" 
                        onClick={handleExport}
                        data-testid="button-run-export"
                      >
                        <Download className="h-4 w-4 mr-2" /> Export as {exportFormat.toUpperCase()}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          <Card className="h-fit sticky top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                Operation Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[500px]">
                {logs.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Terminal className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No operations yet</p>
                    <p className="text-sm mt-1">Run a batch operation to see logs here</p>
                  </div>
                ) : (
                  <div className="space-y-2 font-mono text-sm">
                    {logs.map((log) => (
                      <div 
                        key={log.id}
                        className={`p-2 rounded-md border ${
                          log.status === "error" ? "border-red-500/30 bg-red-500/5" :
                          log.status === "success" ? "border-green-500/30 bg-green-500/5" :
                          log.status === "running" ? "border-blue-500/30 bg-blue-500/5" :
                          ""
                        }`}
                        data-testid={`log-entry-${log.id}`}
                      >
                        <div className="flex items-start gap-2">
                          {getStatusIcon(log.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {getTypeIcon(log.type)}
                              <span className="text-xs text-muted-foreground">
                                {log.timestamp.toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm break-words">{log.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
              {logs.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4" 
                  onClick={() => setLogs([])}
                  data-testid="button-clear-logs"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Clear Logs
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
