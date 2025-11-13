import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { FileText, CheckCircle2, AlertCircle, ExternalLink, Ship, Plane } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ShipmentDocumentExportProps {
  shipmentId: string;
}

interface VehicleDocument {
  vehicleId: string;
  vin: string;
  makeModel: string;
  documents: {
    title: string | null;
    billOfSale: string | null;
    photos?: string[];
  };
  photoCount?: number;
  hasMissingDocuments: boolean;
}

interface CustomsBrokerDocs {
  shipmentId: string;
  shipmentName: string;
  agentType: string;
  requiredDocuments: string[];
  vehicles: VehicleDocument[];
}

interface ImportAgentDocs {
  shipmentId: string;
  shipmentName: string;
  agentType: string;
  requiredDocuments: string[];
  shipmentDocuments: {
    billOfLading: string | null;
  };
  vehicles: VehicleDocument[];
  hasMissingBOL: boolean;
}

export function ShipmentDocumentExport({ shipmentId }: ShipmentDocumentExportProps) {
  const { data: customsBrokerDocs, isLoading: loadingBroker } = useQuery<CustomsBrokerDocs>({
    queryKey: ['/api/shipments', shipmentId, 'documents/customs-broker'],
  });

  const { data: importAgentDocs, isLoading: loadingImport } = useQuery<ImportAgentDocs>({
    queryKey: ['/api/shipments', shipmentId, 'documents/import-agent'],
  });

  if (loadingBroker || loadingImport) {
    return <Skeleton className="h-96" />;
  }

  return (
    <div className="space-y-6">
      {/* Customs Broker Documents */}
      <Card data-testid="card-customs-broker-docs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <CardTitle>Customs Broker Documents</CardTitle>
              <CardDescription>
                Required: Titles + Bills of Sale for all vehicles
              </CardDescription>
            </div>
            <Badge variant={customsBrokerDocs?.vehicles?.every((v: any) => !v.hasMissingDocuments) ? "default" : "destructive"}>
              {customsBrokerDocs?.vehicles?.filter((v: any) => !v.hasMissingDocuments).length || 0} / {customsBrokerDocs?.vehicles?.length || 0} Complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customsBrokerDocs?.vehicles?.map((vehicle) => (
              <div key={vehicle.vehicleId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" data-testid={`text-vehicle-${vehicle.vin}`}>
                      {vehicle.makeModel}
                    </p>
                    <p className="text-sm text-muted-foreground">VIN: {vehicle.vin}</p>
                  </div>
                  {vehicle.hasMissingDocuments ? (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Incomplete
                    </Badge>
                  ) : (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2 pl-4">
                  <div className="flex items-center gap-2 text-sm">
                    {vehicle.documents.title ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <a 
                          href={vehicle.documents.title} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-title-${vehicle.vin}`}
                        >
                          Title <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">Title missing</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {vehicle.documents.billOfSale ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <a 
                          href={vehicle.documents.billOfSale} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-bill-of-sale-${vehicle.vin}`}
                        >
                          Bill of Sale <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">Bill of Sale missing</span>
                      </>
                    )}
                  </div>
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Agent Documents */}
      <Card data-testid="card-import-agent-docs">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Ship className="h-5 w-5 text-primary" />
            <div className="flex-1">
              <CardTitle>Import Agent Documents</CardTitle>
              <CardDescription>
                Required: Bill of Lading + Titles + Photos + Bills of Sale
              </CardDescription>
            </div>
            <Badge variant={
              !importAgentDocs?.hasMissingBOL && 
              importAgentDocs?.vehicles?.every((v: any) => !v.hasMissingDocuments) 
                ? "default" 
                : "destructive"
            }>
              {importAgentDocs?.hasMissingBOL ? "BOL Missing" : "BOL Ready"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Bill of Lading */}
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Plane className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Bill of Lading</span>
                </div>
                {importAgentDocs?.shipmentDocuments?.billOfLading ? (
                  <a 
                    href={importAgentDocs.shipmentDocuments.billOfLading} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    data-testid="link-bill-of-lading"
                  >
                    <Button variant="outline" size="sm" className="gap-1">
                      <FileText className="h-4 w-4" />
                      View BOL
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                  </a>
                ) : (
                  <Badge variant="destructive" className="gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Missing
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Vehicle Documents */}
            {importAgentDocs?.vehicles?.map((vehicle) => (
              <div key={vehicle.vehicleId} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium" data-testid={`text-import-vehicle-${vehicle.vin}`}>
                      {vehicle.makeModel}
                    </p>
                    <p className="text-sm text-muted-foreground">VIN: {vehicle.vin}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {vehicle.photoCount} photos
                    </Badge>
                    {vehicle.hasMissingDocuments ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        Incomplete
                      </Badge>
                    ) : (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        Ready
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pl-4">
                  <div className="flex items-center gap-2 text-sm">
                    {vehicle.documents.title ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <a 
                          href={vehicle.documents.title} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-import-title-${vehicle.vin}`}
                        >
                          Title <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">Title</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {vehicle.documents.billOfSale ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <a 
                          href={vehicle.documents.billOfSale} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                          data-testid={`link-import-bill-${vehicle.vin}`}
                        >
                          Bill <ExternalLink className="h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">Bill</span>
                      </>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {vehicle.documents.photos && vehicle.documents.photos.length > 0 ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-primary">{vehicle.photoCount} photos</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-muted-foreground">No photos</span>
                      </>
                    )}
                  </div>
                </div>
                <Separator />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
