import { useState } from "react";
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
import { insertVehicleSchema, type InsertVehicle, type Shipment } from "@shared/schema";
import { Plus } from "lucide-react";

export function CreateVehicleDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const { data: shipments } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments"],
  });

  const form = useForm<InsertVehicle>({
    resolver: zodResolver(insertVehicleSchema),
    defaultValues: {
      year: new Date().getFullYear(),
      make: "",
      model: "",
      vin: "",
      purchasePrice: "0",
      purchaseDate: new Date(),
      status: "in_transit",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertVehicle) => {
      const res = await apiRequest("POST", "/api/vehicles", data);
      if (!res.ok) throw new Error("Failed to create vehicle");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/metrics"] });
      toast({ title: "Vehicle added successfully" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to add vehicle", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-vehicle">
          <Plus className="h-4 w-4 mr-2" />
          Add Vehicle
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Vehicle</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
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
                defaultValue={new Date().toISOString().split('T')[0]}
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
              <Label htmlFor="shipmentId">Assign to Shipment</Label>
              <Select
                onValueChange={(value) => form.setValue("shipmentId", value || undefined)}
              >
                <SelectTrigger data-testid="select-shipment">
                  <SelectValue placeholder="Select shipment (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {shipments?.map((shipment) => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      {shipment.shipmentNumber} - {shipment.route}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select
                defaultValue="in_transit"
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

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-vehicle">
              {createMutation.isPending ? "Adding..." : "Add Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
