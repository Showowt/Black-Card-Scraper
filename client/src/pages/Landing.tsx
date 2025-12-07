import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, MapPin, Zap, Download, BarChart3, Mail } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-primary" />
            <span className="text-xl font-medium">Black Card Scanner</span>
          </div>
          <Button asChild data-testid="button-login">
            <a href="/api/login">Sign In</a>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12">
        <section className="text-center mb-16">
          <h1 className="text-4xl font-medium mb-4" data-testid="text-hero-title">
            Business Intelligence for Colombia
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8" data-testid="text-hero-subtitle">
            Scan, enrich, and manage local business data across Cartagena, Medellín, and Bogotá. 
            Powered by Google Places and AI insights.
          </p>
          <Button size="lg" asChild data-testid="button-get-started">
            <a href="/api/login">Get Started</a>
          </Button>
        </section>

        <section className="grid md:grid-cols-3 gap-6 mb-16">
          <Card>
            <CardHeader>
              <MapPin className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Multi-City Scanning</CardTitle>
              <CardDescription>
                Scan restaurants, hotels, clubs, tour operators, and spas across Colombian cities
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary mb-2" />
              <CardTitle>AI Enrichment</CardTitle>
              <CardDescription>
                Automatically score and classify businesses for partnership potential
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Download className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Easy Export</CardTitle>
              <CardDescription>
                Export to CSV for CRM imports or Movvia vendor format
              </CardDescription>
            </CardHeader>
          </Card>
        </section>

        <section className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Track business statistics, readiness levels, and outreach progress
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Mail className="h-10 w-10 text-primary mb-2" />
              <CardTitle>Outreach Management</CardTitle>
              <CardDescription>
                Generate AI-powered outreach emails and track campaign status
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
