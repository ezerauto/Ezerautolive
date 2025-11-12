import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FileText, CheckCircle, AlertCircle, Upload, ExternalLink, Trash2 } from "lucide-react";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { SimpleUploader } from "@/components/SimpleUploader";

type Contract = {
  id: string;
  title: string;
  type: string;
  status: string;
  parties: string[] | null;
  contractDate: string;
  documentUrl: string | null;
  notes: string | null;
  createdAt: string;
  relatedShipmentId: string | null;
  relatedVehicleId: string | null;
};

const contractFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  parties: z.string().optional(),
  contractDate: z.coerce.date(),
  notes: z.string().optional(),
});

type ContractFormData = z.infer<typeof contractFormSchema>;

type ContractType = {
  type: 'purchase_agreement' | 'inspection' | 'sale';
  title: string;
  description: string;
  icon: typeof FileText;
};

const CONTRACT_TYPES: ContractType[] = [
  {
    type: 'purchase_agreement',
    title: 'Purchase Agreement',
    description: 'Contract for agreed upon price of vehicles',
    icon: FileText,
  },
  {
    type: 'inspection',
    title: 'Inspection Certificate',
    description: 'Confirms vehicles arrived in good condition',
    icon: CheckCircle,
  },
  {
    type: 'sale',
    title: 'Sale Contracts',
    description: 'Individual sale contracts for each vehicle (managed per vehicle)',
    icon: FileText,
  },
];

type Vehicle = {
  id: string;
  vin: string;
  make: string;
  model: string;
  year: number;
  shipmentId: string;
};

export function ShipmentContracts({ shipmentId }: { shipmentId: string }) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<ContractType | null>(null);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);

  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/shipments", shipmentId, "contracts"],
  });

  const { data: vehicles, isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/shipments", shipmentId, "vehicles"],
  });

  const form = useForm<ContractFormData>({
    resolver: zodResolver(contractFormSchema),
    defaultValues: {
      title: "",
      parties: "",
      contractDate: new Date(),
      notes: "",
    },
  });

  const createContractMutation = useMutation({
    mutationFn: async (data: ContractFormData & { type: string }) => {
      const partiesArray = data.parties
        ? data.parties.split(',').map(p => p.trim()).filter(Boolean)
        : [];

      return apiRequest("POST", `/api/shipments/${shipmentId}/contracts`, {
        ...data,
        parties: partiesArray.length > 0 ? partiesArray : null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", shipmentId, "contracts"] });
      setDialogOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Contract created successfully",
      });
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
      return apiRequest("PATCH", `/api/contracts/${id}`, { documentUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", shipmentId, "contracts"] });
      setUploadDialogOpen(false);
      setSelectedContract(null);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const deleteContractMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/contracts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", shipmentId, "contracts"] });
      toast({
        title: "Success",
        description: "Contract deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete contract",
        variant: "destructive",
      });
    },
  });

  const handleCreateContract = (type: ContractType) => {
    setSelectedType(type);
    form.setValue("title", type.title);
    setDialogOpen(true);
  };

  const handleUploadDocument = (contract: Contract) => {
    setSelectedContract(contract);
    setUploadDialogOpen(true);
  };

  const onSubmit = (data: ContractFormData) => {
    if (!selectedType) return;
    createContractMutation.mutate({ ...data, type: selectedType.type });
  };

  if (isLoading) {
    return (
      <div>
        <h3 className="font-semibold mb-4">Shipment Contracts</h3>
        <Skeleton className="h-32" />
      </div>
    );
  }

  const getContractForType = (type: string) => {
    return contracts?.find((c) => c.type === type);
  };

  return (
    <div>
      <h3 className="font-semibold mb-4">Shipment Contracts</h3>
      
      <div className="space-y-4">
        {CONTRACT_TYPES.map((contractType) => {
          // Special rendering for sale contracts (per-vehicle)
          if (contractType.type === 'sale') {
            const Icon = contractType.icon;
            const vehicleCount = vehicles?.length || 0;
            
            // Get all sale contracts and create a map by vehicleId
            const saleContracts = contracts?.filter(c => c.type === 'sale') || [];
            const contractsByVehicle = new Map(
              saleContracts.map(c => [c.relatedVehicleId, c])
            );
            
            // Count vehicles with completed sale contracts
            const completedCount = vehicles?.filter(v => {
              const contract = contractsByVehicle.get(v.id);
              return contract && contract.documentUrl;
            }).length || 0;
            
            return (
              <div
                key={contractType.type}
                className="flex items-start gap-4 p-4 rounded-lg border"
                data-testid={`contract-${contractType.type}`}
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  completedCount > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-medium">{contractType.title}</h4>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {completedCount}/{vehicleCount} Completed
                      </Badge>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-3">
                    {contractType.description}
                  </p>
                  
                  {vehiclesLoading ? (
                    <Skeleton className="h-16" />
                  ) : vehicleCount > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Sale contracts are managed per vehicle. Click on a vehicle to view or create its sale contract:
                      </p>
                      <div className="space-y-1">
                        {vehicles?.map((vehicle) => {
                          const vehicleContract = contractsByVehicle.get(vehicle.id);
                          const hasDocument = vehicleContract?.documentUrl;
                          
                          return (
                            <a
                              key={vehicle.id}
                              href={`/vehicles/${vehicle.id}`}
                              className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-foreground border"
                              data-testid={`link-vehicle-${vehicle.id}`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <span className="font-medium text-sm">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </span>
                                {vehicleContract ? (
                                  hasDocument ? (
                                    <Badge variant="secondary" className="bg-success/10 text-success text-xs">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Complete
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="bg-warning/10 text-warning text-xs">
                                      <AlertCircle className="h-3 w-3 mr-1" />
                                      Pending Document
                                    </Badge>
                                  )
                                ) : (
                                  <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                                    <AlertCircle className="h-3 w-3 mr-1" />
                                    No Contract
                                  </Badge>
                                )}
                              </div>
                              <ExternalLink className="h-4 w-4 flex-shrink-0" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No vehicles in this shipment yet. Add vehicles to create sale contracts.
                    </p>
                  )}
                </div>
              </div>
            );
          }
          
          // Normal rendering for shipment-level contracts (purchase_agreement, inspection)
          const existingContract = getContractForType(contractType.type);
          const Icon = contractType.icon;
          
          return (
            <div
              key={contractType.type}
              className="flex items-start gap-4 p-4 rounded-lg border"
              data-testid={`contract-${contractType.type}`}
            >
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                existingContract ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
              }`}>
                <Icon className="h-5 w-5" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className="font-medium">{contractType.title}</h4>
                  {existingContract ? (
                    <Badge variant="secondary" className="bg-success/10 text-success">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="bg-warning/10 text-warning">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Pending
                    </Badge>
                  )}
                </div>
                
                <p className="text-sm text-muted-foreground mb-3">
                  {contractType.description}
                </p>
                
                {existingContract ? (
                  <div className="space-y-2">
                    <div className="text-sm">
                      <span className="text-muted-foreground">Created: </span>
                      <span className="font-medium">
                        {new Date(existingContract.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {existingContract.documentUrl ? (
                      <a
                        href={existingContract.documentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-primary hover:underline"
                        data-testid={`link-view-document-${contractType.type}`}
                      >
                        <FileText className="h-4 w-4" />
                        View Document
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUploadDocument(existingContract)}
                        data-testid={`button-upload-document-${contractType.type}`}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this contract?")) {
                          deleteContractMutation.mutate(existingContract.id);
                        }
                      }}
                      data-testid={`button-delete-${contractType.type}`}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  </div>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => handleCreateContract(contractType)}
                    data-testid={`button-create-${contractType.type}`}
                  >
                    Create Contract
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-create-contract">
          <DialogHeader>
            <DialogTitle>Create {selectedType?.title}</DialogTitle>
            <DialogDescription>{selectedType?.description}</DialogDescription>
          </DialogHeader>
          
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
                        placeholder="Dominick Investments, Tony Auto Dealer"
                        data-testid="input-parties"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="contractDate"
                render={({ field }) => {
                  let dateValue = '';
                  if (typeof field.value === 'string') {
                    dateValue = field.value;
                  } else if (field.value instanceof Date && !isNaN(field.value.getTime())) {
                    dateValue = field.value.toISOString().split('T')[0];
                  }
                  
                  return (
                    <FormItem>
                      <FormLabel>Contract Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={dateValue}
                          onChange={(e) => field.onChange(e.target.value)}
                          data-testid="input-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />
              
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-notes" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
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
                  disabled={createContractMutation.isPending}
                  data-testid="button-submit"
                >
                  {createContractMutation.isPending ? "Creating..." : "Create Contract"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent data-testid="dialog-upload-document">
          <DialogHeader>
            <DialogTitle>Upload Document</DialogTitle>
            <DialogDescription>
              Upload the signed contract document
            </DialogDescription>
          </DialogHeader>
          
          <SimpleUploader
            directory={`shipments/${shipmentId}/contracts`}
            onUploadComplete={(url) => {
              if (selectedContract) {
                updateContractMutation.mutate({
                  id: selectedContract.id,
                  documentUrl: url,
                });
              }
            }}
            allowedMimeTypes={["application/pdf", "image/jpeg", "image/png"]}
            maxFileSizeMB={10}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
