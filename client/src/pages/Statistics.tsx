import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Building2, ArrowLeft, BarChart3, Mail, Phone, Globe, 
  Users, TrendingUp, PieChart, LogOut
} from "lucide-react";
import { PieChart as RechartsPie, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { CITIES, CATEGORIES, OUTREACH_STATUSES, AI_READINESS_LEVELS } from "@shared/schema";

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

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Statistics() {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery<BusinessStats>({
    queryKey: ["/api/businesses/stats"],
  });

  const getCategoryLabel = (value: string) => CATEGORIES.find(c => c.value === value)?.label || value;
  const getCityLabel = (value: string) => CITIES.find(c => c.value === value)?.label || value;
  const getStatusLabel = (value: string) => OUTREACH_STATUSES.find(s => s.value === value)?.label || value;

  const categoryData = stats ? Object.entries(stats.byCategory).map(([name, value]) => ({
    name: getCategoryLabel(name),
    value,
  })) : [];

  const cityData = stats ? Object.entries(stats.byCity).map(([name, value]) => ({
    name: getCityLabel(name),
    value,
  })) : [];

  const readinessData = stats ? Object.entries(stats.byReadiness).map(([name, value]) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    value,
  })) : [];

  const outreachData = stats ? Object.entries(stats.byOutreachStatus).map(([name, value]) => ({
    name: getStatusLabel(name),
    value,
  })) : [];

  const contactData = stats ? [
    { name: 'Email', value: stats.withEmail },
    { name: 'Website', value: stats.withWebsite },
    { name: 'Phone', value: stats.withPhone },
  ] : [];

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
            <Link href="/statistics">
              <Button variant="ghost" size="sm" className="bg-accent" data-testid="nav-statistics">
                <BarChart3 className="h-4 w-4 mr-1" /> Stats
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
        <div className="flex items-center justify-between gap-4 mb-6">
          <h1 className="text-2xl font-medium" data-testid="text-page-title">Statistics Dashboard</h1>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Building2 className="h-4 w-4" /> Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-total">{stats?.total || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <TrendingUp className="h-4 w-4" /> Avg Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-avg-score">{stats?.avgScore || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Mail className="h-4 w-4" /> With Email
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-email">{stats?.withEmail || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Globe className="h-4 w-4" /> With Website
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-website">{stats?.withWebsite || 0}</div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground font-normal flex items-center gap-1">
                <Users className="h-4 w-4" /> Enriched
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <div className="text-2xl font-medium" data-testid="stat-enriched">{stats?.enriched || 0}</div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By Category</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <RechartsPie>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">By City</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : cityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={cityData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Readiness</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48" />
              ) : readinessData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={readinessData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name }) => name}
                    >
                      <Cell fill="#10b981" />
                      <Cell fill="#f59e0b" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Outreach Status</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48" />
              ) : outreachData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={outreachData} layout="vertical">
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={80} />
                    <Tooltip />
                    <Bar dataKey="value" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Contact Methods</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-48" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={contactData}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="value" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
