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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building2, Search, BarChart3, Mail, MapPin, Calendar, 
  LogOut, ExternalLink, Flag, Plus, Terminal, Music,
  Ticket, DollarSign, Users, Clock, Trash2
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Event } from "@shared/schema";
import { CITIES, EVENT_TIERS, EVENT_CATEGORIES, EVENT_SOURCES } from "@shared/schema";
import { format } from "date-fns";

interface EventStats {
  total: number;
  byCity: Record<string, number>;
  byCategory: Record<string, number>;
  byTier: Record<string, number>;
  bySource: Record<string, number>;
  upcoming: number;
  flagged: number;
}

export default function Events() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [filterCity, setFilterCity] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");
  const [filterTier, setFilterTier] = useState<string>("");
  const [filterSource, setFilterSource] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [addEventOpen, setAddEventOpen] = useState(false);

  const eventsUrl = (() => {
    const params = new URLSearchParams();
    if (filterCity && filterCity !== "all") params.append("city", filterCity);
    if (filterCategory && filterCategory !== "all") params.append("category", filterCategory);
    if (filterTier && filterTier !== "all") params.append("eventTier", filterTier);
    if (filterSource && filterSource !== "all") params.append("source", filterSource);
    if (searchQuery) params.append("search", searchQuery);
    const queryString = params.toString();
    return queryString ? `/api/events?${queryString}` : "/api/events";
  })();

  const { data: events, isLoading: loadingEvents } = useQuery<Event[]>({
    queryKey: [eventsUrl],
  });

  const { data: stats, isLoading: loadingStats } = useQuery<EventStats>({
    queryKey: ["/api/events/stats"],
  });

  const invalidateEventQueries = () => {
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const key = query.queryKey[0];
        return typeof key === 'string' && key.startsWith('/api/events');
      }
    });
  };

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/events/${id}`);
    },
    onSuccess: () => {
      toast({ title: "Event Deleted" });
      invalidateEventQueries();
    },
    onError: (error: Error) => {
      toast({ title: "Delete Failed", description: error.message, variant: "destructive" });
    },
  });

  const flagEventMutation = useMutation({
    mutationFn: async ({ id, isFlagged }: { id: string; isFlagged: boolean }) => {
      const res = await apiRequest("PATCH", `/api/events/${id}`, { isFlagged });
      return res.json();
    },
    onSuccess: () => {
      invalidateEventQueries();
    },
  });

  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;
  const getCategoryLabel = (value: string) => EVENT_CATEGORIES.find(c => c.value === value)?.label || value;
  const getTierInfo = (value: string) => EVENT_TIERS.find(t => t.value === value) || { label: value, color: "slate" };
  const getSourceLabel = (value: string) => EVENT_SOURCES.find(s => s.value === value)?.label || value;
  const getVenueName = (venue: unknown): string => {
    if (venue && typeof venue === 'object' && 'name' in venue) {
      return String((venue as { name: string }).name);
    }
    return "";
  };

  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "outline" | "destructive" => {
    if (tier === "ultra_premium") return "default";
    if (tier === "premium") return "secondary";
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
                <Calendar className="h-4 w-4 mr-1" /> Events
              </Button>
            </Link>
            <Link href="/outreach">
              <Button variant={isActive("/outreach") ? "secondary" : "ghost"} size="sm" data-testid="nav-outreach">
                <Mail className="h-4 w-4 mr-1" /> Outreach
              </Button>
            </Link>
            <Link href="/operations">
              <Button variant={isActive("/operations") ? "secondary" : "ghost"} size="sm" data-testid="nav-operations">
                <Terminal className="h-4 w-4 mr-1" /> Operations
              </Button>
            </Link>
            <Link href="/statistics">
              <Button variant={isActive("/statistics") ? "secondary" : "ghost"} size="sm" data-testid="nav-statistics">
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
          <h1 className="text-2xl font-medium" data-testid="text-page-title">Event Discovery</h1>
          
          <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-event">
                <Plus className="h-4 w-4 mr-1" /> Add Event
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Manual Event</DialogTitle>
                <DialogDescription>Add an event manually to track</DialogDescription>
              </DialogHeader>
              <AddEventForm onSuccess={() => setAddEventOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-medium" data-testid="stat-total-events">{stats?.total || 0}</div>
              <div className="text-xs text-muted-foreground">Total Events</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-medium text-green-500" data-testid="stat-upcoming">{stats?.upcoming || 0}</div>
              <div className="text-xs text-muted-foreground">Upcoming</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-medium text-purple-500" data-testid="stat-ultra-premium">{stats?.byTier?.ultra_premium || 0}</div>
              <div className="text-xs text-muted-foreground">Ultra Premium</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-medium text-amber-500" data-testid="stat-premium">{stats?.byTier?.premium || 0}</div>
              <div className="text-xs text-muted-foreground">Premium</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-medium text-yellow-500" data-testid="stat-flagged">{stats?.flagged || 0}</div>
              <div className="text-xs text-muted-foreground">Flagged</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-medium">{Object.keys(stats?.bySource || {}).length}</div>
              <div className="text-xs text-muted-foreground">Sources</div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Search className="h-4 w-4" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="relative col-span-2 md:col-span-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search events..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-events"
                />
              </div>
              
              <Select value={filterCity} onValueChange={setFilterCity}>
                <SelectTrigger data-testid="select-filter-city">
                  <SelectValue placeholder="City" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {CITIES.map(city => (
                    <SelectItem key={city.value} value={city.value}>{city.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger data-testid="select-filter-category">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {EVENT_CATEGORIES.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterTier} onValueChange={setFilterTier}>
                <SelectTrigger data-testid="select-filter-tier">
                  <SelectValue placeholder="Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tiers</SelectItem>
                  {EVENT_TIERS.map(tier => (
                    <SelectItem key={tier.value} value={tier.value}>{tier.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterSource} onValueChange={setFilterSource}>
                <SelectTrigger data-testid="select-filter-source">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {EVENT_SOURCES.map(source => (
                    <SelectItem key={source.value} value={source.value}>{source.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {loadingEvents ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : events?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground" data-testid="empty-events">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No events found. Add events manually or configure scraping.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events?.map(event => (
                    <TableRow key={event.id} data-testid={`row-event-${event.id}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {event.isFlagged && <Flag className="h-4 w-4 text-yellow-500" />}
                          <div>
                            <div className="font-medium max-w-[200px] truncate">{event.name}</div>
                            {event.venue && getVenueName(event.venue) ? (
                              <div className="text-xs text-muted-foreground">{String(getVenueName(event.venue))}</div>
                            ) : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Clock className="h-3 w-3" />
                          {format(new Date(event.startDate), "MMM d, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          <MapPin className="h-3 w-3 mr-1" />
                          {getCityLabel(event.city)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.category && (
                          <Badge variant="secondary" className="font-normal">
                            {getCategoryLabel(event.category)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTierBadgeVariant(event.eventTier || "")} className="font-normal">
                          {getTierInfo(event.eventTier || "unknown").label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.minPrice ? (
                          <span className="text-sm">
                            ${event.minPrice} - ${event.maxPrice || event.minPrice}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-sm">Free</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {getSourceLabel(event.source)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => flagEventMutation.mutate({ id: event.id, isFlagged: !event.isFlagged })}
                            data-testid={`button-flag-${event.id}`}
                          >
                            <Flag className={`h-4 w-4 ${event.isFlagged ? "text-yellow-500 fill-yellow-500" : ""}`} />
                          </Button>
                          {event.url && (
                            <Button variant="ghost" size="icon" asChild>
                              <a href={event.url} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          )}
                          {user?.role === 'admin' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteEventMutation.mutate(event.id)}
                              data-testid={`button-delete-${event.id}`}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
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

function AddEventForm({ onSuccess }: { onSuccess: () => void }) {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [city, setCity] = useState("Cartagena");
  const [category, setCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [tier, setTier] = useState("unknown");
  const [minPrice, setMinPrice] = useState("");
  const [description, setDescription] = useState("");

  const createEventMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/events", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Event Added" });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/events');
        }
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to Add Event", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = () => {
    if (!name || !startDate) {
      toast({ title: "Missing Fields", description: "Name and date are required", variant: "destructive" });
      return;
    }

    createEventMutation.mutate({
      name,
      url: url || `https://manual.entry/${Date.now()}`,
      externalId: `manual-${Date.now()}`,
      source: "manual",
      city,
      category: category || null,
      startDate: new Date(startDate).toISOString(),
      eventTier: tier,
      minPrice: minPrice ? parseFloat(minPrice) : null,
      description: description || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Event Name *</Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Event name"
          data-testid="input-event-name"
        />
      </div>
      
      <div className="space-y-2">
        <Label>Event URL</Label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://..."
          data-testid="input-event-url"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            data-testid="input-event-date"
          />
        </div>
        
        <div className="space-y-2">
          <Label>City</Label>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger data-testid="select-event-city">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CITIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger data-testid="select-event-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Tier</Label>
          <Select value={tier} onValueChange={setTier}>
            <SelectTrigger data-testid="select-event-tier">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TIERS.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Min Price (USD)</Label>
        <Input
          type="number"
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          placeholder="0"
          data-testid="input-event-price"
        />
      </div>

      <div className="space-y-2">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Event description..."
          className="resize-none"
          data-testid="input-event-description"
        />
      </div>

      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={createEventMutation.isPending}
          data-testid="button-submit-event"
        >
          {createEventMutation.isPending ? "Adding..." : "Add Event"}
        </Button>
      </DialogFooter>
    </div>
  );
}
