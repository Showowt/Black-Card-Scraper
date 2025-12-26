import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  DollarSign, Calculator, TrendingUp, Users, Zap, MessageSquare, 
  Star, BarChart3, Building2, ChevronLeft, Check, Crown, Rocket
} from "lucide-react";
import { 
  PRICING_TIERS, MACHINEMIND_PRODUCTS, VERTICAL_TIER_RECOMMENDATIONS, 
  CITY_STRATEGY, CATEGORIES, formatCOP 
} from "@shared/schema";

export default function Pricing() {
  const [selectedVertical, setSelectedVertical] = useState<string>("restaurant");
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("monthly");

  const verticalRec = VERTICAL_TIER_RECOMMENDATIONS[selectedVertical];
  const recommendedTier = verticalRec ? PRICING_TIERS.find(t => t.value === verticalRec.tier) : PRICING_TIERS[0];

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "despegue": return <Rocket className="h-5 w-5" />;
      case "crecimiento": return <TrendingUp className="h-5 w-5" />;
      case "escala": return <Crown className="h-5 w-5" />;
      case "empresa": return <Building2 className="h-5 w-5" />;
      default: return <Zap className="h-5 w-5" />;
    }
  };

  const getPriorityColor = (priority: "A" | "B" | "C") => {
    switch (priority) {
      case "A": return "bg-green-500/10 text-green-500 border-green-500/20";
      case "B": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "C": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
  };

  const calculateROI = (vertical: string) => {
    const rec = VERTICAL_TIER_RECOMMENDATIONS[vertical];
    if (!rec) return null;
    
    const tier = PRICING_TIERS.find(t => t.value === rec.tier);
    if (!tier || !tier.monthlyCOP) return null;

    const monthlyInvestment = tier.monthlyCOP;
    const avgBookingValue = rec.avgBookingCOP;
    const breakEvenBookings = rec.breakEvenBookings;
    const monthsToBreakEven = breakEvenBookings < 1 ? Math.ceil(1 / (1/breakEvenBookings) * 30) : Math.ceil(breakEvenBookings);
    
    return {
      monthlyInvestment,
      avgBookingValue,
      breakEvenBookings,
      monthsToBreakEven: breakEvenBookings < 1 ? `${Math.round(breakEvenBookings * 12)} months` : `${Math.round(breakEvenBookings)} bookings`,
      annualROI: ((avgBookingValue * 12) / (monthlyInvestment * 12) * 100).toFixed(0),
    };
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/50 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" data-testid="button-back">
                <ChevronLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-xl font-bold">MachineMind Pricing</h1>
              <p className="text-sm text-muted-foreground">Colombia AI Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/"><Button variant="outline" size="sm">Dashboard</Button></Link>
            <Link href="/blackcard-intel"><Button variant="outline" size="sm">Black Card Intel</Button></Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="tiers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="tiers" data-testid="tab-tiers">Pricing Tiers</TabsTrigger>
            <TabsTrigger value="calculator" data-testid="tab-calculator">ROI Calculator</TabsTrigger>
            <TabsTrigger value="products" data-testid="tab-products">Products</TabsTrigger>
            <TabsTrigger value="strategy" data-testid="tab-strategy">City Strategy</TabsTrigger>
          </TabsList>

          <TabsContent value="tiers" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Pricing Tiers</h2>
                <p className="text-muted-foreground">Choose the right plan for your business</p>
              </div>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                <Button 
                  variant={billingCycle === "monthly" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setBillingCycle("monthly")}
                >
                  Monthly
                </Button>
                <Button 
                  variant={billingCycle === "annual" ? "default" : "ghost"} 
                  size="sm"
                  onClick={() => setBillingCycle("annual")}
                >
                  Annual (17% off)
                </Button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {PRICING_TIERS.map((tier) => (
                <Card 
                  key={tier.value} 
                  className={`relative ${tier.value === "crecimiento" ? "ring-2 ring-primary" : ""}`}
                  data-testid={`card-tier-${tier.value}`}
                >
                  {tier.value === "crecimiento" && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary">Most Popular</Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
                      {getTierIcon(tier.value)}
                    </div>
                    <CardTitle className="text-lg">{tier.label}</CardTitle>
                    <CardDescription>{tier.labelEn} - {tier.target}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      {tier.monthlyCOP ? (
                        <>
                          <div className="text-3xl font-bold">
                            {billingCycle === "monthly" 
                              ? formatCOP(tier.monthlyCOP)
                              : formatCOP(tier.annualCOP! / 12)
                            }
                          </div>
                          <div className="text-sm text-muted-foreground">/month</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ~${billingCycle === "monthly" ? tier.monthlyUSD : Math.round(tier.annualUSD! / 12)} USD
                          </div>
                          {billingCycle === "annual" && (
                            <Badge variant="secondary" className="mt-2">Save 17%</Badge>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-3xl font-bold">Custom</div>
                          <div className="text-sm text-muted-foreground">${tier.monthlyUSD}-${tier.monthlyUSDMax} USD/mo</div>
                        </>
                      )}
                    </div>

                    {tier.setupCOP && (
                      <div className="text-center p-2 bg-muted rounded-md">
                        <div className="text-sm font-medium">Setup: {formatCOP(billingCycle === "annual" ? tier.setupCOP * 0.5 : tier.setupCOP)}</div>
                        {billingCycle === "annual" && (
                          <div className="text-xs text-green-500">50% off with annual</div>
                        )}
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground text-center">
                      {tier.inquiryLimit} inquiries/month
                    </div>

                    <div className="space-y-2">
                      {tier.features.map((feature, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>

                    <Button className="w-full" variant={tier.value === "crecimiento" ? "default" : "outline"}>
                      Select {tier.label}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="calculator" className="space-y-6">
            <div className="grid lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calculator className="h-5 w-5" />
                    ROI Calculator
                  </CardTitle>
                  <CardDescription>Select your business vertical</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Select value={selectedVertical} onValueChange={setSelectedVertical}>
                    <SelectTrigger data-testid="select-vertical">
                      <SelectValue placeholder="Select vertical" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {verticalRec && (
                    <div className="space-y-3 pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Recommended Tier</span>
                        <Badge className={getPriorityColor(verticalRec.priority)}>
                          {recommendedTier?.label}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Priority</span>
                        <Badge variant="outline" className={getPriorityColor(verticalRec.priority)}>
                          Tier {verticalRec.priority}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Avg Booking</span>
                        <span className="font-medium">{formatCOP(verticalRec.avgBookingCOP)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Break-even</span>
                        <span className="font-medium">
                          {verticalRec.breakEvenBookings < 1 
                            ? `${Math.round(1/verticalRec.breakEvenBookings)} months`
                            : `${verticalRec.breakEvenBookings.toFixed(1)} bookings`
                          }
                        </span>
                      </div>
                      <div className="p-3 bg-muted rounded-md text-sm">
                        {verticalRec.notes}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Break-Even Analysis by Vertical
                  </CardTitle>
                  <CardDescription>How many bookings to recover your investment</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(VERTICAL_TIER_RECOMMENDATIONS)
                      .sort((a, b) => a[1].breakEvenBookings - b[1].breakEvenBookings)
                      .slice(0, 12)
                      .map(([vertical, data]) => {
                        const cat = CATEGORIES.find(c => c.value === vertical);
                        const tier = PRICING_TIERS.find(t => t.value === data.tier);
                        return (
                          <div 
                            key={vertical} 
                            className={`flex items-center gap-3 p-2 rounded-md ${
                              selectedVertical === vertical ? "bg-primary/10" : "hover:bg-muted/50"
                            }`}
                            onClick={() => setSelectedVertical(vertical)}
                          >
                            <Badge variant="outline" className={getPriorityColor(data.priority)}>
                              {data.priority}
                            </Badge>
                            <span className="flex-1 font-medium">{cat?.label || vertical}</span>
                            <Badge variant="secondary">{tier?.label}</Badge>
                            <span className="text-sm text-muted-foreground w-24 text-right">
                              {formatCOP(data.avgBookingCOP)}
                            </span>
                            <span className="text-sm font-medium w-20 text-right">
                              {data.breakEvenBookings < 1 
                                ? `${Math.round(1/data.breakEvenBookings)}mo`
                                : `${data.breakEvenBookings.toFixed(1)}x`
                              }
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>The Bottom Line</CardTitle>
                <CardDescription>Why this pricing is a no-brainer</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-green-500/10 rounded-lg">
                    <div className="text-4xl font-bold text-green-500">1</div>
                    <div className="text-lg font-medium mt-2">Booking Per Quarter</div>
                    <div className="text-sm text-muted-foreground">More than pays for the service</div>
                  </div>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <div className="text-4xl font-bold text-blue-500">15-30%</div>
                    <div className="text-lg font-medium mt-2">Revenue Unlock</div>
                    <div className="text-sm text-muted-foreground">From lead recovery alone</div>
                  </div>
                  <div className="text-center p-4 bg-purple-500/10 rounded-lg">
                    <div className="text-4xl font-bold text-purple-500">3-8</div>
                    <div className="text-lg font-medium mt-2">Hours Saved Daily</div>
                    <div className="text-sm text-muted-foreground">Depending on tier</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">Core Products</h2>
              <p className="text-muted-foreground">One platform with vertical-specific conversation flows</p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {MACHINEMIND_PRODUCTS.map((product) => (
                <Card key={product.value} data-testid={`card-product-${product.value}`}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        {product.priority === 1 && <MessageSquare className="h-5 w-5 text-green-500" />}
                        {product.priority === 2 && <TrendingUp className="h-5 w-5 text-blue-500" />}
                        {product.priority === 3 && <Star className="h-5 w-5 text-amber-500" />}
                        {product.priority === 4 && <BarChart3 className="h-5 w-5 text-purple-500" />}
                        {product.label}
                      </CardTitle>
                      <Badge variant={product.type === "core" ? "default" : "secondary"}>
                        {product.type === "core" ? "Core Platform" : product.type === "module" ? "Module" : "Dashboard"}
                      </Badge>
                    </div>
                    <CardDescription>Priority #{product.priority}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">{product.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Critical Insight</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                  <p className="text-lg font-medium">
                    You're not selling 13 products. You're selling <span className="text-primary">one platform</span> with vertical-specific conversation flows.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="strategy" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold">City-by-City Strategy</h2>
              <p className="text-muted-foreground">Priority markets and focus verticals</p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {CITY_STRATEGY.map((cityData) => {
                const tierData = PRICING_TIERS.find(t => t.value === cityData.entryTier);
                return (
                  <Card key={cityData.city} data-testid={`card-city-${cityData.city}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="capitalize">{cityData.city.replace("_", " ")}</CardTitle>
                        <Badge variant="outline">#{cityData.priority}</Badge>
                      </div>
                      <CardDescription>Entry: {tierData?.label}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground">Focus Verticals:</div>
                        <div className="flex flex-wrap gap-1">
                          {cityData.focusVerticals.map((v) => {
                            const cat = CATEGORIES.find(c => c.value === v);
                            return (
                              <Badge key={v} variant="secondary" className="text-xs">
                                {cat?.label || v}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Vertical Prioritization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Badge className="bg-green-500">Tier A</Badge>
                      High Margin, High Deal Value
                    </h4>
                    <p className="text-sm text-muted-foreground">Attack First</p>
                    <ul className="text-sm space-y-1">
                      <li>Concierge Services (Escala)</li>
                      <li>Boat Charters (Crecimiento)</li>
                      <li>Villas/Rentals (Crecimiento)</li>
                      <li>Clubs/Nightlife (Crecimiento)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Badge className="bg-amber-500">Tier B</Badge>
                      Strong Fit, Moderate Value
                    </h4>
                    <p className="text-sm text-muted-foreground">Build Pipeline</p>
                    <ul className="text-sm space-y-1">
                      <li>Event Planners (Crecimiento)</li>
                      <li>Hotels (Despegue to Crecimiento)</li>
                      <li>Photographers (Despegue)</li>
                    </ul>
                  </div>
                  <div className="space-y-2">
                    <h4 className="font-medium flex items-center gap-2">
                      <Badge className="bg-blue-500">Tier C</Badge>
                      Volume Play, Lower Margins
                    </h4>
                    <p className="text-sm text-muted-foreground">Scale Operations</p>
                    <ul className="text-sm space-y-1">
                      <li>Restaurants (Despegue)</li>
                      <li>Tour Operators (Despegue)</li>
                      <li>Private Chefs (Despegue)</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
