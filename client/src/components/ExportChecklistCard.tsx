import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, XCircle, Upload, FileText, Image, AlertCircle } from "lucide-react";
import type { Vehicle } from "@shared/schema";

interface Props {
  vehicle: Vehicle;
}

export function ExportChecklistCard({ vehicle }: Props) {
  const checks = {
    billOfSale: {
      met: !!vehicle.billOfSaleUrl,
      label: "Bill of Sale",
      icon: FileText,
    },
    title: {
      met: !!vehicle.titleUrl,
      label: "Title Document",
      icon: FileText,
    },
    titleStatus: {
      met: vehicle.titleStatus === 'clean' || vehicle.titleStatus === 'salvage',
      label: "Clean/Salvage Title",
      icon: FileText,
    },
    photos: {
      met: (vehicle.photoUrls?.length || 0) >= 6,
      label: `Photos (${vehicle.photoUrls?.length || 0}/6)`,
      icon: Image,
    },
  };

  const allReady = Object.values(checks).every(c => c.met);
  const violations = Object.entries(checks).filter(([_, check]) => !check.met);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Export Checklist</CardTitle>
          {allReady ? (
            <Badge variant="default" className="gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Ready to Ship
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1">
              <AlertCircle className="h-3 w-3" />
              Incomplete
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {allReady ? (
          <Alert className="border-success/50 bg-success/10">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <AlertDescription className="text-success">
              ✓ All export requirements met. Vehicle ready for Honduras shipment.
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-warning/50 bg-warning/10">
            <AlertCircle className="h-4 w-4 text-warning" />
            <AlertDescription className="text-warning">
              Complete all requirements below before shipping to Honduras
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-3">
          {Object.entries(checks).map(([key, check]) => {
            const Icon = check.icon;
            return (
              <div
                key={key}
                className="flex items-center justify-between p-3 rounded-lg border"
                data-testid={`checklist-item-${key}`}
              >
                <div className="flex items-center gap-3">
                  {check.met ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : (
                    <XCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">{check.label}</div>
                    {!check.met && key !== 'titleStatus' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Upload required before export
                      </div>
                    )}
                    {!check.met && key === 'titleStatus' && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Must be clean or salvage (not rebuilt)
                      </div>
                    )}
                  </div>
                </div>
                {!check.met && key !== 'titleStatus' && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    data-testid={`button-upload-${key}`}
                    className="cursor-not-allowed opacity-50"
                    title="Upload feature coming soon - use Edit Vehicle to add documents"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {!allReady && (
          <Alert>
            <AlertDescription className="text-sm">
              <strong>Note:</strong> Attempting to mark as "In Transit" without meeting all requirements
              will be blocked by the system.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
