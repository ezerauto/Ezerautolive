import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DollarSign,
  TrendingUp,
  Package,
  Target,
  Truck,
  Archive,
  CheckCircle,
  Clock,
} from "lucide-react";
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
  const { data: metrics, isLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const GOAL_AMOUNT = 150000;

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-24 mb-2" />
                <Skeleton className="h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const progress = metrics ? (metrics.progressTo150K / GOAL_AMOUNT) * 100 : 0;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">The Books</h1>
        <p className="text-muted-foreground">Financial overview of the family business</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-investment">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Investment</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-total-investment">
              ${metrics?.totalInvestment.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All-time capital invested</p>
          </CardContent>
        </Card>

        <Card data-testid="card-inventory-value">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Inventory Value</CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-inventory-value">
              ${metrics?.currentInventoryValue.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Unsold vehicles cost</p>
          </CardContent>
        </Card>

        <Card data-testid="card-gross-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Profit</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-success" data-testid="text-gross-profit">
              ${metrics?.totalGrossProfit.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All-time profit from sales</p>
          </CardContent>
        </Card>

        <Card data-testid="card-reinvestment-status">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Partnership Phase</CardTitle>
            <Target className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge
              variant={metrics?.reinvestmentPhase ? "default" : "secondary"}
              className="text-xs uppercase mb-2"
              data-testid="badge-phase-status"
            >
              {metrics?.reinvestmentPhase ? "Reinvestment (60/40)" : "Post-Reinvestment (50/50)"}
            </Badge>
            <p className="text-xs text-muted-foreground">Current profit split</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8" data-testid="card-goal-progress">
        <CardHeader>
          <CardTitle>Progress to $150K Inventory Goal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Current: <span className="font-mono font-semibold text-foreground">${metrics?.progressTo150K.toLocaleString() || '0'}</span></span>
              <span className="text-muted-foreground">Goal: <span className="font-mono font-semibold text-foreground">$150,000</span></span>
            </div>
            <Progress value={progress} className="h-3" data-testid="progress-150k-goal" />
            <p className="text-sm text-muted-foreground">
              {progress >= 100 ? 'Goal reached!' : `${Math.round(progress)}% complete`}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
        <Card className="hover-elevate" data-testid="card-vehicles-transit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Transit</CardTitle>
            <Truck className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-transit-count">{metrics?.vehiclesInTransit.count || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">${metrics?.vehiclesInTransit.value.toLocaleString() || '0'}</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-vehicles-stock">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Stock</CardTitle>
            <Archive className="h-5 w-5 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-stock-count">{metrics?.vehiclesInStock.count || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">${metrics?.vehiclesInStock.value.toLocaleString() || '0'}</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-vehicles-sold">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sold</CardTitle>
            <CheckCircle className="h-5 w-5 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-sold-count">{metrics?.vehiclesSold.count || 0}</div>
            <p className="text-xs text-muted-foreground font-mono">${metrics?.vehiclesSold.revenue.toLocaleString() || '0'}</p>
          </CardContent>
        </Card>

        <Card className="hover-elevate" data-testid="card-pending-payments">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <Clock className="h-5 w-5 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-destructive" data-testid="text-pending-amount">
              ${metrics?.pendingPayments.toLocaleString() || '0'}
            </div>
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
    </div>
  );
}
