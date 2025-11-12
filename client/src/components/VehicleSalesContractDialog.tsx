import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { SimpleUploader } from "@/components/SimpleUploader";
import type { Vehicle, Contract } from "@shared/schema";

const contractFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  parties: z.string().min(1, "Parties are required"),
  contractDate: z.string().min(1, "Contract date is required"),
  salePrice: z.string().min(1, "Sale price is required"),
  notes: z.string().optional(),
});

type ContractFormValues = z.infer<typeof contractFormSchema>;

interface VehicleSalesContractDialogProps {
  vehicle: Vehicle;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function VehicleSalesContractDialog({
  vehicle,
  open,
  onOpenChange,
}: VehicleSalesContractDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [contractId, setContractId] = useState<string | null>(null);
  const [showUploader, setShowUploader] = useState(false);

  const form = useForm<ContractFormValues>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: `Sale Contract - ${vehicle.year} ${vehicle.make} ${vehicle.model}`,
      parties: "Dominick Investments, ",
      contractDate: new Date().toISOString().split('T')[0],
      salePrice: vehicle.targetSalePrice || "",
      notes: "",
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (values: ContractFormValues) => {
      const partiesArray = values.parties.split(',').map(p => p.trim()).filter(Boolean);
      
      const response = await apiRequest("POST", `/api/vehicles/${vehicle.id}/contracts`, {
        title: values.title,
        type: "sale",
        status: "active",
        parties: partiesArray,
        contractDate: new Date(values.contractDate),
        salePrice: values.salePrice,
        notes: values.notes,
        relatedVehicleId: vehicle.id,
      });

      return await response.json();
    },
    onSuccess: (data) => {
      setContractId(data.id);
      setShowUploader(true);
      toast({
        title: "Contract created",
        description: "Now upload the signed contract document",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicle.id, "contracts"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create contract",
        variant: "destructive",
      });
    },
  });

  const updateContractMutation = useMutation({
    mutationFn: async ({ id, documentUrl }: { id: string; documentUrl: string }) => {
      const response = await apiRequest("PATCH", `/api/contracts/${id}`, { documentUrl });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Contract document uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/contracts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/vehicles", vehicle.id, "contracts"] });
      onOpenChange(false);
      setShowUploader(false);
      setContractId(null);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: ContractFormValues) => {
    createContractMutation.mutate(values);
  };

  const handleUploadComplete = (url: string) => {
    if (contractId) {
      updateContractMutation.mutate({ id: contractId, documentUrl: url });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-testid="dialog-vehicle-sales-contract">
        <DialogHeader>
          <DialogTitle>
            {showUploader ? "Upload Contract Document" : "Create Sales Contract"}
          </DialogTitle>
          <DialogDescription>
            {showUploader
              ? "Upload the signed sales contract document (PDF, JPEG, or PNG)"
              : `Create a sales contract for ${vehicle.year} ${vehicle.make} ${vehicle.model}`}
          </DialogDescription>
        </DialogHeader>

        {showUploader ? (
          <div className="py-4">
            <SimpleUploader
              directory={`vehicles/${vehicle.id}/contracts`}
              onUploadComplete={handleUploadComplete}
              allowedMimeTypes={["application/pdf", "image/jpeg", "image/png"]}
              maxFileSizeMB={10}
            />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Title</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parties"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parties (comma-separated)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="Seller Name, Buyer Name"
                        data-testid="input-parties"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contractDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contract Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-contract-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="salePrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sale Price</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          data-testid="input-sale-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        placeholder="Additional notes or details"
                        data-testid="input-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createContractMutation.isPending}
                  data-testid="button-create-contract"
                >
                  {createContractMutation.isPending ? "Creating..." : "Create & Upload Document"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
