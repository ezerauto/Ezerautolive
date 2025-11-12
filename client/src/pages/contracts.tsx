import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Plus, FileText, CheckCircle2, Clock, File } from "lucide-react";
import type { Contract } from "@shared/schema";

const statusConfig = {
  active: { label: "Active", icon: CheckCircle2, color: "bg-success/10 text-success" },
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-muted/50 text-muted-foreground" },
};

export default function Contracts() {
  const { data: contracts, isLoading } = useQuery<Contract[]>({
    queryKey: ["/api/contracts"],
  });

  const groupedContracts = {
    partnership: contracts?.filter((c) => c.type === "partnership_agreement") || [],
    inspections: contracts?.filter((c) => c.type === "arrival_inspection") || [],
    saleClosures: contracts?.filter((c) => c.type === "sale_closure") || [],
    supporting: contracts?.filter((c) => c.type === "supporting") || [],
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Arrangements</h1>
          <p className="text-muted-foreground">Partnership agreements and documentation</p>
        </div>
        <Button data-testid="button-upload-contract" className="hover-elevate active-elevate-2">
          <Plus className="h-4 w-4 mr-2" />
          Upload Document
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Partnership Agreements
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedContracts.partnership.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No partnership agreements uploaded</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedContracts.partnership.map((contract) => {
                  const statusInfo = statusConfig[contract.status as keyof typeof statusConfig];
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div
                      key={contract.id}
                      className="p-4 rounded-lg border border-border hover-elevate"
                      data-testid={`contract-${contract.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{contract.title}</h4>
                        <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {new Date(contract.contractDate).toLocaleDateString()}
                      </p>
                      {contract.parties && contract.parties.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Parties: {contract.parties.join(", ")}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Arrival Inspections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedContracts.inspections.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No inspection documents</p>
              </div>
            ) : (
              <div className="space-y-4">
                {groupedContracts.inspections.map((contract) => {
                  const statusInfo = statusConfig[contract.status as keyof typeof statusConfig];
                  const StatusIcon = statusInfo.icon;
                  return (
                    <div
                      key={contract.id}
                      className="p-4 rounded-lg border border-border hover-elevate"
                      data-testid={`contract-${contract.id}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{contract.title}</h4>
                        <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {new Date(contract.contractDate).toLocaleDateString()}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Sale Closure Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {groupedContracts.saleClosures.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No sale closure documents</p>
                <p className="text-xs mt-2">Documents will appear here when vehicles are sold</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedContracts.saleClosures.map((contract) => (
                  <div
                    key={contract.id}
                    className="p-4 rounded-lg border border-border hover-elevate"
                    data-testid={`contract-${contract.id}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{contract.title}</h4>
                      <Badge variant="secondary" className="bg-success/10 text-success uppercase text-xs">
                        Completed
                      </Badge>
                    </div>
                    <Separator className="my-3" />
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Sale Price:</span>
                        <span className="font-mono font-semibold">
                          ${Number(contract.salePrice || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Profit:</span>
                        <span className="font-mono font-semibold text-success">
                          ${Number(contract.profit || 0).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        {new Date(contract.contractDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
