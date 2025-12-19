import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, Lock, ArrowRight, Loader2, ArrowLeft, Shield, Key } from "lucide-react";

type LoginStep = "email" | "password" | "accessCode" | "setup";

export default function TeamLogin() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Multi-step form state
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupToken, setSetupToken] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState("");

  // Check email mutation (also used with access code for setup)
  const checkEmailMutation = useMutation({
    mutationFn: async (data: { email: string; accessCode?: string }) => {
      const response = await apiRequest("POST", "/api/team/check-email", data);
      return await response.json();
    },
    onSuccess: (data: { exists: boolean; needsPasswordSetup: boolean; firstName?: string; setupToken?: string; requiresAccessCode?: boolean }) => {
      if (!data.exists) {
        toast({ 
          title: "Account not found", 
          description: "This email is not registered. Please contact your administrator.",
          variant: "destructive" 
        });
        return;
      }
      
      setUserName(data.firstName || "");
      
      if (!data.needsPasswordSetup) {
        // User has a password, go to login
        setStep("password");
      } else if (data.requiresAccessCode) {
        // User needs to provide access code first
        setStep("accessCode");
      } else if (data.setupToken) {
        // Access code verified, got setup token
        setSetupToken(data.setupToken);
        setStep("setup");
        toast({
          title: "Welcome!",
          description: "Please set up your password to continue.",
        });
      }
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to check email",
        variant: "destructive" 
      });
    },
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      return await apiRequest("POST", "/api/team/login", data);
    },
    onSuccess: () => {
      toast({ title: "Login successful", description: "Welcome back!" });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ 
        title: "Login failed", 
        description: error.message || "Invalid email or password",
        variant: "destructive" 
      });
    },
  });

  // Setup password mutation
  const setupPasswordMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; setupToken: string }) => {
      return await apiRequest("POST", "/api/team/setup-password", data);
    },
    onSuccess: () => {
      toast({ title: "Password set successfully", description: "You are now logged in!" });
      setLocation("/");
    },
    onError: (error: any) => {
      toast({ 
        title: "Setup failed", 
        description: error.message || "Failed to set password",
        variant: "destructive" 
      });
      // If token expired, go back to email step
      if (error.message?.includes("token")) {
        setStep("email");
        setSetupToken(null);
      }
    },
  });

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    checkEmailMutation.mutate({ email });
  };

  const handleAccessCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) {
      toast({ title: "Error", description: "Please enter the team access code", variant: "destructive" });
      return;
    }
    checkEmailMutation.mutate({ email, accessCode });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password });
  };

  const handleSetupPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 8) {
      toast({ title: "Error", description: "Password must be at least 8 characters", variant: "destructive" });
      return;
    }
    if (!setupToken) {
      toast({ title: "Error", description: "Setup session expired. Please start over.", variant: "destructive" });
      setStep("email");
      return;
    }
    setupPasswordMutation.mutate({ email, password, setupToken });
  };

  const goBack = () => {
    setStep("email");
    setPassword("");
    setConfirmPassword("");
    setSetupToken(null);
    setAccessCode("");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <div className="p-3 rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {step === "email" && "Team Login"}
            {step === "accessCode" && `Welcome${userName ? `, ${userName}` : ""}`}
            {step === "password" && `Welcome back${userName ? `, ${userName}` : ""}`}
            {step === "setup" && "Set Up Your Password"}
          </CardTitle>
          <CardDescription>
            {step === "email" && "Enter your team email to continue"}
            {step === "accessCode" && "Enter the team access code provided by your administrator"}
            {step === "password" && "Enter your password to sign in"}
            {step === "setup" && "Create a secure password for your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Step 1: Email Input */}
          {step === "email" && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    data-testid="input-email"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={checkEmailMutation.isPending}
                data-testid="button-continue"
              >
                {checkEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Continue
              </Button>
            </form>
          )}

          {/* Step 2: Access Code (for first-time setup) */}
          {step === "accessCode" && (
            <form onSubmit={handleAccessCodeSubmit} className="space-y-4">
              <div className="p-3 bg-muted rounded-md mb-4">
                <p className="text-sm text-muted-foreground">
                  First time? Enter the access code for: <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="accessCode">Team Access Code</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={goBack}
                    className="text-xs h-auto p-0"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Change email
                  </Button>
                </div>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="accessCode" 
                    type="text"
                    placeholder="Enter access code"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    className="pl-10 uppercase"
                    data-testid="input-access-code"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={checkEmailMutation.isPending}
                data-testid="button-verify-access-code"
              >
                {checkEmailMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Verify & Continue
              </Button>
            </form>
          )}

          {/* Step 3: Password Login */}
          {step === "password" && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={goBack}
                    className="text-xs h-auto p-0"
                  >
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Change email
                  </Button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    data-testid="input-password"
                    required
                    autoFocus
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Sign In
              </Button>
            </form>
          )}

          {/* Step 3: Password Setup */}
          {step === "setup" && (
            <form onSubmit={handleSetupPassword} className="space-y-4">
              <div className="p-3 bg-muted rounded-md mb-4">
                <p className="text-sm text-muted-foreground">
                  Setting up password for: <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="new-password" 
                    type="password"
                    placeholder="Create a password (8+ characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    data-testid="input-new-password"
                    required
                    minLength={8}
                    autoFocus
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirm-password" 
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    data-testid="input-confirm-password"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="flex-shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1" 
                  disabled={setupPasswordMutation.isPending}
                  data-testid="button-setup-password"
                >
                  {setupPasswordMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <ArrowRight className="h-4 w-4 mr-2" />
                  )}
                  Set Password & Sign In
                </Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-xs text-muted-foreground">
            Contact your administrator if you need access
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
