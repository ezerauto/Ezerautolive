import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Truck, Package, CheckCircle2 } from "lucide-react";
import type { Vehicle } from "@shared/schema";

const statusConfig = {
  in_transit: { label: "In Transit", icon: Truck, color: "bg-primary/10 text-primary" },
  in_stock: { label: "In Stock", icon: Package, color: "bg-warning/10 text-warning" },
  sold: { label: "Sold", icon: CheckCircle2, color: "bg-success/10 text-success" },
};

interface VehicleStatusDropdownProps {
  vehicleId: string;
  currentStatus: string;
  variant?: "dropdown" | "badge";
}

export function VehicleStatusDropdown({ vehicleId, currentStatus, variant = "dropdown" }: VehicleStatusDropdownProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const { data: contracts } = useQuery<any[]>({
    queryKey: [`/api/vehicles/${vehicleId}/contracts`],
    enabled: isOpen,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: string) => {
      if (newStatus === "sold") {
        const salesContract = contracts?.find(c => c.type === "sale_closure");
        
        if (!salesContract) {
          throw new Error("REQUIRES_CONTRACT");
        }
      }

      return apiRequest("PATCH", `/api/vehicles/${vehicleId}`, { 
        status: newStatus 
      });
    },
    onSuccess: (_, newStatus) => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && (
            key.startsWith("/api/vehicles") ||
            key.startsWith("/api/dashboard") ||
            key.startsWith("/api/analytics")
          );
        }
      });

      const statusInfo = statusConfig[newStatus as keyof typeof statusConfig];
      toast({
        title: "Status updated",
        description: `Vehicle status changed to ${statusInfo.label}`,
      });
    },
    onError: (error: any) => {
      if (error.message === "REQUIRES_CONTRACT") {
        toast({
          variant: "destructive",
          title: "Sales Contract Required",
          description: "Please create a sales contract before marking this vehicle as sold. This ensures proper documentation and profit distribution.",
          duration: 6000,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Failed to update status",
          description: error.message || "An error occurred",
        });
      }
    },
  });

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === currentStatus) return;
    updateStatusMutation.mutate(newStatus);
  };

  if (variant === "badge") {
    const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.in_stock;
    const StatusIcon = statusInfo.icon;
    
    return (
      <Badge 
        variant="secondary" 
        className={`${statusInfo.color} uppercase text-xs cursor-pointer hover-elevate`}
        onClick={() => setIsOpen(true)}
        data-testid={`badge-status-${vehicleId}`}
      >
        <StatusIcon className="h-3 w-3 mr-1" />
        {statusInfo.label}
      </Badge>
    );
  }

  return (
    <Select
      value={currentStatus}
      onValueChange={handleStatusChange}
      disabled={updateStatusMutation.isPending}
      onOpenChange={setIsOpen}
      data-testid={`select-vehicle-status-${vehicleId}`}
    >
      <SelectTrigger className="w-[140px]">
        <SelectValue>
          {(() => {
            const statusInfo = statusConfig[currentStatus as keyof typeof statusConfig] || statusConfig.in_stock;
            const StatusIcon = statusInfo.icon;
            return (
              <div className="flex items-center gap-2">
                <StatusIcon className="h-3 w-3" />
                <span className="text-xs">{statusInfo.label}</span>
              </div>
            );
          })()}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="in_transit" data-testid={`option-in-transit-${vehicleId}`}>
          <div className="flex items-center gap-2">
            <Truck className="h-3 w-3" />
            <span>In Transit</span>
          </div>
        </SelectItem>
        <SelectItem value="in_stock" data-testid={`option-in-stock-${vehicleId}`}>
          <div className="flex items-center gap-2">
            <Package className="h-3 w-3" />
            <span>In Stock</span>
          </div>
        </SelectItem>
        <SelectItem value="sold" data-testid={`option-sold-${vehicleId}`}>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-3 w-3" />
            <span>Sold</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}
