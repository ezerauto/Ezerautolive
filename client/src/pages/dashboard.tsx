import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  Package,
  Target,
  Truck,
  Archive,
  CheckCircle,
  Clock,
  TrendingDown,
  RefreshCw,
  MapPin,
  Globe,
} from "lucide-react";
import { ProjectedSalesWidget } from "@/components/ProjectedSalesWidget";
import { formatDualCurrency } from "@/lib/currency";
import { PageTemplate } from "@/components/PageTemplate";
import { MetricCard } from "@/components/MetricCard";
import { SPACING } from "@/lib/design-system";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type DashboardMetrics = {
  totalInvestment: number;
  currentInventoryValue: number;
  totalGrossProfit: number;
  progressTo150K: number;
  reinvestmentPhase: boolean;
  vehiclesInTransit: { count: number; value: number };
  vehiclesInStock: { count: number; value: number };
  vehiclesSold: { count: number; revenue: number };
  pendingPayments: number;
  inventoryGrowth: Array<{ date: string; value: number }>;
  portfolioComposition: Array<{ name: string; value: number }>;
  priceComparison: Array<{ vehicle: string; target: number; actual: number }>;
};

export default function Dashboard() {
  const [location, setLocation] = useState<'all' | 'roatan' | 'omaha'>('all');
  
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics", { location }],
  });

  const GOAL_AMOUNT = 150000;
  
  const locationButtons = (
    <div className="flex gap-2" data-testid="location-filter">
      <Button
        variant={location === 'all' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocation('all')}
        className="gap-1"
        data-testid="button-location-all"
      >
        <Globe className="h-3 w-3" />
        All Locations
      </Button>
      <Button
        variant={location === 'roatan' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocation('roatan')}
        className="gap-1"
        data-testid="button-location-roatan"
      >
        <MapPin className="h-3 w-3" />
        Roatán
      </Button>
      <Button
        variant={location === 'omaha' ? 'default' : 'outline'}
        size="sm"
        onClick={() => setLocation('omaha')}
        className="gap-1"
        data-testid="button-location-omaha"
      >
        <MapPin className="h-3 w-3" />
        Omaha
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <PageTemplate
        title="Overview"
        subtitle="Financial overview and business metrics"
        breadcrumbs={[{ label: "Dashboard" }]}
      >
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${SPACING.GRID_GAP}`}>
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className={SPACING.CARD}>
              <Skeleton className="h-4 w-32 mb-4" />
              <Skeleton className="h-8 w-24 mb-2" />
              <Skeleton className="h-3 w-20" />
            </Card>
          ))}
        </div>
      </PageTemplate>
    );
  }

  const progress = metrics ? (metrics.progressTo150K / GOAL_AMOUNT) * 100 : 0;

  const kpiCards = (
    <>
      <MetricCard
        title="Total Investment"
        value={formatDualCurrency(metrics?.totalInvestment || 0).usd}
        subtitle="All-time capital invested"
        icon={DollarSign}
        testId="card-total-investment"
      />
      <MetricCard
        title="Current Inventory"
        value={formatDualCurrency(metrics?.currentInventoryValue || 0).usd}
        subtitle="Unsold vehicles cost"
        icon={Package}
        testId="card-inventory-value"
      />
      <MetricCard
        title="Total Gross Profit"
        value={formatDualCurrency(metrics?.totalGrossProfit || 0).usd}
        subtitle="Lifetime earnings"
        icon={TrendingUp}
        testId="card-gross-profit"
      />
      <MetricCard
        title="Reinvestment Fund"
        value={formatDualCurrency(metrics?.progressTo150K || 0).usd}
        subtitle={`${progress.toFixed(0)}% to $150K goal`}
        icon={RefreshCw}
        testId="card-progress"
      />
    </>
  );

  return (
    <PageTemplate
      title="Overview"
      subtitle="Financial overview and business metrics"
      breadcrumbs={[{ label: "Dashboard" }]}
      kpiCards={kpiCards}
      actions={locationButtons}
    >
      {/* Goal Progress Card */}
      <Card data-testid="card-goal-progress">
        <CardHeader>
          <CardTitle>Progress to $150K / L 3.9M Inventory Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm gap-4">
              <div>
                <span className="text-muted-foreground">Current: </span>
                <span className="font-mono font-semibold text-foreground block">
                  {formatDualCurrency(metrics?.progressTo150K || 0).usd}
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {formatDualCurrency(metrics?.progressTo150K || 0).hnl}
                </span>
              </div>
              <div className="text-right">
                <span className="text-muted-foreground">Goal: </span>
                <span className="font-mono font-semibold text-foreground block">$150,000</span>
                <span className="font-mono text-xs text-muted-foreground">L 3,944,700</span>
              </div>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-150k-goal" />
            <p className="text-sm text-muted-foreground">
              {progress >= 100 ? 'Goal reached!' : `${Math.round(progress)}% complete`}
            </p>
          </div>
        </CardContent>
      </Card>

      <ProjectedSalesWidget />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="hover-elevate" data-testid="card-vehicles-transit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-transit-count">{metrics?.vehiclesInTransit.count || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(metrics?.vehiclesInTransit.value || 0).usd}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(metrics?.vehiclesInTransit.value || 0).hnl}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-vehicles-stock">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Archive className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-count">{metrics?.vehiclesInStock.count || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(metrics?.vehiclesInStock.value || 0).usd}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(metrics?.vehiclesInStock.value || 0).hnl}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-vehicles-sold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sold-count">{metrics?.vehiclesSold.count || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(metrics?.vehiclesSold.revenue || 0).usd}
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(metrics?.vehiclesSold.revenue || 0).hnl}
            </p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-pending-payments">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive" data-testid="text-pending-amount">
              {formatDualCurrency(metrics?.pendingPayments || 0).usd}
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              {formatDualCurrency(metrics?.pendingPayments || 0).hnl}
            </p>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Inventory Value Growth</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={metrics?.inventoryGrowth || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Portfolio Composition</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={metrics?.portfolioComposition || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {(metrics?.portfolioComposition || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={`hsl(var(--chart-${(index % 5) + 1}))`} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Target vs Actual Sale Prices</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics?.priceComparison || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="vehicle" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Bar dataKey="target" fill="hsl(var(--chart-1))" name="Target Price" />
              <Bar dataKey="actual" fill="hsl(var(--chart-2))" name="Actual Sale Price" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </PageTemplate>
  );
}
