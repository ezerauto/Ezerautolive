import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { updateVehicleSchema, type UpdateVehicle, type Vehicle, type Shipment } from "@shared/schema";
import { Pencil } from "lucide-react";

interface EditVehicleDialogProps {
  vehicle: Vehicle;
}

export function EditVehicleDialog({ vehicle }: EditVehicleDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: shipments } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments"],
  });

  const form = useForm<UpdateVehicle>({
    resolver: zodResolver(updateVehicleSchema),
  });

  // Helper to format date for date input (yyyy-MM-dd)
  const formatDateForInput = (date: Date | string | null | undefined): any => {
    if (!date) return undefined;
    const d = new Date(date);
    return d.toISOString().split('T')[0] as any;
  };

  // Reset form when dialog opens with vehicle data
  useEffect(() => {
    if (open && vehicle) {
      form.reset({
        year: vehicle.year,
        make: vehicle.make,
        model: vehicle.model,
        vin: vehicle.vin,
        color: vehicle.color || undefined,
        odometer: vehicle.odometer || undefined,
        purchasePrice: vehicle.purchasePrice,
        purchaseDate: formatDateForInput(vehicle.purchaseDate),
        purchaseLocation: vehicle.purchaseLocation || undefined,
        status: vehicle.status,
        shipmentId: vehicle.shipmentId || undefined,
        targetSalePrice: vehicle.targetSalePrice || undefined,
        minimumPrice: vehicle.minimumPrice || undefined,
        actualSalePrice: vehicle.actualSalePrice || undefined,
        saleDate: formatDateForInput(vehicle.saleDate),
        buyerName: vehicle.buyerName || undefined,
        buyerId: vehicle.buyerId || undefined,
        dateArrived: formatDateForInput(vehicle.dateArrived),
        dateShipped: formatDateForInput(vehicle.dateShipped),
      });
    }
  }, [open, vehicle, form]);

  const updateMutation = useMutation({
    mutationFn: async (data: UpdateVehicle) => {
      const res = await apiRequest("PATCH", `/api/vehicles/${vehicle.id}`, data);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to update vehicle");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({ title: "Vehicle updated successfully" });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to update vehicle", variant: "destructive" });
    },
  });

  // Watch current values for controlled selects
  const currentStatus = form.watch("status");
  const currentShipmentId = form.watch("shipmentId");

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-edit-vehicle">
          <Pencil className="h-4 w-4 mr-2" />
          Edit Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => {
          updateMutation.mutate(data);
        }, (errors) => {
          console.log("Validation errors:", errors);
          toast({ title: "Please fix validation errors", variant: "destructive" });
        })} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year *</Label>
              <Input
                id="year"
                type="number"
                {...form.register("year", { valueAsNumber: true })}
                placeholder="2024"
                data-testid="input-year"
              />
              {form.formState.errors.year && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.year.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="make">Make *</Label>
              <Input
                id="make"
                {...form.register("make")}
                placeholder="Toyota"
                data-testid="input-make"
              />
              {form.formState.errors.make && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.make.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="model">Model *</Label>
              <Input
                id="model"
                {...form.register("model")}
                placeholder="Camry"
                data-testid="input-model"
              />
              {form.formState.errors.model && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.model.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="vin">VIN *</Label>
              <Input
                id="vin"
                {...form.register("vin")}
                placeholder="1HGBH41JXMN109186"
                maxLength={17}
                data-testid="input-vin"
              />
              {form.formState.errors.vin && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.vin.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="color">Color</Label>
              <Input
                id="color"
                {...form.register("color")}
                placeholder="Silver"
                data-testid="input-color"
              />
            </div>

            <div>
              <Label htmlFor="odometer">Odometer (miles)</Label>
              <Input
                id="odometer"
                type="number"
                {...form.register("odometer", { valueAsNumber: true })}
                placeholder="50000"
                data-testid="input-odometer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="purchasePrice">Purchase Price *</Label>
              <Input
                id="purchasePrice"
                type="number"
                step="0.01"
                {...form.register("purchasePrice")}
                placeholder="15000.00"
                data-testid="input-purchase-price"
              />
              {form.formState.errors.purchasePrice && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.purchasePrice.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="purchaseDate">Purchase Date *</Label>
              <Input
                id="purchaseDate"
                type="date"
                {...form.register("purchaseDate", {
                  setValueAs: (v) => v ? new Date(v) : new Date()
                })}
                data-testid="input-purchase-date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="purchaseLocation">Purchase Location</Label>
            <Input
              id="purchaseLocation"
              {...form.register("purchaseLocation")}
              placeholder="Miami Auto Auction"
              data-testid="input-purchase-location"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="targetSalePrice">Target Sale Price</Label>
              <Input
                id="targetSalePrice"
                type="number"
                step="0.01"
                {...form.register("targetSalePrice")}
                placeholder="25000.00"
                data-testid="input-target-price"
              />
            </div>

            <div>
              <Label htmlFor="minimumPrice">Minimum Price</Label>
              <Input
                id="minimumPrice"
                type="number"
                step="0.01"
                {...form.register("minimumPrice")}
                placeholder="22000.00"
                data-testid="input-minimum-price"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipmentId">Assign to Shipment</Label>
              <Select
                value={currentShipmentId || "none"}
                onValueChange={(value) => form.setValue("shipmentId", value === "none" ? undefined : value)}
              >
                <SelectTrigger data-testid="select-shipment">
                  <SelectValue placeholder="Select shipment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {shipments?.map((shipment) => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      {shipment.shipmentNumber} - {shipment.route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status *</Label>
              <Select
                value={currentStatus}
                onValueChange={(value) => form.setValue("status", value)}
              >
                <SelectTrigger data-testid="select-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_transit">In Transit</SelectItem>
                  <SelectItem value="in_stock">In Stock</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {currentStatus === 'sold' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="actualSalePrice">Actual Sale Price</Label>
                  <Input
                    id="actualSalePrice"
                    type="number"
                    step="0.01"
                    {...form.register("actualSalePrice")}
                    placeholder="24500.00"
                    data-testid="input-actual-sale-price"
                  />
                </div>

                <div>
                  <Label htmlFor="saleDate">Sale Date</Label>
                  <Input
                    id="saleDate"
                    type="date"
                    {...form.register("saleDate", {
                      setValueAs: (v) => v ? new Date(v) : undefined
                    })}
                    data-testid="input-sale-date"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="buyerName">Buyer Name</Label>
                  <Input
                    id="buyerName"
                    {...form.register("buyerName")}
                    placeholder="John Doe"
                    data-testid="input-buyer-name"
                  />
                </div>

                <div>
                  <Label htmlFor="buyerId">Buyer ID</Label>
                  <Input
                    id="buyerId"
                    {...form.register("buyerId")}
                    placeholder="ID12345"
                    data-testid="input-buyer-id"
                  />
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel-edit">
              Cancel
            </Button>
            <Button type="submit" disabled={updateMutation.isPending} data-testid="button-save-vehicle">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
