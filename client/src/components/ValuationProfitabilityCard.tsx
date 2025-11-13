import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { TrendingUp, TrendingDown, DollarSign, Globe, AlertCircle } from "lucide-react";
import type { Vehicle } from "@shared/schema";

interface Props {
  vehicle: Vehicle;
}

interface ValuationData {
  hondurasMarketValue: number;
  confidenceLevel: string;
  marketCondition: string;
  lastUpdated: string;
}

interface ProfitabilityData {
  totalCost: number;
  estimatedRevenue: number;
  estimatedProfit: number;
  profitMargin: number;
  costsComplete: boolean;
  missingCosts?: string[];
}

export function ValuationProfitabilityCard({ vehicle }: Props) {
  const { data: valuation, isLoading: valuationLoading } = useQuery<ValuationData>({
    queryKey: ['/api/vehicles', vehicle.id, 'valuation'],
    enabled: !!vehicle.id,
    retry: false,
  });

  const { data: profitability, isLoading: profitabilityLoading } = useQuery<ProfitabilityData>({
    queryKey: ['/api/vehicles', vehicle.id, 'profitability'],
    enabled: !!vehicle.id,
    retry: false,
  });

  const isLoading = valuationLoading || profitabilityLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Honduras Market Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  const profit = profitability?.estimatedProfit || 0;
  const isProfitable = profit > 500;
  const isBreakEven = profit >= -500 && profit <= 500;
  const isNegative = profit < -500;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Honduras Market Analysis
          </CardTitle>
          {isProfitable && (
            <Badge variant="default" className="gap-1">
              <TrendingUp className="h-3 w-3" />
              Profitable
            </Badge>
          )}
          {isNegative && (
            <Badge variant="destructive" className="gap-1">
              <TrendingDown className="h-3 w-3" />
              Loss
            </Badge>
          )}
          {isBreakEven && (
            <Badge variant="secondary" className="gap-1">
              Break-even
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {valuation && (
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
              <span className="text-sm text-muted-foreground">Honduras Market Value</span>
              <span className="font-mono font-semibold text-lg">
                L {valuation.hondurasMarketValue.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Confidence Level</span>
              <Badge variant="secondary">{valuation.confidenceLevel}</Badge>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Market Condition</span>
              <span className="font-medium">{valuation.marketCondition}</span>
            </div>
          </div>
        )}

        {profitability && (
          <>
            <div className="h-px bg-border" />
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Total Cost (USD)</span>
                <span className="font-mono font-medium">
                  ${profitability.totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Est. Revenue (USD)</span>
                <span className="font-mono font-medium text-success">
                  ${profitability.estimatedRevenue.toLocaleString()}
                </span>
              </div>
              <div className="h-px bg-border" />
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                <span className="font-medium">Est. Profit</span>
                <span className={`font-mono font-bold text-lg ${
                  isProfitable ? 'text-success' : isNegative ? 'text-destructive' : ''
                }`}>
                  ${profit.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Profit Margin</span>
                <span className={`font-mono font-medium ${
                  (profitability.profitMargin ?? 0) > 15 ? 'text-success' : 
                  (profitability.profitMargin ?? 0) < 0 ? 'text-destructive' : ''
                }`}>
                  {profitability.profitMargin != null ? profitability.profitMargin.toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>

            {!profitability.costsComplete && profitability.missingCosts && profitability.missingCosts.length > 0 && (
              <Alert className="border-warning/50 bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-warning text-sm">
                  <div className="font-medium mb-1">Incomplete cost data</div>
                  <div className="text-xs">Missing: {profitability.missingCosts.join(', ')}</div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {!valuation && !profitability && (
          <Alert>
            <AlertDescription className="text-sm">
              No Honduras market data available for this vehicle yet.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
