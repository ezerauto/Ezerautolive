import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Receipt, FileText } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SimpleUploader } from "@/components/SimpleUploader";
import type { Cost } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  vehicle_purchase: "Vehicle Purchase",
  ground_transport: "Ground Transport",
  customs_broker: "Customs Broker",
  ocean_freight: "Ocean Freight",
  import_fees: "Import Fees",
  repairs: "Repairs",
  storage: "Storage",
  inspection: "Inspection",
  other: "Other",
};

const costFormSchema = z.object({
  category: z.string().min(1, "Category is required"),
  amount: z.string().min(1, "Amount is required"),
  costDate: z.coerce.date(),
  vendor: z.string().optional(),
  associationType: z.enum(["none", "shipment", "vehicle"]).default("none"),
  shipmentId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  // Ensure only one of shipmentId or vehicleId is set
  if (data.shipmentId && data.vehicleId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Cannot associate with both shipment and vehicle",
      path: ["associationType"],
    });
  }
  
  // Require shipmentId when association type is "shipment"
  if (data.associationType === "shipment" && !data.shipmentId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a shipment",
      path: ["shipmentId"],
    });
  }
  
  // Require vehicleId when association type is "vehicle"
  if (data.associationType === "vehicle" && !data.vehicleId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a vehicle",
      path: ["vehicleId"],
    });
  }
});

type CostFormData = z.infer<typeof costFormSchema>;

export default function Costs() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const { data: costs, isLoading } = useQuery<Cost[]>({
    queryKey: ["/api/costs"],
  });

  const { data: shipments } = useQuery<any[]>({
    queryKey: ["/api/shipments"],
  });

  const { data: vehicles } = useQuery<any[]>({
    queryKey: ["/api/vehicles"],
  });

  const form = useForm<CostFormData>({
    resolver: zodResolver(costFormSchema),
    defaultValues: {
      category: "",
      amount: "",
      costDate: new Date(),
      vendor: "",
      associationType: "none",
      shipmentId: null,
      vehicleId: null,
      notes: "",
    },
  });

  const createCostMutation = useMutation({
    mutationFn: async (data: CostFormData) => {
      // Guard against null IDs when association type is selected
      const finalShipmentId = data.associationType === "shipment" ? data.shipmentId : null;
      const finalVehicleId = data.associationType === "vehicle" ? data.vehicleId : null;
      
      // Additional safety check
      if (data.associationType === "shipment" && !finalShipmentId) {
        throw new Error("Shipment must be selected");
      }
      if (data.associationType === "vehicle" && !finalVehicleId) {
        throw new Error("Vehicle must be selected");
      }
      
      return apiRequest("POST", "/api/costs", {
        category: data.category,
        amount: data.amount,
        costDate: data.costDate,
        vendor: data.vendor || null,
        shipmentId: finalShipmentId,
        vehicleId: finalVehicleId,
        receiptUrl: receiptUrl,
        notes: data.notes || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/costs"] });
      setDialogOpen(false);
      form.reset();
      setReceiptUrl(null);
      toast({
        title: "Success",
        description: "Cost recorded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to record cost",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CostFormData) => {
    createCostMutation.mutate(data);
  };

  const handleOpenDialog = () => {
    form.reset();
    setReceiptUrl(null);
    setDialogOpen(true);
  };

  const associationType = form.watch("associationType");

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
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
          <h1 className="text-3xl font-bold mb-2">The Ledger</h1>
          <p className="text-muted-foreground">All expenses and receipts</p>
        </div>
        <Button onClick={handleOpenDialog} data-testid="button-upload-receipt" className="hover-elevate active-elevate-2">
          <Plus className="h-4 w-4 mr-2" />
          Record Cost
        </Button>
      </div>

      {!costs || costs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No receipts uploaded</h3>
            <p className="text-sm text-muted-foreground mb-6">Start documenting costs by uploading receipts</p>
            <Button onClick={handleOpenDialog} data-testid="button-upload-first-receipt" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              Record First Cost
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Receipt Library</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Category</TableHead>
                    <TableHead className="font-semibold">Vendor</TableHead>
                    <TableHead className="font-semibold text-right">Amount</TableHead>
                    <TableHead className="font-semibold">Related To</TableHead>
                    <TableHead className="font-semibold">File</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {costs.map((cost) => (
                    <TableRow
                      key={cost.id}
                      className="hover-elevate"
                      data-testid={`row-cost-${cost.id}`}
                    >
                      <TableCell className="text-muted-foreground">
                        {new Date(cost.costDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>{categoryLabels[cost.category] || cost.category}</TableCell>
                      <TableCell>{cost.vendor || '-'}</TableCell>
                      <TableCell className="text-right font-mono font-semibold" data-testid={`text-amount-${cost.id}`}>
                        ${Number(cost.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {cost.shipmentId ? `Shipment` : cost.vehicleId ? `Vehicle` : '-'}
                      </TableCell>
                      <TableCell>
                        {cost.receiptUrl ? (
                          <a
                            href={cost.receiptUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-receipt-${cost.id}`}
                              className="hover-elevate active-elevate-2"
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              View
                            </Button>
                          </a>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          data-testid={`button-edit-${cost.id}`}
                          className="hover-elevate active-elevate-2"
                        >
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-record-cost">
          <DialogHeader>
            <DialogTitle>Record Cost</DialogTitle>
            <DialogDescription>
              Add a new cost entry with receipt documentation
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-category">
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(categoryLabels).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount ($)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          data-testid="input-amount"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="costDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          data-testid="input-date"
                          value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(new Date(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vendor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vendor (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Vendor name" data-testid="input-vendor" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="associationType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associate With</FormLabel>
                      <FormControl>
                        <div className="flex gap-4" data-testid="radio-association-type">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="none"
                              checked={field.value === "none"}
                              onChange={() => {
                                field.onChange("none");
                                form.setValue("shipmentId", null);
                                form.setValue("vehicleId", null);
                              }}
                            />
                            <span>None</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="shipment"
                              checked={field.value === "shipment"}
                              onChange={() => {
                                field.onChange("shipment");
                                form.setValue("vehicleId", null);
                              }}
                            />
                            <span>Shipment</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="radio"
                              value="vehicle"
                              checked={field.value === "vehicle"}
                              onChange={() => {
                                field.onChange("vehicle");
                                form.setValue("shipmentId", null);
                              }}
                            />
                            <span>Vehicle</span>
                          </label>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {associationType === "shipment" && (
                  <FormField
                    control={form.control}
                    name="shipmentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Shipment</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-shipment">
                              <SelectValue placeholder="Select shipment" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {shipments?.map((shipment: any) => (
                              <SelectItem key={shipment.id} value={shipment.id}>
                                {shipment.shipmentNumber} - {shipment.route}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {associationType === "vehicle" && (
                  <FormField
                    control={form.control}
                    name="vehicleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Vehicle</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || undefined}>
                          <FormControl>
                            <SelectTrigger data-testid="select-vehicle">
                              <SelectValue placeholder="Select vehicle" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {vehicles?.map((vehicle: any) => (
                              <SelectItem key={vehicle.id} value={vehicle.id}>
                                {vehicle.year} {vehicle.make} {vehicle.model} ({vehicle.vin})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional notes..."
                        className="min-h-[80px]"
                        data-testid="input-notes"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <FormLabel>Receipt/Invoice (Optional)</FormLabel>
                <SimpleUploader
                  directory="costs/receipts"
                  onUploadComplete={(url) => setReceiptUrl(url)}
                  allowedMimeTypes={["application/pdf", "image/jpeg", "image/png"]}
                  maxFileSizeMB={10}
                />
                {receiptUrl && (
                  <p className="text-sm text-success">Receipt uploaded successfully</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createCostMutation.isPending}
                  data-testid="button-submit-cost"
                  className="hover-elevate active-elevate-2"
                >
                  {createCostMutation.isPending ? "Recording..." : "Record Cost"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
