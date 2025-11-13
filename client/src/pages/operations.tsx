import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Package, Ship, Award, DollarSign, Percent } from "lucide-react";

interface SalesMetrics {
  totalUnitsSold: number;
  totalProfit: number;
  averageProfit: number;
  topBuyers: { name: string; units: number; profit: number }[];
}

interface ProcurementMetrics {
  totalUnitsAcquired: number;
  averageSpread: number;
  profitabilityRate: number;
}

interface LogisticsMetrics {
  averageClearanceTimeDays: number;
  completionRate: number;
  documentCompletionRate: number;
  totalClearances: number;
}

export default function Operations() {
  const { data: salesMetrics, isLoading: salesLoading } = useQuery<SalesMetrics>({
    queryKey: ['/api/leaderboards/sales'],
  });

  const { data: procurementMetrics, isLoading: procurementLoading } = useQuery<ProcurementMetrics>({
    queryKey: ['/api/leaderboards/procurement'],
  });

  const { data: logisticsMetrics, isLoading: logisticsLoading } = useQuery<LogisticsMetrics>({
    queryKey: ['/api/leaderboards/logistics'],
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">EZER Auto Operations</h1>
        <p className="text-muted-foreground mt-1">
          Performance metrics across Omaha sales, Denver procurement, and Roatán logistics
        </p>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="sales" data-testid="tab-sales">
            <DollarSign className="h-4 w-4 mr-2" />
            Sales (Omaha)
          </TabsTrigger>
          <TabsTrigger value="procurement" data-testid="tab-procurement">
            <Package className="h-4 w-4 mr-2" />
            Procurement (Denver)
          </TabsTrigger>
          <TabsTrigger value="logistics" data-testid="tab-logistics">
            <Ship className="h-4 w-4 mr-2" />
            Logistics (Roatán)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Sold</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-units-sold">
                  {salesLoading ? "..." : salesMetrics?.totalUnitsSold || 0}
                </div>
                <p className="text-xs text-muted-foreground">Omaha dealership</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-total-profit">
                  ${salesLoading ? "..." : salesMetrics?.totalProfit.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Lifetime sales profit</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Profit</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-avg-profit">
                  ${salesLoading ? "..." : salesMetrics?.averageProfit.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Per vehicle sold</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Top Buyers</CardTitle>
              <CardDescription>Top 5 buyers by total profit</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Buyer Name</TableHead>
                    <TableHead className="text-right">Units</TableHead>
                    <TableHead className="text-right">Total Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : salesMetrics?.topBuyers && salesMetrics.topBuyers.length > 0 ? (
                    salesMetrics.topBuyers.map((buyer, idx) => (
                      <TableRow key={idx} data-testid={`buyer-row-${idx}`}>
                        <TableCell className="font-medium">{buyer.name}</TableCell>
                        <TableCell className="text-right">{buyer.units}</TableCell>
                        <TableCell className="text-right font-mono">
                          ${buyer.profit.toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No sales data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="procurement" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Units Acquired</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-units-acquired">
                  {procurementLoading ? "..." : procurementMetrics?.totalUnitsAcquired || 0}
                </div>
                <p className="text-xs text-muted-foreground">Denver procurement</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Spread</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-avg-spread">
                  ${procurementLoading ? "..." : procurementMetrics?.averageSpread.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">Target price - purchase price</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Profitability Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-profitability-rate">
                  {procurementLoading 
                    ? "..." 
                    : `${((procurementMetrics?.profitabilityRate || 0) * 100).toFixed(1)}%`
                  }
                </div>
                <p className="text-xs text-muted-foreground">Profitable vehicles / all acquired</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Procurement Performance</CardTitle>
              <CardDescription>
                Denver team's acquisition efficiency and profit outcomes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Units Acquired</span>
                <Badge variant="secondary" data-testid="badge-total-acquired">
                  {procurementMetrics?.totalUnitsAcquired || 0} vehicles
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Spread per Unit</span>
                <Badge variant="secondary" data-testid="badge-avg-spread">
                  ${procurementMetrics?.averageSpread.toLocaleString() || 0}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Success Rate</span>
                <Badge 
                  variant={(procurementMetrics?.profitabilityRate || 0) > 0.5 ? "default" : "secondary"}
                  data-testid="badge-success-rate"
                >
                  {((procurementMetrics?.profitabilityRate || 0) * 100).toFixed(1)}% profitable
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logistics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Clearance Time</CardTitle>
                <Ship className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-clearance-time">
                  {logisticsLoading ? "..." : logisticsMetrics?.averageClearanceTimeDays.toFixed(1) || 0}
                </div>
                <p className="text-xs text-muted-foreground">Days (Roatán port)</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-completion-rate">
                  {logisticsLoading 
                    ? "..." 
                    : `${((logisticsMetrics?.completionRate || 0) * 100).toFixed(1)}%`
                  }
                </div>
                <p className="text-xs text-muted-foreground">Cleared shipments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Doc Completion</CardTitle>
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold" data-testid="metric-doc-completion">
                  {logisticsLoading 
                    ? "..." 
                    : `${((logisticsMetrics?.documentCompletionRate || 0) * 100).toFixed(1)}%`
                  }
                </div>
                <p className="text-xs text-muted-foreground">BOL + trucker packets</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Logistics Performance</CardTitle>
              <CardDescription>
                Roatán customs clearance and documentation efficiency
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Total Clearances Processed</span>
                <Badge variant="secondary" data-testid="badge-total-clearances">
                  {logisticsMetrics?.totalClearances || 0} shipments
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Average Processing Time</span>
                <Badge variant="secondary" data-testid="badge-avg-processing">
                  {logisticsMetrics?.averageClearanceTimeDays.toFixed(1) || 0} days
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Clearance Success Rate</span>
                <Badge 
                  variant={(logisticsMetrics?.completionRate || 0) > 0.8 ? "default" : "secondary"}
                  data-testid="badge-clearance-success"
                >
                  {((logisticsMetrics?.completionRate || 0) * 100).toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Documentation Quality</span>
                <Badge 
                  variant={(logisticsMetrics?.documentCompletionRate || 0) > 0.8 ? "default" : "secondary"}
                  data-testid="badge-doc-quality"
                >
                  {((logisticsMetrics?.documentCompletionRate || 0) * 100).toFixed(1)}% complete
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
