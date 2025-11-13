import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, TrendingUp, Users, RefreshCw, CheckCircle2, Clock, MapPin, Truck, Ship, FileText } from "lucide-react";
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
  const [activeTab, setActiveTab] = useState("combined");
  
  const { data, isLoading } = useQuery<FinancialData>({
    queryKey: ["/api/financials"],
  });

  const { data: salesLeaderboard } = useQuery({
    queryKey: ['/api/leaderboards/sales'],
  });

  const { data: procurementLeaderboard } = useQuery({
    queryKey: ['/api/leaderboards/procurement'],
  });

  const { data: logisticsLeaderboard } = useQuery({
    queryKey: ['/api/leaderboards/logistics'],
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
        <p className="text-muted-foreground">Location-based financials and profit distribution</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="combined" data-testid="tab-combined">
            <DollarSign className="h-4 w-4 mr-2" />
            Combined
          </TabsTrigger>
          <TabsTrigger value="omaha" data-testid="tab-omaha">
            <MapPin className="h-4 w-4 mr-2" />
            Omaha (Sales)
          </TabsTrigger>
          <TabsTrigger value="denver" data-testid="tab-denver">
            <Truck className="h-4 w-4 mr-2" />
            Denver (Procurement)
          </TabsTrigger>
          <TabsTrigger value="roatan" data-testid="tab-roatan">
            <Ship className="h-4 w-4 mr-2" />
            Roatán (Logistics)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="combined" className="mt-6">
          <CombinedFinancials data={data} paymentStatusConfig={paymentStatusConfig} />
        </TabsContent>

        <TabsContent value="omaha" className="mt-6">
          <OmahaFinancials data={salesLeaderboard} />
        </TabsContent>

        <TabsContent value="denver" className="mt-6">
          <DenverFinancials data={procurementLeaderboard} />
        </TabsContent>

        <TabsContent value="roatan" className="mt-6">
          <RoatanFinancials data={logisticsLeaderboard} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CombinedFinancials({ data, paymentStatusConfig }: { data: FinancialData | undefined; paymentStatusConfig: any }) {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card data-testid="card-total-profit">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gross Profit</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-success" data-testid="text-total-profit">
              ${data?.totalGrossProfit?.toLocaleString() || '0'}
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
              ${data?.dominickEarnings?.toLocaleString() || '0'}
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
              ${data?.tonyEarnings?.toLocaleString() || '0'}
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
              ${data?.reinvestmentBalance?.toLocaleString() || '0'}
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
                  {data?.profitByVehicle?.map((vehicle, idx) => {
                    const statusInfo = paymentStatusConfig[vehicle.paymentStatus] || paymentStatusConfig.pending;
                    const StatusIcon = statusInfo.icon;
                    return (
                      <TableRow key={idx} className="hover-elevate">
                        <TableCell className="font-medium">{vehicle.vehicleName}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${(vehicle.salePrice || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          ${(vehicle.grossProfit || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${(vehicle.dominickShare || 0).toLocaleString()}
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
    </>
  );
}

function OmahaFinancials({ data }: { data: any }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No Omaha sales data available yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{data.totalUnitsSold || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Vehicles sold in Omaha</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono text-success">${(data.totalProfit || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Gross profit from sales</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit/Unit</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">${(data.averageProfit || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Per vehicle average</p>
          </CardContent>
        </Card>
      </div>

      {data.topBuyers && data.topBuyers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 5 Buyers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.topBuyers.map((buyer: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="font-medium">{buyer.name || 'Unknown'}</TableCell>
                      <TableCell className="text-right font-mono">{buyer.units || 0}</TableCell>
                      <TableCell className="text-right font-mono text-success">${(buyer.profit || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}

function DenverFinancials({ data }: { data: any }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No Denver procurement data available yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Acquired</CardTitle>
            <Truck className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{data.totalUnitsAcquired || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Vehicles purchased</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Spread</CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">${(data.averageSpread || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Target - Purchase</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profitability Rate</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{(data.profitabilityRate || 0).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Profitable sold / all acquired</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Procurement Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
              <span className="font-medium">Total Inventory Value</span>
              <span className="font-mono text-lg">${((data.totalUnitsAcquired || 0) * (data.averageSpread || 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
              <span className="font-medium">Success Rate</span>
              <Badge variant="default">{(data.profitabilityRate || 0).toFixed(1)}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

function RoatanFinancials({ data }: { data: any }) {
  if (!data) {
    return (
      <Card>
        <CardContent className="py-16 text-center">
          <p className="text-muted-foreground">No Roatán logistics data available yet</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Clearance Time</CardTitle>
            <Clock className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{(data.averageClearanceTimeDays || 0).toFixed(1)}</div>
            <p className="text-xs text-muted-foreground mt-1">Days to clear customs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{(data.completionRate || 0).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Shipments completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Doc Completion</CardTitle>
            <FileText className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold font-mono">{(data.documentCompletionRate || 0).toFixed(0)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Documents complete</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Logistics Efficiency</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
              <span className="font-medium">Average Processing Time</span>
              <span className="font-mono text-lg">{(data.averageClearanceTimeDays || 0).toFixed(1)} days</span>
            </div>
            <div className="flex justify-between items-center p-4 rounded-lg bg-muted/50">
              <span className="font-medium">Overall Efficiency</span>
              <Badge variant="default">{(data.completionRate || 0).toFixed(0)}%</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
