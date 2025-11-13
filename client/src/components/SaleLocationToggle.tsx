import { useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Globe, Home } from "lucide-react";

interface SaleLocationToggleProps {
  vehicleId: string;
  currentLocation: string;
  size?: "sm" | "default";
}

export function SaleLocationToggle({ vehicleId, currentLocation, size = "default" }: SaleLocationToggleProps) {
  const { toast } = useToast();

  const updateLocationMutation = useMutation({
    mutationFn: async (newLocation: string) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicleId}`, { 
        saleLocation: newLocation 
      });
    },
    onSuccess: (_, newLocation) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });

      toast({
        title: "Sale location updated",
        description: `Vehicle marked for ${newLocation === 'export' ? 'export to Honduras' : 'domestic (US) sale'}`,
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update location",
        description: error.message || "An error occurred",
      });
    },
  });

  const isExport = currentLocation === 'export';
  const isPending = updateLocationMutation.isPending;

  if (size === "sm") {
    return (
      <Badge 
        variant="outline"
        className={`cursor-pointer hover-elevate ${isExport ? 'bg-indigo-50 border-indigo-200 text-indigo-700 dark:bg-indigo-950/20 dark:border-indigo-800 dark:text-indigo-300' : 'bg-green-50 border-green-200 text-green-700 dark:bg-green-950/20 dark:border-green-800 dark:text-green-300'}`}
        onClick={() => !isPending && updateLocationMutation.mutate(isExport ? 'domestic' : 'export')}
        data-testid={`badge-sale-location-${vehicleId}`}
      >
        {isExport ? <Globe className="h-3 w-3 mr-1" /> : <Home className="h-3 w-3 mr-1" />}
        {isExport ? 'Export' : 'Domestic'}
      </Badge>
    );
  }

  return (
    <div className="inline-flex rounded-lg border bg-background p-1" data-testid={`toggle-sale-location-${vehicleId}`}>
      <Button
        variant={isExport ? "secondary" : "ghost"}
        size="sm"
        onClick={() => !isPending && !isExport && updateLocationMutation.mutate('export')}
        disabled={isPending}
        className={`gap-2 ${isExport ? 'hover-elevate' : ''}`}
        data-testid={`button-location-export-${vehicleId}`}
      >
        <Globe className="h-4 w-4" />
        Export
      </Button>
      <Button
        variant={!isExport ? "secondary" : "ghost"}
        size="sm"
        onClick={() => !isPending && isExport && updateLocationMutation.mutate('domestic')}
        disabled={isPending}
        className={`gap-2 ${!isExport ? 'hover-elevate' : ''}`}
        data-testid={`button-location-domestic-${vehicleId}`}
      >
        <Home className="h-4 w-4" />
        Domestic
      </Button>
    </div>
  );
}
