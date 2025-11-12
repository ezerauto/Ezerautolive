import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertShipmentSchema, type InsertShipment } from "@shared/schema";
import { Plus } from "lucide-react";

export function CreateShipmentDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<InsertShipment>({
    resolver: zodResolver(insertShipmentSchema),
    defaultValues: {
      shipmentNumber: "",
      shipmentDate: new Date(),
      route: "",
      status: "in_transit",
      groundTransportCost: "0",
      customsBrokerFees: "0",
      oceanFreightCost: "0",
      importFees: "0",
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: InsertShipment) => {
      const res = await apiRequest("POST", "/api/shipments", data);
      if (!res.ok) throw new Error("Failed to create shipment");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments"] });
      toast({ title: "Shipment created successfully" });
      setOpen(false);
      form.reset();
    },
    onError: () => {
      toast({ title: "Failed to create shipment", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-new-shipment">
          <Plus className="h-4 w-4 mr-2" />
          New Shipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Shipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit((data) => createMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shipmentNumber">Shipment Number *</Label>
              <Input
                id="shipmentNumber"
                {...form.register("shipmentNumber")}
                placeholder="SHP-001"
                data-testid="input-shipment-number"
              />
              {form.formState.errors.shipmentNumber && (
                <p className="text-sm text-destructive mt-1">{form.formState.errors.shipmentNumber.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="shipmentDate">Shipment Date *</Label>
              <Input
                id="shipmentDate"
                type="date"
                {...form.register("shipmentDate", {
                  setValueAs: (v) => v ? new Date(v) : new Date()
                })}
                defaultValue={new Date().toISOString().split('T')[0]}
                data-testid="input-shipment-date"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="route">Route *</Label>
            <Input
              id="route"
              {...form.register("route")}
              placeholder="Miami, FL → San Pedro Sula, Honduras"
              data-testid="input-route"
            />
            {form.formState.errors.route && (
              <p className="text-sm text-destructive mt-1">{form.formState.errors.route.message}</p>
            )}
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
                <SelectItem value="arrived">Arrived</SelectItem>
                <SelectItem value="customs_cleared">Customs Cleared</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="groundTransportCost">Ground Transport Cost</Label>
              <Input
                id="groundTransportCost"
                type="number"
                step="0.01"
                {...form.register("groundTransportCost")}
                placeholder="0.00"
                data-testid="input-ground-cost"
              />
            </div>

            <div>
              <Label htmlFor="customsBrokerFees">Customs Broker Fees</Label>
              <Input
                id="customsBrokerFees"
                type="number"
                step="0.01"
                {...form.register("customsBrokerFees")}
                placeholder="0.00"
                data-testid="input-customs-fees"
              />
            </div>

            <div>
              <Label htmlFor="oceanFreightCost">Ocean Freight Cost</Label>
              <Input
                id="oceanFreightCost"
                type="number"
                step="0.01"
                {...form.register("oceanFreightCost")}
                placeholder="0.00"
                data-testid="input-ocean-cost"
              />
            </div>

            <div>
              <Label htmlFor="importFees">Import Fees</Label>
              <Input
                id="importFees"
                type="number"
                step="0.01"
                {...form.register("importFees")}
                placeholder="0.00"
                data-testid="input-import-fees"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending} data-testid="button-create-shipment">
              {createMutation.isPending ? "Creating..." : "Create Shipment"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
