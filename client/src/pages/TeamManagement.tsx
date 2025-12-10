import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, Mail, Plus, Copy, Trash2, Clock, CheckCircle, XCircle, 
  Shield, User, Activity, Loader2, RefreshCw, ChevronLeft
} from "lucide-react";
import { Link } from "wouter";
import { format, formatDistanceToNow } from "date-fns";

interface TeamMember {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  authProvider: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

interface TeamInvitation {
  id: string;
  code: string;
  email: string | null;
  role: string;
  isActive: boolean;
  usedAt: Date | null;
  usedBy: string | null;
  expiresAt: Date;
  createdAt: Date;
}

interface ActivityLogEntry {
  id: string;
  userId: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  details: Record<string, any> | null;
  ipAddress: string | null;
  createdAt: Date;
}

export default function TeamManagement() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("team_member");
  const [inviteExpiry, setInviteExpiry] = useState("7");

  // Fetch team members
  const { data: members, isLoading: loadingMembers } = useQuery<TeamMember[]>({
    queryKey: ["/api/team/members"],
  });

  // Fetch invitations
  const { data: invitations, isLoading: loadingInvitations } = useQuery<TeamInvitation[]>({
    queryKey: ["/api/team/invites"],
  });

  // Fetch activity log
  const { data: activityLog, isLoading: loadingActivity } = useQuery<ActivityLogEntry[]>({
    queryKey: ["/api/team/activity"],
  });

  // Create invitation mutation
  const createInviteMutation = useMutation({
    mutationFn: async (data: { email?: string; role: string; expiresInDays: number }): Promise<TeamInvitation> => {
      const response = await apiRequest("POST", "/api/team/invites", data);
      return response.json();
    },
    onSuccess: (data: TeamInvitation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/activity"] });
      toast({ 
        title: "Invite created", 
        description: `Invite code: ${data.code}` 
      });
      setCreateDialogOpen(false);
      setInviteEmail("");
      setInviteRole("team_member");
      setInviteExpiry("7");
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to create invite", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Delete invitation mutation
  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/team/invites/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/invites"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/activity"] });
      toast({ title: "Invite deleted" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete invite", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; role?: string; isActive?: boolean }) => {
      return await apiRequest("PATCH", `/api/team/members/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/team/members"] });
      queryClient.invalidateQueries({ queryKey: ["/api/team/activity"] });
      toast({ title: "Team member updated" });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to update member", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: "Invite code copied to clipboard" });
  };

  const copyInviteLink = (code: string) => {
    const link = `${window.location.origin}/team-login?register=${code}`;
    navigator.clipboard.writeText(link);
    toast({ title: "Copied", description: "Invite link copied to clipboard" });
  };

  const handleCreateInvite = () => {
    createInviteMutation.mutate({
      email: inviteEmail || undefined,
      role: inviteRole,
      expiresInDays: parseInt(inviteExpiry),
    });
  };

  const getRoleBadge = (role: string) => {
    if (role === "admin") {
      return <Badge variant="default" className="gap-1"><Shield className="h-3 w-3" /> Admin</Badge>;
    }
    return <Badge variant="secondary" className="gap-1"><User className="h-3 w-3" /> Team Member</Badge>;
  };

  const getStatusBadge = (isActive: boolean) => {
    if (isActive) {
      return <Badge variant="outline" className="text-green-600 border-green-600/30 gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>;
    }
    return <Badge variant="outline" className="text-red-600 border-red-600/30 gap-1"><XCircle className="h-3 w-3" /> Disabled</Badge>;
  };

  const getInviteStatus = (invite: TeamInvitation) => {
    if (invite.usedAt) {
      return <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Used</Badge>;
    }
    if (new Date() > new Date(invite.expiresAt)) {
      return <Badge variant="outline" className="text-red-600 border-red-600/30 gap-1"><Clock className="h-3 w-3" /> Expired</Badge>;
    }
    if (!invite.isActive) {
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600/30 gap-1"><XCircle className="h-3 w-3" /> Revoked</Badge>;
    }
    return <Badge variant="outline" className="text-green-600 border-green-600/30 gap-1"><Clock className="h-3 w-3" /> Active</Badge>;
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      login: "Logged in",
      register: "Registered",
      magic_link_requested: "Requested magic link",
      create_invite: "Created invite",
      update_member: "Updated member",
      outreach_generated: "Generated outreach",
      business_enriched: "Enriched business",
      scan_started: "Started scan",
    };
    return labels[action] || action;
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4 flex-wrap">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage team access and view activity</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-invite">
                <Plus className="h-4 w-4 mr-2" />
                Create Invite
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Team Invite</DialogTitle>
                <DialogDescription>
                  Generate an invite code for a new team member
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email (optional)</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="Restrict to specific email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    data-testid="input-invite-email"
                  />
                  <p className="text-xs text-muted-foreground">Leave blank to allow any email</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger id="invite-role" data-testid="select-invite-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="team_member">Team Member</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-expiry">Expires in</Label>
                  <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                    <SelectTrigger id="invite-expiry" data-testid="select-invite-expiry">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  onClick={handleCreateInvite} 
                  disabled={createInviteMutation.isPending}
                  data-testid="button-confirm-invite"
                >
                  {createInviteMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Invite
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="members" className="space-y-4">
          <TabsList>
            <TabsTrigger value="members" className="gap-2" data-testid="tab-members">
              <Users className="h-4 w-4" />
              Team Members
            </TabsTrigger>
            <TabsTrigger value="invites" className="gap-2" data-testid="tab-invites">
              <Mail className="h-4 w-4" />
              Invites
            </TabsTrigger>
            <TabsTrigger value="activity" className="gap-2" data-testid="tab-activity">
              <Activity className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>{members?.length || 0} members</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/team/members"] })}
                  data-testid="button-refresh-members"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingMembers ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Auth</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members?.map((member) => (
                        <TableRow key={member.id} data-testid={`row-member-${member.id}`}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {member.firstName} {member.lastName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {member.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{getRoleBadge(member.role)}</TableCell>
                          <TableCell>{getStatusBadge(member.isActive)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{member.authProvider || "unknown"}</Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {member.lastLoginAt ? formatDistanceToNow(new Date(member.lastLoginAt), { addSuffix: true }) : "Never"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Select 
                                value={member.role}
                                onValueChange={(role) => updateMemberMutation.mutate({ id: member.id, role })}
                              >
                                <SelectTrigger className="w-[130px]" data-testid={`select-role-${member.id}`}>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="team_member">Team Member</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                              <Switch
                                checked={member.isActive}
                                onCheckedChange={(isActive) => updateMemberMutation.mutate({ id: member.id, isActive })}
                                data-testid={`switch-active-${member.id}`}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invites">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle>Invitations</CardTitle>
                  <CardDescription>{invitations?.filter(i => i.isActive && !i.usedAt).length || 0} active invites</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/team/invites"] })}
                  data-testid="button-refresh-invites"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingInvitations ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations?.map((invite) => (
                        <TableRow key={invite.id} data-testid={`row-invite-${invite.id}`}>
                          <TableCell>
                            <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                              {invite.code}
                            </code>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {invite.email || "Any email"}
                          </TableCell>
                          <TableCell>{getRoleBadge(invite.role)}</TableCell>
                          <TableCell>{getInviteStatus(invite)}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {format(new Date(invite.expiresAt), "MMM d, yyyy")}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => copyInviteCode(invite.code)}
                                disabled={!!invite.usedAt}
                                data-testid={`button-copy-code-${invite.id}`}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => deleteInviteMutation.mutate(invite.id)}
                                disabled={deleteInviteMutation.isPending}
                                data-testid={`button-delete-invite-${invite.id}`}
                              >
                                <Trash2 className="h-4 w-4" />
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
          </TabsContent>

          <TabsContent value="activity">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
                <div>
                  <CardTitle>Activity Log</CardTitle>
                  <CardDescription>Recent team activity</CardDescription>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/team/activity"] })}
                  data-testid="button-refresh-activity"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {loadingActivity ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Time</TableHead>
                          <TableHead>Action</TableHead>
                          <TableHead>Entity</TableHead>
                          <TableHead>Details</TableHead>
                          <TableHead>IP</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {activityLog?.map((log) => (
                          <TableRow key={log.id} data-testid={`row-activity-${log.id}`}>
                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                              {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{getActionLabel(log.action)}</Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.entityType && (
                                <span className="text-muted-foreground">{log.entityType}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm max-w-[200px] truncate">
                              {log.details && Object.keys(log.details).length > 0 && (
                                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                                  {JSON.stringify(log.details)}
                                </code>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground font-mono">
                              {log.ipAddress || "-"}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
