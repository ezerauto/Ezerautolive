import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Users, RefreshCw, CheckCircle2, Clock } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

type FinancialData = {
  totalGrossProfit: number;
  dominickEarnings: number;
  tonyEarnings: number;
  reinvestmentBalance: number;
  profitByVehicle: Array<{
    vehicleName: string;
    salePrice: number;
    totalCost: number;
    grossProfit: number;
    reinvestment: number;
    dominickShare: number;
    tonyShare: number;
    paymentStatus: string;
  }>;
  costBreakdown: Array<{ name: string; value: number }>;
};

export default function Financials() {
  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/financials"],
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-8 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const paymentStatusConfig: Record<string, { color: string; icon: any }> = {
    paid: { color: "bg-success/10 text-success", icon: CheckCircle2 },
    pending: { color: "bg-warning/10 text-warning", icon: Clock },
    overdue: { color: "bg-destructive/10 text-destructive", icon: Clock },
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">The Take</h1>
        <p className="text-muted-foreground">Profit distribution and earnings breakdown</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Profit</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-success" data-testid="text-total-profit">
              ${data?.totalGrossProfit.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All-time profit</p>
          </CardContent>
        </Card>

        <Card data-testid="card-dominick-earnings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Dominick's Earnings</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-dominick-earnings">
              ${data?.dominickEarnings.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Investor share</p>
          </CardContent>
        </Card>

        <Card data-testid="card-tony-earnings">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tony's Earnings</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-tony-earnings">
              ${data?.tonyEarnings.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Dealer partner share</p>
          </CardContent>
        </Card>

        <Card data-testid="card-reinvestment">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reinvestment Fund</CardTitle>
            <RefreshCw className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono" data-testid="text-reinvestment">
              ${data?.reinvestmentBalance.toLocaleString() || '0'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">60% of profits</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Profit by Vehicle</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold text-right">Sale Price</TableHead>
                    <TableHead className="font-semibold text-right">Profit</TableHead>
                    <TableHead className="font-semibold text-right">Dominick</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.profitByVehicle.map((vehicle, idx) => {
                    const statusInfo = paymentStatusConfig[vehicle.paymentStatus] || paymentStatusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TableRow key={idx} className="hover-elevate">
                        <TableCell className="font-medium">{vehicle.vehicleName}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${vehicle.salePrice.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          ${vehicle.grossProfit.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${vehicle.dominickShare.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {vehicle.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {(!data?.profitByVehicle || data.profitByVehicle.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                        No sold vehicles yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cost Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data?.costBreakdown || []}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="hsl(var(--primary))"
                  dataKey="value"
                >
                  {(data?.costBreakdown || []).map((entry, index) => (
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
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
