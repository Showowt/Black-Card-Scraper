import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "wouter";
import { 
  ArrowLeft, DollarSign, Activity, TrendingUp, Users, 
  BarChart3, Loader2, AlertCircle
} from "lucide-react";
import { ACTION_TYPES, type UsageRecord } from "@shared/schema";
import { format } from "date-fns";

interface UsageStats {
  totalRecords: number;
  totalCost: number;
  byActionType: Record<string, { count: number; cost: number }>;
  byUser: Record<string, { count: number; cost: number }>;
}

export default function CostControls() {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState("30");

  const isAdmin = user?.role === "admin";

  const { data: usageRecords = [], isLoading: recordsLoading } = useQuery<UsageRecord[]>({
    queryKey: ['/api/usage', { userId: isAdmin ? undefined : user?.id }],
    queryFn: async () => {
      const res = await fetch('/api/usage', { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage records");
      return res.json();
    },
  });

  const { data: usageStats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ['/api/usage/stats'],
    queryFn: async () => {
      const res = await fetch('/api/usage/stats', { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch usage stats");
      return res.json();
    },
    enabled: isAdmin,
  });

  const getActionLabel = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.label || actionType;
  };

  const getActionCost = (actionType: string) => {
    return ACTION_TYPES.find(a => a.value === actionType)?.cost || 0;
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">Cost Controls</h1>
              <p className="text-sm text-muted-foreground">Your usage history</p>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Your Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recordsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : usageRecords.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No activity recorded yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageRecords.slice(0, 20).map((record) => (
                      <TableRow key={record.id} data-testid={`row-usage-${record.id}`}>
                        <TableCell>
                          <Badge variant="outline">{getActionLabel(record.actionType)}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {record.createdAt ? format(new Date(record.createdAt), "MMM d, yyyy h:mm a") : "-"}
                        </TableCell>
                        <TableCell className="text-right">${record.cost?.toFixed(3) || "0.000"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

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
              <h1 className="text-2xl font-bold">Cost Controls</h1>
              <p className="text-sm text-muted-foreground">Monitor usage and manage limits</p>
            </div>
          </div>
          
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]" data-testid="select-date-range">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Actions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-actions">
                    {usageStats?.totalRecords || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">API calls made</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-total-cost">
                    ${usageStats?.totalCost?.toFixed(2) || "0.00"}
                  </div>
                  <p className="text-xs text-muted-foreground">This period</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-active-users">
                    {Object.keys(usageStats?.byUser || {}).length}
                  </div>
                  <p className="text-xs text-muted-foreground">Team members</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Cost/Action</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="stat-avg-cost">
                    ${usageStats && usageStats.totalRecords > 0 
                      ? (usageStats.totalCost / usageStats.totalRecords).toFixed(3) 
                      : "0.000"}
                  </div>
                  <p className="text-xs text-muted-foreground">Per API call</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Usage by Action Type
                  </CardTitle>
                  <CardDescription>Breakdown of API usage</CardDescription>
                </CardHeader>
                <CardContent>
                  {usageStats?.byActionType && Object.keys(usageStats.byActionType).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Action</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(usageStats.byActionType).map(([actionType, data]) => (
                          <TableRow key={actionType}>
                            <TableCell>
                              <Badge variant="outline">{getActionLabel(actionType)}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{data.count}</TableCell>
                            <TableCell className="text-right">${data.cost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No usage data yet.</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Usage by Team Member
                  </CardTitle>
                  <CardDescription>Who is using what</CardDescription>
                </CardHeader>
                <CardContent>
                  {usageStats?.byUser && Object.keys(usageStats.byUser).length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                          <TableHead className="text-right">Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {Object.entries(usageStats.byUser).map(([userId, data]) => (
                          <TableRow key={userId}>
                            <TableCell className="truncate max-w-[150px]">{userId}</TableCell>
                            <TableCell className="text-right">{data.count}</TableCell>
                            <TableCell className="text-right">${data.cost.toFixed(2)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No team usage data yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Cost Reference
                </CardTitle>
                <CardDescription>API action pricing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2 md:grid-cols-3">
                  {ACTION_TYPES.map((action) => (
                    <div 
                      key={action.value} 
                      className="flex items-center justify-between p-3 bg-muted rounded-md"
                    >
                      <span className="font-medium">{action.label}</span>
                      <Badge>${action.cost.toFixed(3)}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest API usage across the team</CardDescription>
              </CardHeader>
              <CardContent>
                {recordsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : usageRecords.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No activity recorded yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Action</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usageRecords.slice(0, 15).map((record) => (
                        <TableRow key={record.id} data-testid={`row-activity-${record.id}`}>
                          <TableCell>
                            <Badge variant="outline">{getActionLabel(record.actionType)}</Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground truncate max-w-[150px]">
                            {record.userId || "-"}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {record.createdAt ? format(new Date(record.createdAt), "MMM d, h:mm a") : "-"}
                          </TableCell>
                          <TableCell className="text-right">${record.cost?.toFixed(3) || "0.000"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
