import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, DollarSign, Target, TrendingDown } from "lucide-react";
import { formatDualCurrency } from "@/lib/currency";

type ProjectionData = {
  projections: Array<{
    vehicleId: string;
    vehicleName: string;
    status: string;
    purchasePrice: number;
    targetSalePrice: number;
    minimumPrice: number;
    projectedRevenue: {
      target: number;
      minimum: number;
    };
    projectedProfit: {
      target: number;
      minimum: number;
    };
    projectedDistribution: {
      target: {
        dominick: number;
        tony: number;
      };
      minimum: {
        dominick: number;
        tony: number;
      };
    };
  }>;
  totals: {
    totalInvestment: number;
    projectedRevenue: {
      target: number;
      minimum: number;
    };
    projectedProfit: {
      target: number;
      minimum: number;
    };
    projectedDistribution: {
      target: {
        dominick: number;
        tony: number;
      };
      minimum: {
        dominick: number;
        tony: number;
      };
    };
    currentInventoryValue: number;
    actualizedRevenue: number;
    vehiclesInStock: number;
    vehiclesInTransit: number;
    vehiclesSold: number;
    totalVehicles: number;
  };
};

export function ProjectedSalesWidget() {
  const { data, isLoading } = useQuery<ProjectionData>({
    queryKey: ["/api/analytics/projections"],
  });

  if (isLoading) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || data.projections.length === 0) {
    return (
      <Card className="mb-8" data-testid="card-projected-sales">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Projected Sales & Profits
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No unsold vehicles with target prices set. Add target prices to vehicles to see projections.
          </p>
        </CardContent>
      </Card>
    );
  }

  const { totals } = data;

  return (
    <Card className="mb-8" data-testid="card-projected-sales">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Projected Sales & Profits
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Based on {data.projections.length} unsold {data.projections.length === 1 ? 'vehicle' : 'vehicles'} with target prices
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Invested</span>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="text-2xl font-bold font-mono" data-testid="text-projected-investment">
              {formatDualCurrency(totals.totalInvestment).usd}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(totals.totalInvestment).hnl}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Target Revenue</span>
              <Target className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-mono text-success" data-testid="text-projected-revenue-target">
              {formatDualCurrency(totals.projectedRevenue.target).usd}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(totals.projectedRevenue.target).hnl}
            </p>
            <p className="text-xs text-muted-foreground">
              Min: {formatDualCurrency(totals.projectedRevenue.minimum).usd} / {formatDualCurrency(totals.projectedRevenue.minimum).hnl}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">Target Profit</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-mono text-success" data-testid="text-projected-profit-target">
              {formatDualCurrency(totals.projectedProfit.target).usd}
            </div>
            <p className="text-xs text-muted-foreground font-mono">
              {formatDualCurrency(totals.projectedProfit.target).hnl}
            </p>
            <p className="text-xs text-muted-foreground">
              Min: {formatDualCurrency(totals.projectedProfit.minimum).usd} / {formatDualCurrency(totals.projectedProfit.minimum).hnl}
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase tracking-wide">ROI</span>
              <TrendingUp className="h-4 w-4 text-success" />
            </div>
            <div className="text-2xl font-bold font-mono text-success" data-testid="text-projected-roi">
              {totals.totalInvestment > 0
                ? `${((totals.projectedProfit.target / totals.totalInvestment) * 100).toFixed(1)}%`
                : '0%'}
            </div>
            <p className="text-xs text-muted-foreground">
              Min: {totals.totalInvestment > 0
                ? `${((totals.projectedProfit.minimum / totals.totalInvestment) * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h4 className="text-sm font-semibold mb-3">Projected Profit Distribution (Target Prices)</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Dominick (Investor)</span>
                <div>
                  <Badge variant="secondary" className="font-mono" data-testid="badge-dominick-projected">
                    {formatDualCurrency(totals.projectedDistribution.target.dominick).usd}
                  </Badge>
                  <p className="text-xs text-muted-foreground font-mono text-right mt-1">
                    {formatDualCurrency(totals.projectedDistribution.target.dominick).hnl}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Min: {formatDualCurrency(totals.projectedDistribution.minimum.dominick).usd} / {formatDualCurrency(totals.projectedDistribution.minimum.dominick).hnl}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tony (Dealer Partner)</span>
                <div>
                  <Badge variant="secondary" className="font-mono" data-testid="badge-tony-projected">
                    {formatDualCurrency(totals.projectedDistribution.target.tony).usd}
                  </Badge>
                  <p className="text-xs text-muted-foreground font-mono text-right mt-1">
                    {formatDualCurrency(totals.projectedDistribution.target.tony).hnl}
                  </p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Min: {formatDualCurrency(totals.projectedDistribution.minimum.tony).usd} / {formatDualCurrency(totals.projectedDistribution.minimum.tony).hnl}
              </p>
            </div>
          </div>
        </div>

        {data.projections.length > 0 && (
          <>
            <Separator className="my-4" />
            <div>
              <h4 className="text-sm font-semibold mb-3">Per-Vehicle Projections</h4>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {data.projections.map((projection) => (
                  <div
                    key={projection.vehicleId}
                    className="flex items-center justify-between p-3 rounded-md bg-muted/30 hover-elevate"
                    data-testid={`projection-vehicle-${projection.vehicleId}`}
                  >
                    <div className="flex-1">
                      <p className="text-sm font-medium">{projection.vehicleName}</p>
                      <p className="text-xs text-muted-foreground">
                        Target: ${projection.projectedProfit.target.toLocaleString()} profit
                        {projection.minimumPrice > 0 && ` | Min: $${projection.projectedProfit.minimum.toLocaleString()}`}
                      </p>
                    </div>
                    <Badge variant="outline" className={projection.status === 'in_stock' ? 'bg-warning/10 text-warning' : 'bg-primary/10 text-primary'}>
                      {projection.status === 'in_stock' ? 'In Stock' : 'In Transit'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
