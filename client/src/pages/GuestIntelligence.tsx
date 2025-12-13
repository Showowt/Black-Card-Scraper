import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Building2, LogOut, Users, Crown, Activity, Target, 
  Brain, Fingerprint, Search, Plus, UserCircle, Star, 
  ArrowLeft, BarChart3, Phone, Mail
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import type { GuestProfile, GuestVipActivity } from "@shared/schema";
import { COLLECTION_MECHANISMS } from "@shared/schema";

interface GuestIntelSummary {
  totalProfiles: number;
  avgCompleteness: number;
  vipCount: number;
  signalsToday: number;
  totalLifetimeValue: number;
}

interface CompletenessDistributionResponse {
  minimal: number;
  basic: number;
  good: number;
  complete: number;
}

interface MechanismStats {
  mechanism: string;
  count: number;
}

interface MechanismsResponse {
  mechanisms: MechanismStats[];
  definitions: typeof COLLECTION_MECHANISMS;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function GuestIntelligence() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: "",
    email: "",
    phone: "",
    propertyName: "",
    isVip: false,
  });

  const { data: summary, isLoading: loadingSummary } = useQuery<GuestIntelSummary>({
    queryKey: ["/api/guest-intel/summary"],
  });

  const { data: distributionResponse, isLoading: loadingDistribution } = useQuery<CompletenessDistributionResponse>({
    queryKey: ["/api/guest-intel/distribution"],
  });

  const { data: mechanismsResponse, isLoading: loadingMechanisms } = useQuery<MechanismsResponse>({
    queryKey: ["/api/guest-intel/mechanisms"],
  });
  const mechanisms = mechanismsResponse?.mechanisms;

  const { data: vipActivity, isLoading: loadingActivity } = useQuery<(GuestVipActivity & { profileName?: string })[]>({
    queryKey: ["/api/guest-intel/vip-activity"],
  });

  const profilesUrl = searchQuery 
    ? `/api/guest-intel/profiles?search=${encodeURIComponent(searchQuery)}`
    : "/api/guest-intel/profiles";

  const { data: profiles, isLoading: loadingProfiles } = useQuery<GuestProfile[]>({
    queryKey: [profilesUrl],
  });

  const createProfileMutation = useMutation({
    mutationFn: async (data: typeof newProfile) => {
      const res = await apiRequest("POST", "/api/guest-intel/profiles", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/guest-intel/profiles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/guest-intel/summary"] });
      setDialogOpen(false);
      setNewProfile({ name: "", email: "", phone: "", propertyName: "", isVip: false });
      toast({ title: "Profile created", description: "Guest profile added successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create profile", variant: "destructive" });
    },
  });

  const distributionData = distributionResponse 
    ? [
        { bucket: '<25%', count: distributionResponse.minimal },
        { bucket: '25-50%', count: distributionResponse.basic },
        { bucket: '50-75%', count: distributionResponse.good },
        { bucket: '75%+', count: distributionResponse.complete },
      ]
    : [];
  const mechanismsData = (mechanisms || []).map(m => ({
    name: COLLECTION_MECHANISMS.find(c => c.id === m.mechanism)?.name || m.mechanism,
    value: m.count,
  }));

  const getMechanismDescription = (id: string) => 
    COLLECTION_MECHANISMS.find(c => c.id === id)?.description || "";

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
              <Button variant="ghost" size="sm" data-testid="nav-dashboard">Dashboard</Button>
            </Link>
            <Link href="/guest-intel">
              <Button variant="ghost" size="sm" className="bg-accent" data-testid="nav-guest-intel">
                <Fingerprint className="h-4 w-4 mr-1" /> Guest Intel
              </Button>
            </Link>
            <Link href="/call-companion">
              <Button variant="ghost" size="sm" data-testid="nav-call-companion">
                <Phone className="h-4 w-4 mr-1" /> Calls
              </Button>
            </Link>
          </nav>
          
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

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
          <div className="flex items-center gap-3">
            <Fingerprint className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-medium" data-testid="text-page-title">Guest Intelligence</h1>
              <p className="text-sm text-muted-foreground">Genome Protocol - Know every guest before they ask</p>
            </div>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-profile">
                <Plus className="h-4 w-4 mr-1" /> Add Guest
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Guest Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newProfile.name}
                    onChange={(e) => setNewProfile(p => ({ ...p, name: e.target.value }))}
                    placeholder="Guest name"
                    data-testid="input-profile-name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newProfile.email}
                    onChange={(e) => setNewProfile(p => ({ ...p, email: e.target.value }))}
                    placeholder="guest@example.com"
                    data-testid="input-profile-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={newProfile.phone}
                    onChange={(e) => setNewProfile(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+1234567890"
                    data-testid="input-profile-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="property">Property</Label>
                  <Input
                    id="property"
                    value={newProfile.propertyName}
                    onChange={(e) => setNewProfile(p => ({ ...p, propertyName: e.target.value }))}
                    placeholder="Property name"
                    data-testid="input-profile-property"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={() => createProfileMutation.mutate(newProfile)}
                  disabled={!newProfile.name || createProfileMutation.isPending}
                  data-testid="button-save-profile"
                >
                  {createProfileMutation.isPending ? "Saving..." : "Save Profile"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Users className="h-4 w-4" /> Total Profiles
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-total-profiles">{summary?.totalProfiles || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Target className="h-4 w-4" /> Avg Completeness
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-avg-completeness">{summary?.avgCompleteness || 0}%</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Crown className="h-4 w-4" /> VIP Guests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-vip-count">{summary?.vipCount || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Activity className="h-4 w-4" /> Signals Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-signals-today">{summary?.signalsToday || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Star className="h-4 w-4" /> Lifetime Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingSummary ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-lifetime-value">
                  ${((summary?.totalLifetimeValue || 0) / 1000).toFixed(0)}k
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-5 w-5" /> Completeness Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingDistribution ? (
                <Skeleton className="h-48 w-full" />
              ) : distributionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={distributionData}>
                    <XAxis dataKey="bucket" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Brain className="h-5 w-5" /> Collection Mechanisms
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingMechanisms ? (
                <Skeleton className="h-48 w-full" />
              ) : mechanismsData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={mechanismsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {mechanismsData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" /> Guest Profiles
                </CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search guests..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                    data-testid="input-search-profiles"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  {loadingProfiles ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map(i => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : profiles && profiles.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Guest</TableHead>
                          <TableHead>Property</TableHead>
                          <TableHead>Completeness</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {profiles.map((profile) => (
                          <TableRow key={profile.id} data-testid={`row-profile-${profile.id}`}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>{profile.name?.[0] || '?'}</AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{profile.name}</div>
                                  <div className="text-xs text-muted-foreground">{profile.email || 'No email'}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm">{profile.propertyName || '-'}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={profile.completeness || 0} className="w-16 h-2" />
                                <span className="text-xs">{profile.completeness || 0}%</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {profile.isVip && (
                                <Badge variant="secondary" className="bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                                  <Crown className="h-3 w-3 mr-1" /> VIP
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                      <UserCircle className="h-12 w-12 opacity-30" />
                      <p>No guest profiles yet</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-5 w-5" /> VIP Activity Feed
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                {loadingActivity ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4].map(i => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : vipActivity && vipActivity.length > 0 ? (
                  <div className="space-y-3">
                    {vipActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 p-3 rounded-md bg-muted/50"
                        data-testid={`activity-${activity.id}`}
                      >
                        <div className="p-2 rounded-full bg-primary/10">
                          <Activity className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.activityType}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {activity.description || 'No details'}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {activity.createdAt ? new Date(activity.createdAt).toLocaleDateString() : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <Activity className="h-12 w-12 opacity-30" />
                    <p>No VIP activity yet</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
