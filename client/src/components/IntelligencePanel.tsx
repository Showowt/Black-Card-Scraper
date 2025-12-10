import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Search, Star, MessageCircle, Globe, RefreshCw, AlertTriangle,
  TrendingUp, TrendingDown, Users, Phone, Building2, Copy, Check, Sparkles
} from "lucide-react";
import { SiInstagram, SiTripadvisor, SiWhatsapp } from "react-icons/si";
import type { Business } from "@shared/schema";

interface InstagramCandidate {
  handle: string;
  source: string;
  confidence: number;
  profileUrl: string;
  validationNotes: string;
  followers: number;
  fullName: string;
  isVerified: boolean;
  isBusiness: boolean;
}

interface InstagramDiscoveryData {
  businessId: string;
  businessName: string;
  discovery: {
    businessName: string;
    city: string;
    bestMatch: InstagramCandidate | null;
    allCandidates: InstagramCandidate[];
    sourcesChecked: string[];
    discoverySuccessful: boolean;
    error: string;
  };
  formattedSummary: string;
}

interface IntelligencePanelProps {
  business: Business;
}

interface IntelligenceData {
  businessId: string;
  businessName: string;
  intel: {
    businessName: string;
    category: string;
    city: string;
    instagram: {
      handle: string;
      followers: number;
      postsCount: number;
      followerTier: string;
      postingFrequency: string;
      engagementEstimate: string;
      dmLink: string;
      scrapeSuccess: boolean;
      error: string;
    } | null;
    googleReviews: {
      overallRating: number;
      totalReviews: number;
      responseRate: number;
      sentimentSummary: string;
      commonComplaints: string[];
      commonPraises: string[];
      negativeReviewCount: number;
      unansweredReviews: number;
      scrapeSuccess: boolean;
      error: string;
    } | null;
    tripadvisor: {
      rating: number;
      totalReviews: number;
      ranking: string;
      rankingPosition: number;
      rankingTotal: number;
      certificateOfExcellence: boolean;
      travelerChoice: boolean;
      scrapeSuccess: boolean;
      error: string;
    } | null;
    otaPresence: {
      onBookingCom: boolean;
      onExpedia: boolean;
      onAirbnb: boolean;
      onViator: boolean;
      onGetyourguide: boolean;
      otaDependencyScore: number;
      directBookingOpportunity: string;
      estimatedCommissionLoss: number;
      scrapeSuccess: boolean;
      error: string;
    } | null;
    whatsapp: {
      phoneNumber: string;
      waLink: string;
      hasWhatsappBusiness: boolean;
      hasAutoReply: boolean;
      estimatedResponseTime: string;
      responseTimeHook: string;
      scrapeSuccess: boolean;
      error: string;
    } | null;
    totalSocialFollowers: number;
    totalReviewsAllPlatforms: number;
    averageRatingAllPlatforms: number;
    digitalPresenceScore: number;
    automationOpportunityScore: number;
    outreachHooks: string[];
  };
  formattedSummary: string;
}

export default function IntelligencePanel({ business }: IntelligencePanelProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState<string | null>(null);
  
  const { data: intelligence, isLoading, refetch, isRefetching } = useQuery<IntelligenceData>({
    queryKey: ['/api/intel/business', business.id],
    enabled: false,
  });

  const gatherMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/intel/business/${business.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to gather intelligence');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/intel/business', business.id], data);
      toast({ title: "Intelligence Gathered", description: "All available data has been collected" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  const { data: discoveryData } = useQuery<InstagramDiscoveryData>({
    queryKey: ['/api/intel/discover-instagram', business.id],
    enabled: false,
  });

  const discoverMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/intel/discover-instagram/${business.id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to discover Instagram');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/intel/discover-instagram', business.id], data);
      if (data.discovery?.bestMatch) {
        toast({ 
          title: "Instagram Found!", 
          description: `@${data.discovery.bestMatch.handle} (${Math.round(data.discovery.bestMatch.confidence * 100)}% confidence)` 
        });
      } else {
        toast({ title: "Discovery Complete", description: "No high-confidence match found" });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Discovery Failed", description: error.message, variant: "destructive" });
    },
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const intel = intelligence?.intel;
  const hasData = !!intel;

  return (
    <Card data-testid="card-intelligence-panel">
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5" />
            Advanced Intelligence
          </CardTitle>
          <CardDescription>
            Instagram, Google Reviews, TripAdvisor, OTA Presence, WhatsApp
          </CardDescription>
        </div>
        <Button 
          onClick={() => gatherMutation.mutate()} 
          disabled={gatherMutation.isPending}
          data-testid="button-gather-intel"
        >
          {gatherMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Gathering...
            </>
          ) : (
            <>
              <Search className="w-4 h-4 mr-2" />
              {hasData ? 'Refresh Intel' : 'Gather Intelligence'}
            </>
          )}
        </Button>
      </CardHeader>
      
      <CardContent>
        {!hasData && !gatherMutation.isPending && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Click "Gather Intelligence" to scan this business across multiple platforms</p>
            <p className="text-sm mt-1">Instagram, Google Reviews, TripAdvisor, OTA platforms, WhatsApp</p>
          </div>
        )}

        {gatherMutation.isPending && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Scanning platforms...</span>
            </div>
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        )}

        {hasData && (
          <div className="space-y-6">
            {/* Summary Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-2xl font-bold">{intel.digitalPresenceScore}</div>
                <div className="text-xs text-muted-foreground">Digital Presence</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-2xl font-bold">{intel.automationOpportunityScore}</div>
                <div className="text-xs text-muted-foreground">Automation Opportunity</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-2xl font-bold">{intel.totalReviewsAllPlatforms.toLocaleString()}</div>
                <div className="text-xs text-muted-foreground">Total Reviews</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-md">
                <div className="text-2xl font-bold">{intel.averageRatingAllPlatforms.toFixed(1)}</div>
                <div className="text-xs text-muted-foreground">Avg Rating</div>
              </div>
            </div>

            {/* Outreach Hooks */}
            {intel.outreachHooks && intel.outreachHooks.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Sales Hooks
                </h4>
                <div className="space-y-2">
                  {intel.outreachHooks.map((hook, i) => (
                    <div key={i} className="p-3 bg-muted rounded-md text-sm flex items-start justify-between gap-2">
                      <span>{hook}</span>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        className="shrink-0"
                        onClick={() => copyToClipboard(hook, `hook-${i}`)}
                        data-testid={`button-copy-hook-${i}`}
                      >
                        {copied === `hook-${i}` ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Platform Details */}
            <Tabs defaultValue="discover" className="w-full">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="discover" className="gap-1" data-testid="tab-discover">
                  <Sparkles className="w-4 h-4" />
                  <span className="hidden md:inline">Discover</span>
                </TabsTrigger>
                <TabsTrigger value="instagram" className="gap-1" data-testid="tab-instagram">
                  <SiInstagram className="w-4 h-4" />
                  <span className="hidden md:inline">IG</span>
                </TabsTrigger>
                <TabsTrigger value="google" className="gap-1" data-testid="tab-google">
                  <Star className="w-4 h-4" />
                  <span className="hidden md:inline">Reviews</span>
                </TabsTrigger>
                <TabsTrigger value="tripadvisor" className="gap-1" data-testid="tab-tripadvisor">
                  <SiTripadvisor className="w-4 h-4" />
                  <span className="hidden md:inline">TripAdv</span>
                </TabsTrigger>
                <TabsTrigger value="ota" className="gap-1" data-testid="tab-ota">
                  <Building2 className="w-4 h-4" />
                  <span className="hidden md:inline">OTA</span>
                </TabsTrigger>
                <TabsTrigger value="whatsapp" className="gap-1" data-testid="tab-whatsapp">
                  <SiWhatsapp className="w-4 h-4" />
                  <span className="hidden md:inline">WA</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="discover" className="mt-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="font-medium">Instagram Discovery</h4>
                      <p className="text-sm text-muted-foreground">
                        Multi-source search to find the business Instagram handle
                      </p>
                    </div>
                    <Button
                      onClick={() => discoverMutation.mutate()}
                      disabled={discoverMutation.isPending}
                      size="sm"
                      data-testid="button-discover-instagram"
                    >
                      {discoverMutation.isPending ? (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Discovering...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Discover Instagram
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {discoverMutation.isPending && (
                    <div className="space-y-2">
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-24 w-full" />
                    </div>
                  )}

                  {discoveryData?.discovery && (
                    <div className="space-y-4">
                      {discoveryData.discovery.bestMatch ? (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-md">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <SiInstagram className="w-5 h-5 text-pink-500" />
                              <span className="font-bold">@{discoveryData.discovery.bestMatch.handle}</span>
                              {discoveryData.discovery.bestMatch.isVerified && (
                                <Badge variant="secondary" className="text-xs">Verified</Badge>
                              )}
                              {discoveryData.discovery.bestMatch.isBusiness && (
                                <Badge variant="outline" className="text-xs">Business</Badge>
                              )}
                            </div>
                            <Badge variant="default" className="bg-green-600">
                              {Math.round(discoveryData.discovery.bestMatch.confidence * 100)}% match
                            </Badge>
                          </div>
                          {discoveryData.discovery.bestMatch.followers > 0 && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {discoveryData.discovery.bestMatch.followers.toLocaleString()} followers
                              {discoveryData.discovery.bestMatch.fullName && ` | ${discoveryData.discovery.bestMatch.fullName}`}
                            </p>
                          )}
                          <div className="flex items-center gap-2 flex-wrap">
                            <Button size="sm" variant="outline" asChild>
                              <a 
                                href={discoveryData.discovery.bestMatch.profileUrl} 
                                target="_blank" 
                                rel="noopener"
                                data-testid="link-discovered-instagram"
                              >
                                <Globe className="w-4 h-4 mr-1" /> Profile
                              </a>
                            </Button>
                            <Button size="sm" variant="outline" asChild>
                              <a 
                                href={`https://ig.me/m/${discoveryData.discovery.bestMatch.handle}`} 
                                target="_blank" 
                                rel="noopener"
                                data-testid="link-discovered-dm"
                              >
                                <MessageCircle className="w-4 h-4 mr-1" /> DM
                              </a>
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => copyToClipboard(`@${discoveryData.discovery.bestMatch!.handle}`, 'ig-handle')}
                              data-testid="button-copy-handle"
                            >
                              {copied === 'ig-handle' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Source: {discoveryData.discovery.bestMatch.source}
                            {discoveryData.discovery.bestMatch.validationNotes && (
                              <span> | {discoveryData.discovery.bestMatch.validationNotes}</span>
                            )}
                          </p>
                        </div>
                      ) : (
                        <div className="p-4 bg-muted rounded-md text-center">
                          <SiInstagram className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          <p className="text-muted-foreground">No high-confidence Instagram match found</p>
                        </div>
                      )}

                      {discoveryData.discovery.allCandidates.length > 1 && (
                        <div className="space-y-2">
                          <h5 className="text-sm font-medium">Other candidates:</h5>
                          <div className="space-y-1">
                            {discoveryData.discovery.allCandidates.slice(1, 5).map((candidate, i) => (
                              <div key={i} className="flex items-center justify-between text-sm p-2 bg-muted rounded-md">
                                <a 
                                  href={candidate.profileUrl} 
                                  target="_blank" 
                                  rel="noopener" 
                                  className="hover:underline"
                                  data-testid={`link-candidate-${i}`}
                                >
                                  @{candidate.handle}
                                </a>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{candidate.source}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {Math.round(candidate.confidence * 100)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground">
                        Sources checked: {discoveryData.discovery.sourcesChecked.join(', ')}
                      </div>
                    </div>
                  )}

                  {!discoveryData && !discoverMutation.isPending && (
                    <div className="text-center py-4 text-muted-foreground">
                      <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Click "Discover Instagram" to search for the business's Instagram handle</p>
                      <p className="text-xs mt-1">Searches website, name variations, and validates profiles</p>
                    </div>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="instagram" className="mt-4">
                {intel.instagram?.scrapeSuccess ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{intel.instagram.followers.toLocaleString()}</div>
                        <div className="text-xs text-muted-foreground">Followers</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{intel.instagram.postsCount}</div>
                        <div className="text-xs text-muted-foreground">Posts</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <Badge variant="outline">{intel.instagram.followerTier}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-muted-foreground">
                        Posting: {intel.instagram.postingFrequency} | Engagement: {intel.instagram.engagementEstimate}
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <a href={intel.instagram.dmLink} target="_blank" rel="noopener" data-testid="link-instagram-dm">
                          <MessageCircle className="w-4 h-4 mr-1" /> DM
                        </a>
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <SiInstagram className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{intel.instagram?.error || 'No Instagram data available'}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="google" className="mt-4">
                {intel.googleReviews?.scrapeSuccess ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-muted rounded-md">
                        <div className="flex items-center justify-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          <span className="text-lg font-bold">{intel.googleReviews.overallRating}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{intel.googleReviews.totalReviews}</div>
                        <div className="text-xs text-muted-foreground">Reviews</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{intel.googleReviews.responseRate.toFixed(0)}%</div>
                        <div className="text-xs text-muted-foreground">Response Rate</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={intel.googleReviews.sentimentSummary === 'Preocupante' ? 'destructive' : 'secondary'}>
                        {intel.googleReviews.sentimentSummary}
                      </Badge>
                      {intel.googleReviews.unansweredReviews > 0 && (
                        <Badge variant="outline" className="text-amber-500">
                          {intel.googleReviews.unansweredReviews} unanswered
                        </Badge>
                      )}
                    </div>
                    {intel.googleReviews.commonComplaints.length > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Common issues: </span>
                        {intel.googleReviews.commonComplaints.join(', ')}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{intel.googleReviews?.error || 'No Google Reviews data available'}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="tripadvisor" className="mt-4">
                {intel.tripadvisor?.scrapeSuccess ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-3 text-center">
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{intel.tripadvisor.rating}</div>
                        <div className="text-xs text-muted-foreground">Rating</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-lg font-bold">{intel.tripadvisor.totalReviews}</div>
                        <div className="text-xs text-muted-foreground">Reviews</div>
                      </div>
                      <div className="p-2 bg-muted rounded-md">
                        <div className="text-sm font-medium">#{intel.tripadvisor.rankingPosition}</div>
                        <div className="text-xs text-muted-foreground">of {intel.tripadvisor.rankingTotal}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {intel.tripadvisor.certificateOfExcellence && (
                        <Badge variant="secondary">Certificate of Excellence</Badge>
                      )}
                      {intel.tripadvisor.travelerChoice && (
                        <Badge variant="secondary">Travelers' Choice</Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <SiTripadvisor className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{intel.tripadvisor?.error || 'No TripAdvisor data available'}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="ota" className="mt-4">
                {intel.otaPresence?.scrapeSuccess ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={intel.otaPresence.onBookingCom ? "default" : "outline"}>
                        Booking.com {intel.otaPresence.onBookingCom ? '✓' : ''}
                      </Badge>
                      <Badge variant={intel.otaPresence.onExpedia ? "default" : "outline"}>
                        Expedia {intel.otaPresence.onExpedia ? '✓' : ''}
                      </Badge>
                      <Badge variant={intel.otaPresence.onAirbnb ? "default" : "outline"}>
                        Airbnb {intel.otaPresence.onAirbnb ? '✓' : ''}
                      </Badge>
                      <Badge variant={intel.otaPresence.onViator ? "default" : "outline"}>
                        Viator {intel.otaPresence.onViator ? '✓' : ''}
                      </Badge>
                      <Badge variant={intel.otaPresence.onGetyourguide ? "default" : "outline"}>
                        GetYourGuide {intel.otaPresence.onGetyourguide ? '✓' : ''}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>OTA Dependency</span>
                        <span className="font-medium">{intel.otaPresence.otaDependencyScore}/100</span>
                      </div>
                      <Progress value={intel.otaPresence.otaDependencyScore} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Badge variant={
                        intel.otaPresence.directBookingOpportunity === 'high' ? 'default' :
                        intel.otaPresence.directBookingOpportunity === 'medium' ? 'secondary' : 'outline'
                      }>
                        {intel.otaPresence.directBookingOpportunity} direct booking opportunity
                      </Badge>
                      {intel.otaPresence.estimatedCommissionLoss > 0 && (
                        <span className="text-sm text-amber-600 font-medium">
                          ~${intel.otaPresence.estimatedCommissionLoss.toLocaleString()}/mo lost
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Building2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{intel.otaPresence?.error || 'No OTA data available'}</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="whatsapp" className="mt-4">
                {intel.whatsapp?.scrapeSuccess ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant={intel.whatsapp.hasWhatsappBusiness ? "default" : "outline"}>
                        {intel.whatsapp.hasWhatsappBusiness ? 'WhatsApp Business' : 'No Business Account'}
                      </Badge>
                      {intel.whatsapp.hasAutoReply && (
                        <Badge variant="secondary">Auto-Reply Configured</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Est. Response: {intel.whatsapp.estimatedResponseTime}
                      </span>
                      <Button size="sm" variant="outline" asChild>
                        <a href={intel.whatsapp.waLink} target="_blank" rel="noopener" data-testid="link-whatsapp">
                          <SiWhatsapp className="w-4 h-4 mr-1" /> Open WhatsApp
                        </a>
                      </Button>
                    </div>
                    {intel.whatsapp.responseTimeHook && (
                      <div className="p-3 bg-muted rounded-md text-sm flex items-start justify-between gap-2">
                        <span>{intel.whatsapp.responseTimeHook}</span>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="shrink-0"
                          onClick={() => copyToClipboard(intel.whatsapp!.responseTimeHook, 'wa-hook')}
                        >
                          {copied === 'wa-hook' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <SiWhatsapp className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{intel.whatsapp?.error || 'No WhatsApp data available'}</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
