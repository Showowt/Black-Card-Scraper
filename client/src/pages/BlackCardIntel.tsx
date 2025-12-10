import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, Brain, DollarSign, TrendingUp, Ghost, Target, Shield,
  Gift, Rocket, RefreshCw, ArrowLeft, User, Star, MapPin,
  AlertTriangle, CheckCircle, Clock, Zap, BarChart3, Calendar
} from "lucide-react";
import type { Business } from "@shared/schema";

interface BlackCardIntelligence {
  business: {
    id: string;
    name: string;
    category: string;
    city: string;
    rating: number;
    reviewCount: number;
    website: string;
    instagram: string;
    phone: string;
  };
  decisionMaker: {
    psychologyProfile: string;
    buyingStyle: string;
    riskTolerance: string;
    motivators: string[];
    communicationStyle: string;
    decisionDrivers: string[];
  };
  categorySolutions: {
    core_solutions: string[];
    quick_wins: string[];
    advanced_features: string[];
    metrics_improved: string[];
  };
  financialLeaks: {
    totalMonthlyLeak: number;
    leakBreakdown: Array<{
      category: string;
      amount: number;
      explanation: string;
      fixPriority: string;
    }>;
    annualImpact: number;
    competitorAdvantage: string;
    quickWins: string[];
    roiIfFixed: string;
  };
  roiTimeline: {
    implementationWeeks: number;
    milestones: Array<{
      week: number;
      milestone: string;
      expectedOutcome: string;
      roiContribution: number;
    }>;
    breakEvenPoint: string;
    monthlyROI: Array<{
      month: number;
      cumulativeInvestment: number;
      cumulativeSavings: number;
      netPosition: number;
    }>;
    yearOneProjection: number;
    yearThreeProjection: number;
  };
  competitorMirror: {
    competitorActions: Array<{
      action: string;
      impact: string;
      adoptionRate: string;
    }>;
    marketGaps: string[];
    differentiationOpportunities: string[];
    urgentThreats: string[];
    catchUpActions: string[];
    leapfrogStrategies: string[];
  };
  greedTriggers: {
    primaryTrigger: string;
    monetaryHook: string;
    statusHook: string;
    freedomHook: string;
    exclusivityHook: string;
    fomoPitch: string;
    successStoryAngle: string;
    numbersToMention: string[];
    closingGreedStatement: string;
  };
  preEmptiveObjections: Array<{
    type: string;
    triggers: string[];
    framework: string;
    responseAngles: string[];
  }>;
  customOffer: {
    baseOffer: string;
    mutations: Array<{
      variant: string;
      description: string;
      priceAnchor: string;
      urgencyElement: string;
      targetProfile: string;
    }>;
    recommendedMutation: string;
    pricingStrategy: string;
    bonusStack: string[];
    guaranteeFraming: string;
    scarcityElement: string;
  };
  postCloseBlueprint: {
    week1: string[];
    week2: string[];
    month1: string[];
    month2: string[];
    month3: string[];
    retentionTriggers: string[];
    upsellOpportunities: string[];
  };
}

function IntelSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" data-testid="intel-skeleton">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default function BlackCardIntel() {
  const params = useParams<{ id?: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>(params.id || "");

  const businessId = params.id || selectedBusinessId;

  const { data: businesses, isLoading: loadingBusinesses } = useQuery<Business[]>({
    queryKey: ["/api/businesses?limit=100"],
  });

  const { data: intelligence, isLoading: loadingIntel, refetch } = useQuery<BlackCardIntelligence>({
    queryKey: ['/api/blackcard', businessId],
    enabled: !!businessId,
  });

  const generateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", "/api/blackcard/generate", { businessId: id });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Intelligence Generated", description: "Black Card intelligence has been generated" });
      queryClient.invalidateQueries({ queryKey: ['/api/blackcard', businessId] });
    },
    onError: (error: Error) => {
      toast({ title: "Generation Failed", description: error.message, variant: "destructive" });
    },
  });

  const handleGenerate = () => {
    if (businessId) {
      generateMutation.mutate(businessId);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "critical": return "destructive";
      case "high": return "secondary";
      case "medium": return "outline";
      default: return "outline";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-medium">Black Card Intelligence</span>
          </div>
          
          <nav className="flex items-center gap-4 flex-wrap">
            <Link href="/">
              <Button variant="ghost" size="sm" data-testid="nav-dashboard">
                <ArrowLeft className="h-4 w-4 mr-1" /> Dashboard
              </Button>
            </Link>
            <Link href="/copilot">
              <Button variant="ghost" size="sm" data-testid="nav-copilot">
                <Brain className="h-4 w-4 mr-1" /> Copilot
              </Button>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback>{user?.firstName?.[0] || user?.email?.[0] || 'U'}</AvatarFallback>
            </Avatar>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex flex-col gap-2">
            <h1 className="text-2xl font-medium">9-Component Intelligence View</h1>
            <p className="text-muted-foreground">Complete sales intelligence package for targeted outreach</p>
          </div>
          
          <div className="flex items-center gap-3 flex-wrap">
            {!params.id && (
              <Select 
                value={selectedBusinessId} 
                onValueChange={setSelectedBusinessId}
                data-testid="select-business"
              >
                <SelectTrigger className="w-64" data-testid="business-selector">
                  <SelectValue placeholder="Select a business..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingBusinesses ? (
                    <SelectItem value="loading" disabled>Loading...</SelectItem>
                  ) : (
                    businesses?.map((b) => (
                      <SelectItem key={b.id} value={b.id} data-testid={`business-option-${b.id}`}>
                        {b.name} ({b.city})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
            
            <Button 
              onClick={handleGenerate} 
              disabled={!businessId || generateMutation.isPending}
              data-testid="button-generate-intel"
            >
              {generateMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Zap className="h-4 w-4 mr-1" />
              )}
              Generate Intelligence
            </Button>
          </div>
        </div>

        {intelligence?.business && (
          <Card className="mb-6" data-testid="business-header-card">
            <CardContent className="pt-6">
              <div className="flex items-center gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-md bg-primary/10 flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-medium" data-testid="text-business-name">{intelligence.business.name}</h2>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{intelligence.business.category}</Badge>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" /> {intelligence.business.city}
                      </span>
                      {intelligence.business.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" /> {intelligence.business.rating} ({intelligence.business.reviewCount} reviews)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!businessId ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Brain className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Select a Business</h3>
              <p className="text-muted-foreground">Choose a business from the dropdown to view its complete intelligence profile</p>
            </CardContent>
          </Card>
        ) : loadingIntel ? (
          <IntelSkeleton />
        ) : intelligence ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card data-testid="card-decision-maker">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Decision Maker Profile
                </CardTitle>
                <CardDescription>Psychology and buying behavior</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Psychology Profile</span>
                  <p className="font-medium" data-testid="text-psychology">{intelligence.decisionMaker.psychologyProfile}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Buying Style</span>
                  <p className="font-medium" data-testid="text-buying-style">{intelligence.decisionMaker.buyingStyle}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Risk Tolerance</span>
                  <Badge variant={intelligence.decisionMaker.riskTolerance === "aggressive" ? "default" : "secondary"} data-testid="badge-risk">
                    {intelligence.decisionMaker.riskTolerance}
                  </Badge>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Key Motivators</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.decisionMaker.motivators?.map((m, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-category-solutions">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Category Solutions
                </CardTitle>
                <CardDescription>Vertical-specific features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Core Solutions</span>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    {intelligence.categorySolutions.core_solutions?.slice(0, 3).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Quick Wins</span>
                  <ul className="list-disc list-inside text-sm mt-1 space-y-1">
                    {intelligence.categorySolutions.quick_wins?.slice(0, 3).map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Metrics Improved</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.categorySolutions.metrics_improved?.map((m, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{m}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-financial-leaks">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Financial Leak Calculator
                </CardTitle>
                <CardDescription>Monthly losses identified</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 bg-destructive/10 rounded-md">
                  <span className="text-sm text-muted-foreground">Total Monthly Leak</span>
                  <p className="text-2xl font-bold text-destructive" data-testid="text-monthly-leak">
                    ${intelligence.financialLeaks.totalMonthlyLeak?.toLocaleString()}
                  </p>
                  <span className="text-xs text-muted-foreground">Annual: ${intelligence.financialLeaks.annualImpact?.toLocaleString()}</span>
                </div>
                <div className="space-y-2">
                  {intelligence.financialLeaks.leakBreakdown?.slice(0, 3).map((leak, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant={getPriorityColor(leak.fixPriority) as any} className="text-xs">
                          {leak.fixPriority}
                        </Badge>
                        <span>{leak.category}</span>
                      </div>
                      <span className="font-medium">${leak.amount?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">ROI if Fixed:</span> {intelligence.financialLeaks.roiIfFixed}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-roi-timeline">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  ROI Timeline
                </CardTitle>
                <CardDescription>Break-even calculation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2 bg-muted rounded-md text-center">
                    <span className="text-xs text-muted-foreground">Break-Even</span>
                    <p className="font-bold text-primary" data-testid="text-breakeven">{intelligence.roiTimeline.breakEvenPoint}</p>
                  </div>
                  <div className="p-2 bg-muted rounded-md text-center">
                    <span className="text-xs text-muted-foreground">Implementation</span>
                    <p className="font-bold">{intelligence.roiTimeline.implementationWeeks} weeks</p>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Milestones</span>
                  <div className="space-y-2 mt-2">
                    {intelligence.roiTimeline.milestones?.slice(0, 3).map((m, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-xs">W{m.week}</Badge>
                        <span>{m.milestone}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="text-sm">
                  <span className="text-muted-foreground">Year 1 Projection: </span>
                  <span className="font-medium text-green-600" data-testid="text-year1">${intelligence.roiTimeline.yearOneProjection?.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-competitor-mirror">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ghost className="h-5 w-5" />
                  Competitor Ghost Mirror
                </CardTitle>
                <CardDescription>What competitors are doing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Competitor Actions</span>
                  <div className="space-y-2 mt-1">
                    {intelligence.competitorMirror.competitorActions?.slice(0, 2).map((a, i) => (
                      <div key={i} className="text-sm p-2 bg-muted rounded-md">
                        <p className="font-medium">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.adoptionRate}</p>
                      </div>
                    ))}
                  </div>
                </div>
                {intelligence.competitorMirror.urgentThreats?.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" /> Urgent Threats
                    </span>
                    <ul className="text-sm mt-1 space-y-1">
                      {intelligence.competitorMirror.urgentThreats?.slice(0, 2).map((t, i) => (
                        <li key={i} className="text-destructive/80">{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <div>
                  <span className="text-sm text-muted-foreground">Leapfrog Strategies</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.competitorMirror.leapfrogStrategies?.slice(0, 2).map((s, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-greed-triggers">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Greed Triggers
                </CardTitle>
                <CardDescription>Psychological levers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-2 bg-primary/10 rounded-md">
                  <span className="text-xs text-muted-foreground">Primary Trigger</span>
                  <p className="text-sm font-medium" data-testid="text-primary-trigger">{intelligence.greedTriggers.primaryTrigger}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Monetary Hook</span>
                  <p className="text-sm">{intelligence.greedTriggers.monetaryHook}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Status Hook</span>
                  <p className="text-sm italic">{intelligence.greedTriggers.statusHook}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Numbers to Mention</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.greedTriggers.numbersToMention?.slice(0, 3).map((n, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{n}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-objections">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Pre-Emptive Objections
                </CardTitle>
                <CardDescription>Scripts for common objections</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {intelligence.preEmptiveObjections?.slice(0, 4).map((obj, i) => (
                  <div key={i} className="p-2 bg-muted rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <Badge variant="secondary" className="capitalize">{obj.type}</Badge>
                      <Badge variant="outline" className="text-xs">{obj.framework}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Triggers: {obj.triggers?.slice(0, 3).join(", ")}
                    </div>
                    <div className="text-xs mt-1">
                      {obj.responseAngles?.[0]}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card data-testid="card-custom-offer">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Custom Offer
                </CardTitle>
                <CardDescription>Mutated pricing and features</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <span className="text-sm text-muted-foreground">Base Offer</span>
                  <p className="font-medium" data-testid="text-base-offer">{intelligence.customOffer.baseOffer}</p>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Recommended Package</span>
                  <Badge variant="default">{intelligence.customOffer.recommendedMutation}</Badge>
                </div>
                <div className="space-y-2">
                  {intelligence.customOffer.mutations?.slice(0, 2).map((m, i) => (
                    <div key={i} className="p-2 bg-muted rounded-md text-sm">
                      <p className="font-medium">{m.variant}</p>
                      <p className="text-xs text-muted-foreground">{m.priceAnchor}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Bonus Stack</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.customOffer.bonusStack?.slice(0, 3).map((b, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{b}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Scarcity: </span>{intelligence.customOffer.scarcityElement}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="card-post-close">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Rocket className="h-5 w-5" />
                  Post-Close Blueprint
                </CardTitle>
                <CardDescription>Retention roadmap</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Week 1</Badge>
                    <span className="text-sm">{intelligence.postCloseBlueprint.week1?.[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Week 2</Badge>
                    <span className="text-sm">{intelligence.postCloseBlueprint.week2?.[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Month 1</Badge>
                    <span className="text-sm">{intelligence.postCloseBlueprint.month1?.[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Month 2</Badge>
                    <span className="text-sm">{intelligence.postCloseBlueprint.month2?.[0]}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">Month 3</Badge>
                    <span className="text-sm">{intelligence.postCloseBlueprint.month3?.[0]}</span>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Retention Triggers</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.postCloseBlueprint.retentionTriggers?.slice(0, 3).map((r, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{r}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Upsell Opportunities</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {intelligence.postCloseBlueprint.upsellOpportunities?.slice(0, 3).map((u, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{u}</Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Intelligence Found</h3>
              <p className="text-muted-foreground mb-4">Click "Generate Intelligence" to create a full intelligence profile</p>
              <Button onClick={handleGenerate} disabled={generateMutation.isPending} data-testid="button-generate-empty">
                <Zap className="h-4 w-4 mr-1" /> Generate Now
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
