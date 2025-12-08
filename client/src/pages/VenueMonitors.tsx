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
import { Switch } from "@/components/ui/switch";
import { 
  Building2, Search, BarChart3, Mail, Calendar, 
  LogOut, ExternalLink, Plus, Terminal, MessageSquare,
  MapPin, Instagram, Trash2, Eye, RefreshCw, Star
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { VenueMonitor } from "@shared/schema";
import { CITIES } from "@shared/schema";
import { format } from "date-fns";

const VENUE_TIERS = [
  { value: "luxury", label: "Luxury" },
  { value: "upscale", label: "Upscale" },
  { value: "standard", label: "Standard" },
];

const VENUE_CATEGORIES = [
  { value: "nightclub", label: "Nightclub" },
  { value: "hotel", label: "Hotel" },
  { value: "restaurant", label: "Restaurant" },
  { value: "boat", label: "Boat/Yacht" },
  { value: "beach_club", label: "Beach Club" },
  { value: "rooftop", label: "Rooftop" },
  { value: "bar", label: "Bar/Lounge" },
];

export default function VenueMonitors() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addVenueOpen, setAddVenueOpen] = useState(false);

  const venuesUrl = (() => {
    const params = new URLSearchParams();
    if (filterCity && filterCity !== "all") params.append("city", filterCity);
    if (filterTier && filterTier !== "all") params.append("tier", filterTier);
    if (filterCategory && filterCategory !== "all") params.append("category", filterCategory);
    const queryString = params.toString();
    return queryString ? `/api/venue-monitors?${queryString}` : "/api/venue-monitors";
  })();

  const { data: venues, isLoading: loadingVenues } = useQuery<VenueMonitor[]>({
    queryKey: [venuesUrl],
  });

  const deleteVenueMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/venue-monitors/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Venue Deleted" });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-monitors"] });
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/venue-monitors/${id}`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/venue-monitors"] });
    },
  });

  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;
  const getTierLabel = (value: string) => VENUE_TIERS.find(t => t.value === value)?.label || value;
  const getCategoryLabel = (value: string) => VENUE_CATEGORIES.find(c => c.value === value)?.label || value;

  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "outline" => {
    if (tier === "luxury") return "default";
    if (tier === "upscale") return "secondary";
    return "outline";
  };

  const filteredVenues = venues?.filter(v => {
    if (!searchQuery) return true;
    const search = searchQuery.toLowerCase();
    return v.name.toLowerCase().includes(search) || 
           v.instagramHandle.toLowerCase().includes(search);
  });

  const isActive = (path: string) => location === path;

  const activeCount = venues?.filter(v => v.isActive).length || 0;
  const luxuryCount = venues?.filter(v => v.tier === "luxury").length || 0;
  const cityCounts = venues?.reduce((acc, v) => {
    acc[v.city || "unknown"] = (acc[v.city || "unknown"] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

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
            <Link href="/venue-monitors">
              <Button variant={isActive("/venue-monitors") ? "secondary" : "ghost"} size="sm" data-testid="nav-venues">
                <Instagram className="h-4 w-4 mr-1" />
                Venues
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
          <h1 className="text-2xl font-semibold">Instagram Venue Monitors</h1>
          <Dialog open={addVenueOpen} onOpenChange={setAddVenueOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-venue">
                <Plus className="h-4 w-4 mr-1" />
                Add Venue
              </Button>
            </DialogTrigger>
            <AddVenueDialog onClose={() => setAddVenueOpen(false)} />
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-primary">{venues?.length || 0}</div>
              <div className="text-xs text-muted-foreground">Total Venues</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-green-500">{activeCount}</div>
              <div className="text-xs text-muted-foreground">Active Monitors</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-amber-500">{luxuryCount}</div>
              <div className="text-xs text-muted-foreground">Luxury Venues</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="text-2xl font-bold text-blue-500">{Object.keys(cityCounts).length}</div>
              <div className="text-xs text-muted-foreground">Cities Covered</div>
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
                  placeholder="Search venues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search-venues"
                />
              </div>
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
              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-tier">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {VENUE_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-[140px]" data-testid="select-filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {VENUE_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loadingVenues ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Venue</TableHead>
                    <TableHead>Instagram</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVenues?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No venues found. Add venues to monitor their Instagram for event announcements.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredVenues?.map((venue) => (
                    <TableRow key={venue.id} data-testid={`row-venue-${venue.id}`}>
                      <TableCell>
                        <div className="font-medium">{venue.name}</div>
                      </TableCell>
                      <TableCell>
                        <a 
                          href={venue.instagramUrl || `https://instagram.com/${venue.instagramHandle}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-primary hover:underline"
                        >
                          <Instagram className="h-3 w-3" />
                          @{venue.instagramHandle}
                        </a>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getCityLabel(venue.city || "")}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {venue.category && (
                          <Badge variant="secondary" className="font-normal">
                            {getCategoryLabel(venue.category)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {venue.tier && (
                          <Badge variant={getTierBadgeVariant(venue.tier)} className="font-normal">
                            {venue.tier === "luxury" && <Star className="h-3 w-3 mr-1" />}
                            {getTierLabel(venue.tier)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{venue.priority}</span>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={venue.isActive || false}
                          onCheckedChange={(checked) => 
                            toggleActiveMutation.mutate({ id: venue.id, isActive: checked })
                          }
                          data-testid={`switch-active-${venue.id}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {venue.instagramUrl && (
                            <a 
                              href={venue.instagramUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <Button size="icon" variant="ghost">
                                <ExternalLink className="h-4 w-4" />
                              </Button>
                            </a>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteVenueMutation.mutate(venue.id)}
                            data-testid={`button-delete-${venue.id}`}
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
    </div>
  );
}

function AddVenueDialog({ onClose }: { onClose: () => void }) {
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    instagramHandle: "",
    instagramUrl: "",
    city: "cartagena",
    category: "nightclub",
    tier: "upscale",
    priority: 1,
    isActive: true,
  });

  const createVenueMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const res = await apiRequest("POST", "/api/venue-monitors", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Venue Added", description: "Venue monitor created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/venue-monitors"] });
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Venue", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast({ title: "Name Required", description: "Please enter a venue name", variant: "destructive" });
      return;
    }
    if (!formData.instagramHandle.trim()) {
      toast({ title: "Instagram Handle Required", description: "Please enter an Instagram handle", variant: "destructive" });
      return;
    }
    createVenueMutation.mutate({
      ...formData,
      instagramHandle: formData.instagramHandle.replace("@", ""),
      instagramUrl: formData.instagramUrl || `https://instagram.com/${formData.instagramHandle.replace("@", "")}`,
    });
  };

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle>Add Venue Monitor</DialogTitle>
        <DialogDescription>Add an Instagram venue to monitor for event announcements</DialogDescription>
      </DialogHeader>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Venue Name *</Label>
          <Input
            id="name"
            placeholder="e.g. Alquimico"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            data-testid="input-venue-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="instagramHandle">Instagram Handle *</Label>
          <div className="relative">
            <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="instagramHandle"
              placeholder="alquimicobar"
              value={formData.instagramHandle}
              onChange={(e) => setFormData({ ...formData, instagramHandle: e.target.value })}
              className="pl-9"
              data-testid="input-venue-instagram"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Select 
              value={formData.city} 
              onValueChange={(v) => setFormData({ ...formData, city: v })}
            >
              <SelectTrigger data-testid="select-venue-city">
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
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(v) => setFormData({ ...formData, category: v })}
            >
              <SelectTrigger data-testid="select-venue-category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENUE_CATEGORIES.map(c => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="tier">Tier</Label>
            <Select 
              value={formData.tier} 
              onValueChange={(v) => setFormData({ ...formData, tier: v })}
            >
              <SelectTrigger data-testid="select-venue-tier">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENUE_TIERS.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="priority">Priority (1-5)</Label>
            <Input
              id="priority"
              type="number"
              min={1}
              max={5}
              value={formData.priority}
              onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              data-testid="input-venue-priority"
            />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            data-testid="switch-venue-active"
          />
          <Label htmlFor="isActive" className="text-sm">Monitor is active</Label>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={createVenueMutation.isPending} data-testid="button-submit-venue">
            {createVenueMutation.isPending ? "Adding..." : "Add Venue"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
