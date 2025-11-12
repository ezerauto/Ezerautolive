import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Link } from "wouter";
import { Car, Truck, Package, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { CreateVehicleDialog } from "@/components/CreateVehicleDialog";
import { BulkImportDialog } from "@/components/BulkImportDialog";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Vehicle } from "@shared/schema";

const statusConfig = {
  in_transit: { label: "In Transit", icon: Truck, color: "bg-primary/10 text-primary" },
  in_stock: { label: "In Stock", icon: Package, color: "bg-warning/10 text-warning" },
  sold: { label: "Sold", icon: CheckCircle2, color: "bg-success/10 text-success" },
};

export default function Inventory() {
  const [filter, setFilter] = useState<string>("all");
  const queryKey = filter === "all" ? "/api/vehicles" : `/api/vehicles?filter=${filter}`;
  const { data: vehicles, isLoading } = useQuery<Vehicle[]>({
    queryKey: [queryKey],
  });
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/vehicles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      toast({
        title: "Vehicle deleted",
        description: "The vehicle has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to delete vehicle",
        description: error.message || "An error occurred",
      });
    },
  });

  const filteredVehicles = vehicles?.filter((v) => filter === "all" || v.status === filter);

  const calculateDaysInInventory = (dateArrived: string | Date | null) => {
    if (!dateArrived) return 0;
    const arrived = new Date(dateArrived);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - arrived.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-10 w-full mb-6" />
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-16 w-16 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">The Vault</h1>
          <p className="text-muted-foreground">Assets under our control</p>
        </div>
        <div className="flex gap-2">
          <BulkImportDialog />
          <CreateVehicleDialog />
        </div>
      </div>

      <Tabs value={filter} onValueChange={setFilter} className="mb-6">
        <TabsList>
          <TabsTrigger value="all" data-testid="tab-all">All Vehicles</TabsTrigger>
          <TabsTrigger value="in_transit" data-testid="tab-in-transit">In Transit</TabsTrigger>
          <TabsTrigger value="in_stock" data-testid="tab-in-stock">In Stock</TabsTrigger>
          <TabsTrigger value="sold" data-testid="tab-sold">Sold</TabsTrigger>
        </TabsList>
      </Tabs>

      {!filteredVehicles || filteredVehicles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Car className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No vehicles found</h3>
            <p className="text-sm text-muted-foreground mb-6">
              {filter === "all" ? "Add your first vehicle to get started" : `No vehicles with status "${filter}"`}
            </p>
            {filter === "all" && (
              <Button data-testid="button-add-first-vehicle" className="hover-elevate active-elevate-2">
                <Plus className="h-4 w-4 mr-2" />
                Add Vehicle
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Vehicle List</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold">VIN</TableHead>
                    <TableHead className="font-semibold text-right">Purchase Price</TableHead>
                    <TableHead className="font-semibold text-right">Target Price</TableHead>
                    <TableHead className="font-semibold text-right">Min Price</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-center">Days</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVehicles.map((vehicle) => {
                    const statusInfo = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.in_stock;
                    const StatusIcon = statusInfo.icon;
                    const daysInInventory = calculateDaysInInventory(vehicle.dateArrived);

                    return (
                      <TableRow
                        key={vehicle.id}
                        className="hover-elevate"
                        data-testid={`row-vehicle-${vehicle.id}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {vehicle.photoUrls && vehicle.photoUrls.length > 0 ? (
                              <img
                                src={vehicle.photoUrls[0]}
                                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                                className="h-12 w-12 rounded object-cover"
                              />
                            ) : (
                              <div className="h-12 w-12 rounded bg-muted flex items-center justify-center">
                                <Car className="h-6 w-6 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="font-medium" data-testid={`text-vehicle-name-${vehicle.id}`}>
                                {vehicle.year} {vehicle.make} {vehicle.model}
                              </div>
                              <div className="text-xs text-muted-foreground">{vehicle.color}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs" data-testid={`text-vin-${vehicle.id}`}>
                          {vehicle.vin.slice(-6)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${Number(vehicle.purchasePrice).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-success">
                          ${Number(vehicle.targetSalePrice || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-mono text-warning">
                          ${Number(vehicle.minimumPrice || 0).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center font-mono" data-testid={`text-days-${vehicle.id}`}>
                          {daysInInventory > 0 ? daysInInventory : '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link href={`/inventory/${vehicle.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                data-testid={`button-view-${vehicle.id}`}
                                className="hover-elevate active-elevate-2"
                              >
                                View
                              </Button>
                            </Link>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                if (confirm(`Delete ${vehicle.year} ${vehicle.make} ${vehicle.model}?`)) {
                                  deleteMutation.mutate(vehicle.id);
                                }
                              }}
                              data-testid={`button-delete-${vehicle.id}`}
                              className="hover-elevate active-elevate-2 text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
