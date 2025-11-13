import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Car, Truck, Package, CheckCircle2, FileText, AlertCircle } from "lucide-react";
import type { Vehicle, Contract } from "@shared/schema";
import { EditVehicleDialog } from "@/components/EditVehicleDialog";
import { VehicleSalesContractDialog } from "@/components/VehicleSalesContractDialog";
import { VehicleStatusDropdown } from "@/components/VehicleStatusDropdown";
import { VehicleWorkflowStepper } from "@/components/VehicleWorkflowStepper";
import { ExportChecklistCard } from "@/components/ExportChecklistCard";
import { ValuationProfitabilityCard } from "@/components/ValuationProfitabilityCard";

const statusConfig = {
  in_transit: { label: "In Transit", icon: Truck, color: "bg-primary/10 text-primary" },
  in_stock: { label: "In Stock", icon: Package, color: "bg-warning/10 text-warning" },
  sold: { label: "Sold", icon: CheckCircle2, color: "bg-success/10 text-success" },
};

export default function VehicleDetail() {
  const { id } = useParams<{ id: string }>();
  const [contractDialogOpen, setContractDialogOpen] = useState(false);
  
  const { data: vehicle, isLoading } = useQuery<Vehicle>({
    queryKey: ["/api/vehicles", id],
  });

  const { data: contracts, isLoading: contractsLoading } = useQuery<Contract[]>({
    queryKey: ["/api/vehicles", id, "contracts"],
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2].map((i) => (
            <Card key={i} className={i === 1 ? "lg:col-span-2" : ""}>
              <CardContent className="p-6">
                <Skeleton className="h-48" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-semibold mb-2">Vehicle not found</h3>
            <p className="text-muted-foreground mb-6">The vehicle you're looking for doesn't exist</p>
            <Link href="/inventory">
              <Button>Back to Inventory</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.in_stock;
  const StatusIcon = statusInfo.icon;
  const daysInInventory = vehicle.dateArrived 
    ? Math.ceil((Date.now() - new Date(vehicle.dateArrived).getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const salesContract = contracts?.find(c => c.type === 'sale');
  const hasSalesContract = !!salesContract;
  const hasContractDocument = !!(salesContract?.documentUrl);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/inventory">
          <Button variant="ghost" className="mb-4 hover-elevate active-elevate-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Inventory
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">{vehicle.year} {vehicle.make} {vehicle.model}</h1>
            <p className="text-muted-foreground">VIN: {vehicle.vin}</p>
          </div>
          <div className="flex items-center gap-3">
            <EditVehicleDialog vehicle={vehicle} />
            <VehicleStatusDropdown
              vehicleId={vehicle.id}
              currentStatus={vehicle.status}
            />
          </div>
        </div>

        {vehicle.status === 'in_stock' && !hasSalesContract && (
          <Alert className="mt-4 border-warning/50 bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-warning">Sales contract required before marking vehicle as sold</span>
              <Button
                onClick={() => setContractDialogOpen(true)}
                size="sm"
                data-testid="button-create-sales-contract"
                className="hover-elevate active-elevate-2"
              >
                <FileText className="h-4 w-4 mr-2" />
                Create Sales Contract
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {vehicle.status === 'in_stock' && hasSalesContract && !hasContractDocument && (
          <Alert className="mt-4 border-warning/50 bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              Sales contract created but document not uploaded. Upload document before marking as sold.
            </AlertDescription>
          </Alert>
        )}

        {vehicle.status === 'in_stock' && hasSalesContract && hasContractDocument && (
          <Alert className="mt-4 border-success/50 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              ✓ Sales contract ready. Vehicle can be marked as sold when ready.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <VehicleSalesContractDialog
        vehicle={vehicle}
        open={contractDialogOpen}
        onOpenChange={setContractDialogOpen}
      />

      <div className="mb-6">
        <VehicleWorkflowStepper vehicle={vehicle} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Vehicle Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {vehicle.photoUrls && vehicle.photoUrls.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {vehicle.photoUrls.slice(0, 4).map((url, idx) => (
                  <img
                    key={idx}
                    src={url}
                    alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-48 bg-muted rounded-lg">
                <Car className="h-16 w-16 text-muted-foreground" />
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Year</p>
                <p className="font-medium">{vehicle.year}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Make</p>
                <p className="font-medium">{vehicle.make}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Model</p>
                <p className="font-medium">{vehicle.model}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Color</p>
                <p className="font-medium">{vehicle.color || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Odometer</p>
                <p className="font-medium font-mono">{vehicle.odometer?.toLocaleString() || '-'} mi</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Days in Inventory</p>
                <p className="font-medium font-mono">{daysInInventory > 0 ? daysInInventory : '-'}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Pricing</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Purchase Price</span>
                  <span className="font-mono font-medium">${Number(vehicle.purchasePrice).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Target Sale Price</span>
                  <span className="font-mono font-medium text-success">${Number(vehicle.targetSalePrice || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Minimum Price (90%)</span>
                  <span className="font-mono font-medium text-warning">${Number(vehicle.minimumPrice || 0).toLocaleString()}</span>
                </div>
                {vehicle.status === 'sold' && vehicle.actualSalePrice && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center font-semibold text-lg">
                      <span>Actual Sale Price</span>
                      <span className="font-mono text-success">${Number(vehicle.actualSalePrice).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Gross Profit</span>
                      <span className="font-mono font-semibold text-success">
                        ${(Number(vehicle.actualSalePrice) - Number(vehicle.purchasePrice)).toLocaleString()}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {vehicle.status === 'sold' && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-4">Sale Information</h3>
                  <div className="space-y-2">
                    {vehicle.saleDate && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Sale Date</span>
                        <span className="font-medium">{new Date(vehicle.saleDate).toLocaleDateString()}</span>
                      </div>
                    )}
                    {vehicle.buyerName && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Buyer</span>
                        <span className="font-medium">{vehicle.buyerName}</span>
                      </div>
                    )}
                    {vehicle.buyerId && (
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Buyer ID</span>
                        <span className="font-mono text-sm">{vehicle.buyerId}</span>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <ValuationProfitabilityCard vehicle={vehicle} />

          <ExportChecklistCard vehicle={vehicle} />

          <Card>
            <CardHeader>
              <CardTitle>Purchase Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Purchase Date</p>
                <p className="font-medium">{new Date(vehicle.purchaseDate).toLocaleDateString()}</p>
              </div>
              {vehicle.purchaseLocation && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Purchase Location</p>
                  <p className="font-medium">{vehicle.purchaseLocation}</p>
                </div>
              )}
              {vehicle.dateShipped && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Shipped Date</p>
                  <p className="font-medium">{new Date(vehicle.dateShipped).toLocaleDateString()}</p>
                </div>
              )}
              {vehicle.dateArrived && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Arrival Date</p>
                  <p className="font-medium">{new Date(vehicle.dateArrived).toLocaleDateString()}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
