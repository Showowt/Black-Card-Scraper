import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Calendar, Phone, MapPin, Star, ArrowRight, 
  Clock, CheckCircle, AlertCircle, LogOut, ArrowLeft, Filter, X
} from "lucide-react";
import { format, isPast, isToday, isTomorrow, differenceInDays } from "date-fns";
import type { Business, CallSession } from "@shared/schema";
import { CITIES, CATEGORIES, CALL_DISPOSITIONS } from "@shared/schema";

export default function FollowUps() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [dispositionFilter, setDispositionFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: businesses, isLoading } = useQuery<Business[]>({
    queryKey: ['/api/businesses/follow-ups'],
  });

  const { data: allCalls } = useQuery<CallSession[]>({
    queryKey: ['/api/calls'],
  });

  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;
  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;
  const getDispositionLabel = (value: string) => CALL_DISPOSITIONS.find(d => d.value === value)?.label || value;
  const getDispositionColor = (value: string) => CALL_DISPOSITIONS.find(d => d.value === value)?.color || "gray";

  const getFollowUpStatus = (date: Date | null) => {
    if (!date) return { label: "No date", color: "gray", icon: Clock };
    const followUpDate = new Date(date);
    if (isPast(followUpDate) && !isToday(followUpDate)) {
      return { label: "Overdue", color: "red", icon: AlertCircle };
    }
    if (isToday(followUpDate)) {
      return { label: "Today", color: "amber", icon: Clock };
    }
    if (isTomorrow(followUpDate)) {
      return { label: "Tomorrow", color: "blue", icon: Calendar };
    }
    const days = differenceInDays(followUpDate, new Date());
    return { label: `In ${days} days`, color: "green", icon: CheckCircle };
  };

  // Filter helper function
  const filterBusinesses = (list: Business[]) => {
    return list.filter(b => {
      const matchesDisposition = dispositionFilter === "all" || b.lastDisposition === dispositionFilter;
      const matchesSearch = !searchQuery || b.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesDisposition && matchesSearch;
    });
  };

  const overdueFollowUps = businesses?.filter(b => {
    if (!b.followUpDate) return false;
    const date = new Date(b.followUpDate);
    return isPast(date) && !isToday(date);
  }) || [];

  const todayFollowUps = businesses?.filter(b => {
    if (!b.followUpDate) return false;
    return isToday(new Date(b.followUpDate));
  }) || [];

  const upcomingFollowUps = businesses?.filter(b => {
    if (!b.followUpDate) return false;
    const date = new Date(b.followUpDate);
    return !isPast(date) && !isToday(date);
  }) || [];

  // Apply filters to each group
  const overdueFiltered = filterBusinesses(overdueFollowUps);
  const todayFiltered = filterBusinesses(todayFollowUps);
  const upcomingFiltered = filterBusinesses(upcomingFollowUps);

  const dispositionStats = allCalls?.reduce((acc, call) => {
    if (call.disposition) {
      acc[call.disposition] = (acc[call.disposition] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>) || {};

  const totalCalls = allCalls?.length || 0;
  const completedCalls = allCalls?.filter(c => c.status === "completed").length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-4">
            <Building2 className="h-7 w-7 text-primary" />
            <span className="text-lg font-medium">Black Card Scanner</span>
          </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </main>
      </div>
    );
  }

  const FollowUpCard = ({ business }: { business: Business }) => {
    const status = getFollowUpStatus(business.followUpDate);
    const StatusIcon = status.icon;
    
    return (
      <Card className="hover-elevate" data-testid={`card-followup-${business.id}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {business.photoUrl ? (
              <Avatar className="h-12 w-12">
                <AvatarImage src={business.photoUrl} />
                <AvatarFallback>{business.name[0]}</AvatarFallback>
              </Avatar>
            ) : (
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                <Building2 className="h-6 w-6 text-muted-foreground" />
              </div>
            )}
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/business/${business.id}`}>
                  <span className="font-medium hover:underline cursor-pointer" data-testid={`text-business-name-${business.id}`}>
                    {business.name}
                  </span>
                </Link>
                <Badge variant="outline" className="text-xs">
                  {getCategoryLabel(business.category)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {getCityLabel(business.city)}
                </span>
                {business.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {business.phone}
                  </span>
                )}
                {business.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    {business.rating}
                  </span>
                )}
              </div>
              
              {business.lastDisposition && (
                <div className="mt-2">
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${
                      getDispositionColor(business.lastDisposition) === 'green' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                      getDispositionColor(business.lastDisposition) === 'blue' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                      getDispositionColor(business.lastDisposition) === 'amber' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                      getDispositionColor(business.lastDisposition) === 'red' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                      ''
                    }`}
                  >
                    Last: {getDispositionLabel(business.lastDisposition)}
                  </Badge>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <Badge 
                variant="secondary"
                className={`${
                  status.color === 'red' ? 'bg-red-500/20 text-red-700 dark:text-red-400' :
                  status.color === 'amber' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400' :
                  status.color === 'blue' ? 'bg-blue-500/20 text-blue-700 dark:text-blue-400' :
                  status.color === 'green' ? 'bg-green-500/20 text-green-700 dark:text-green-400' :
                  ''
                }`}
              >
                <StatusIcon className="h-3 w-3 mr-1" />
                {status.label}
              </Badge>
              {business.followUpDate && (
                <span className="text-xs text-muted-foreground">
                  {format(new Date(business.followUpDate), "MMM d, yyyy")}
                </span>
              )}
              <Link href={`/business/${business.id}`}>
                <Button size="sm" variant="ghost" data-testid={`button-view-${business.id}`}>
                  View <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
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

      <main className="max-w-6xl mx-auto px-4 py-6">

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Calendar className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-medium" data-testid="text-page-title">Follow-ups</h1>
            <p className="text-muted-foreground">Track all scheduled follow-ups and call dispositions</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-red-500" data-testid="stat-overdue">{overdueFollowUps.length}</div>
              <div className="text-sm text-muted-foreground">Overdue</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-amber-500" data-testid="stat-today">{todayFollowUps.length}</div>
              <div className="text-sm text-muted-foreground">Today</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold text-blue-500" data-testid="stat-upcoming">{upcomingFollowUps.length}</div>
              <div className="text-sm text-muted-foreground">Upcoming</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-3xl font-bold" data-testid="stat-total">{businesses?.length || 0}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg">Disposition Summary (Click to Filter)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {CALL_DISPOSITIONS.map(disp => (
                  <button
                    key={disp.value}
                    onClick={() => setDispositionFilter(dispositionFilter === disp.value ? "all" : disp.value)}
                    className={`text-center p-3 rounded-md transition-all cursor-pointer ${
                      dispositionFilter === disp.value 
                        ? 'ring-2 ring-primary bg-primary/10' 
                        : 'bg-muted/50 hover-elevate'
                    }`}
                    data-testid={`filter-disposition-${disp.value}`}
                  >
                    <div className={`text-2xl font-bold ${
                      disp.color === 'green' ? 'text-green-500' :
                      disp.color === 'blue' ? 'text-blue-500' :
                      disp.color === 'amber' ? 'text-amber-500' :
                      disp.color === 'red' ? 'text-red-500' :
                      'text-muted-foreground'
                    }`}>
                      {dispositionStats[disp.value] || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">{disp.label}</div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Call Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Total Calls</span>
                  <span className="font-bold text-lg">{totalCalls}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Completed</span>
                  <span className="font-bold text-lg text-green-500">{completedCalls}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Conversion Rate</span>
                  <span className="font-bold text-lg">
                    {completedCalls > 0 
                      ? `${Math.round((dispositionStats['closed_won'] || 0) / completedCalls * 100)}%`
                      : '0%'
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={dispositionFilter} onValueChange={setDispositionFilter}>
            <SelectTrigger className="w-[180px]" data-testid="select-disposition-filter">
              <SelectValue placeholder="All Dispositions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dispositions</SelectItem>
              {CALL_DISPOSITIONS.map(d => (
                <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input 
            placeholder="Search businesses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-xs"
            data-testid="input-search-businesses"
          />
          {(dispositionFilter !== "all" || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={() => { setDispositionFilter("all"); setSearchQuery(""); }} data-testid="button-clear-filters">
              <X className="h-4 w-4 mr-1" /> Clear Filters
            </Button>
          )}
        </div>

        {overdueFiltered.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-red-500">
              <AlertCircle className="h-5 w-5" />
              Overdue ({overdueFiltered.length})
            </h2>
            <div className="grid gap-3">
              {overdueFiltered.map(business => (
                <FollowUpCard key={business.id} business={business} />
              ))}
            </div>
          </div>
        )}

        {todayFiltered.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-amber-500">
              <Clock className="h-5 w-5" />
              Today ({todayFiltered.length})
            </h2>
            <div className="grid gap-3">
              {todayFiltered.map(business => (
                <FollowUpCard key={business.id} business={business} />
              ))}
            </div>
          </div>
        )}

        {upcomingFiltered.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-medium mb-3 flex items-center gap-2 text-blue-500">
              <Calendar className="h-5 w-5" />
              Upcoming ({upcomingFiltered.length})
            </h2>
            <div className="grid gap-3">
              {upcomingFiltered.map(business => (
                <FollowUpCard key={business.id} business={business} />
              ))}
            </div>
          </div>
        )}

        {/* No results message when filters are active */}
        {(dispositionFilter !== "all" || searchQuery) && 
         overdueFiltered.length === 0 && todayFiltered.length === 0 && upcomingFiltered.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Filter className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Matching Follow-ups</h3>
              <p className="text-muted-foreground mb-4">
                No follow-ups match your current filters.
              </p>
              <Button variant="outline" onClick={() => { setDispositionFilter("all"); setSearchQuery(""); }} data-testid="button-clear-filters-empty">
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        )}

        {(!businesses || businesses.length === 0) && (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Follow-ups Scheduled</h3>
              <p className="text-muted-foreground mb-4">
                When you end a call with a follow-up date, it will appear here.
              </p>
              <Link href="/">
                <Button data-testid="button-go-dashboard">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
