import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, RefreshCw } from "lucide-react";

interface LempiraPricingCardProps {
  vehicleId: string;
  currentPriceUsd?: string | null;
  currentPriceHnl?: string | null;
}

export function LempiraPricingCard({ vehicleId, currentPriceUsd, currentPriceHnl }: LempiraPricingCardProps) {
  const { toast } = useToast();
  const [priceUsd, setPriceUsd] = useState(currentPriceUsd || "");
  const [priceHnl, setPriceHnl] = useState(currentPriceHnl || "");
  const [hasChanges, setHasChanges] = useState(false);

  const { data: fxRate } = useQuery<{ rate: string }>({
    queryKey: ["/api/fx/usd-hnl"],
  });

  const rate = fxRate ? parseFloat(fxRate.rate) : 24.5; // Default fallback rate

  useEffect(() => {
    setPriceUsd(currentPriceUsd || "");
    setPriceHnl(currentPriceHnl || "");
  }, [currentPriceUsd, currentPriceHnl]);

  const updatePricingMutation = useMutation({
    mutationFn: async (data: { targetSalePrice?: number; targetSalePriceHnl?: number }) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      setHasChanges(false);
      toast({
        title: "Pricing updated",
        description: "Sale prices have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update pricing",
        description: error.message || "An error occurred",
      });
    },
  });

  const handleUsdChange = (value: string) => {
    setPriceUsd(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      const hnlValue = (numValue * rate).toFixed(2);
      setPriceHnl(hnlValue);
    } else if (!value) {
      setPriceHnl("");
    }
    setHasChanges(true);
  };

  const handleHnlChange = (value: string) => {
    setPriceHnl(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      const usdValue = (numValue / rate).toFixed(2);
      setPriceUsd(usdValue);
    } else if (!value) {
      setPriceUsd("");
    }
    setHasChanges(true);
  };

  const handleSave = () => {
    const usdNum = parseFloat(priceUsd);
    const hnlNum = parseFloat(priceHnl);
    
    updatePricingMutation.mutate({
      targetSalePrice: isNaN(usdNum) ? undefined : usdNum,
      targetSalePriceHnl: isNaN(hnlNum) ? undefined : hnlNum,
    });
  };

  return (
    <Card data-testid={`card-lempira-pricing-${vehicleId}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          Sale Pricing
        </CardTitle>
        {hasChanges && (
          <Button
            onClick={handleSave}
            size="sm"
            disabled={updatePricingMutation.isPending}
            data-testid={`button-save-pricing-${vehicleId}`}
          >
            <RefreshCw className="h-3 w-3 mr-2" />
            {updatePricingMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor={`price-usd-${vehicleId}`}>Target Price (USD)</Label>
          <Input
            id={`price-usd-${vehicleId}`}
            type="number"
            step="0.01"
            value={priceUsd}
            onChange={(e) => handleUsdChange(e.target.value)}
            placeholder="0.00"
            data-testid={`input-price-usd-${vehicleId}`}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor={`price-hnl-${vehicleId}`} className="flex items-center justify-between">
            <span>Target Price (HNL)</span>
            <span className="text-xs text-muted-foreground">Rate: {rate.toFixed(2)}</span>
          </Label>
          <Input
            id={`price-hnl-${vehicleId}`}
            type="number"
            step="0.01"
            value={priceHnl}
            onChange={(e) => handleHnlChange(e.target.value)}
            placeholder="0.00"
            data-testid={`input-price-hnl-${vehicleId}`}
          />
        </div>
        {hasChanges && (
          <p className="text-xs text-muted-foreground">
            Prices sync automatically using current exchange rate
          </p>
        )}
      </CardContent>
    </Card>
  );
}
