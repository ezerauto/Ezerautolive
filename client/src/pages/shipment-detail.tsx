import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Truck, Package, CheckCircle2, Ship, Car, ExternalLink, FileText } from "lucide-react";
import { SimpleUploader } from "@/components/SimpleUploader";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Shipment, Vehicle } from "@shared/schema";

const statusConfig = {
  in_transit: { label: "In Transit", icon: Truck, color: "bg-primary/10 text-primary" },
  arrived: { label: "Arrived", icon: Package, color: "bg-warning/10 text-warning" },
  customs_cleared: { label: "Customs Cleared", icon: Ship, color: "bg-success/10 text-success" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-success/10 text-success" },
};

export default function ShipmentDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: shipment, isLoading } = useQuery<Shipment>({
    queryKey: ["/api/shipments", id],
  });
  
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery<Vehicle[]>({
    queryKey: ["/api/vehicles"],
  });

  const addDocumentMutation = useMutation({
    mutationFn: async (documentUrl: string) => {
      const currentDocs = shipment?.documentUrls || [];
      return apiRequest(`/api/shipments/${id}`, {
        method: "PUT",
        body: JSON.stringify({ documentUrls: [...currentDocs, documentUrl] }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/shipments", id] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-64 mb-8" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <Skeleton className="h-48" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!shipment) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="py-16 text-center">
            <h3 className="text-lg font-semibold mb-2">Shipment not found</h3>
            <p className="text-muted-foreground mb-6">The shipment you're looking for doesn't exist</p>
            <Link href="/shipments">
              <Button>Back to Shipments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = statusConfig[shipment.status as keyof typeof statusConfig];
  const StatusIcon = statusInfo.icon;
  const totalCost = Number(shipment.groundTransportCost || 0) +
    Number(shipment.customsBrokerFees || 0) +
    Number(shipment.oceanFreightCost || 0) +
    Number(shipment.importFees || 0);
  
  const shipmentVehicles = vehicles.filter(v => v.shipmentId === id);

  return (
    <div className="p-8">
      <div className="mb-8">
        <Link href="/shipments">
          <Button variant="ghost" className="mb-4 hover-elevate active-elevate-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Shipments
          </Button>
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Shipment {shipment.shipmentNumber}</h1>
            <p className="text-muted-foreground">{shipment.route}</p>
          </div>
          <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusInfo.label}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Shipment Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Shipment Date</p>
                <p className="font-medium">{new Date(shipment.shipmentDate).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Route</p>
                <p className="font-medium">{shipment.route}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Cost Breakdown</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ground Transport</span>
                  <span className="font-mono font-medium">${Number(shipment.groundTransportCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Customs Broker Fees</span>
                  <span className="font-mono font-medium">${Number(shipment.customsBrokerFees || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Ocean Freight</span>
                  <span className="font-mono font-medium">${Number(shipment.oceanFreightCost || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Import Fees</span>
                  <span className="font-mono font-medium">${Number(shipment.importFees || 0).toLocaleString()}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center font-semibold text-lg">
                  <span>Total Cost</span>
                  <span className="font-mono">${totalCost.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Vehicle Manifest ({shipmentVehicles.length} vehicles)</h3>
              {vehiclesLoading ? (
                <Skeleton className="h-32" />
              ) : shipmentVehicles.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Car className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No vehicles in this shipment</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shipmentVehicles.map(vehicle => (
                    <Link key={vehicle.id} href={`/inventory/${vehicle.id}`}>
                      <div className="flex items-center justify-between p-3 rounded-lg border hover-elevate active-elevate-2">
                        <div className="flex items-center gap-3">
                          <Car className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{vehicle.year} {vehicle.make} {vehicle.model}</p>
                            <p className="text-xs text-muted-foreground">VIN: {vehicle.vin}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium">${Number(vehicle.purchasePrice).toLocaleString()}</span>
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h3 className="font-semibold mb-4">Shipment Documents</h3>
              
              {shipment?.documentUrls && shipment.documentUrls.length > 0 && (
                <div className="space-y-2 mb-4">
                  {shipment.documentUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 p-3 rounded-lg border hover-elevate active-elevate-2"
                    >
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium flex-1">Document {idx + 1}</span>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </a>
                  ))}
                </div>
              )}
              
              <SimpleUploader
                directory={`shipments/${id}`}
                onUploadComplete={(url) => {
                  addDocumentMutation.mutate(url);
                }}
                allowedMimeTypes={["application/pdf", "image/jpeg", "image/png"]}
                maxFileSizeMB={10}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Status Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {['in_transit', 'arrived', 'customs_cleared', 'completed'].map((status, idx) => {
                  const config = statusConfig[status as keyof typeof statusConfig];
                  const Icon = config.icon;
                  const isActive = shipment.status === status;
                  const isPast = idx < ['in_transit', 'arrived', 'customs_cleared', 'completed'].indexOf(shipment.status);
                  
                  return (
                    <div key={status} className="flex items-start gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        isActive ? config.color : isPast ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'
                      }`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                          {config.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
