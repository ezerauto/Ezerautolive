import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Link } from "wouter";
import { Truck, Package, CheckCircle2, Ship } from "lucide-react";
import { CreateShipmentDialog } from "@/components/CreateShipmentDialog";
import type { Shipment } from "@shared/schema";

const statusConfig = {
  in_transit: { label: "In Transit", icon: Truck, color: "bg-primary/10 text-primary" },
  arrived: { label: "Arrived", icon: Package, color: "bg-warning/10 text-warning" },
  customs_cleared: { label: "Customs Cleared", icon: Ship, color: "bg-success/10 text-success" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-success/10 text-success" },
};

export default function Shipments() {
  const { data: shipments, isLoading } = useQuery<Shipment[]>({
    queryKey: ["/api/shipments"],
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b last:border-0">
                <Skeleton className="h-12 w-12 rounded" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-32 mb-2" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-8 w-24" />
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
          <h1 className="text-3xl font-bold mb-2">Shipments</h1>
          <p className="text-muted-foreground">Track vehicle shipments from USA to Honduras</p>
        </div>
        <CreateShipmentDialog />
      </div>

      {!shipments || shipments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Truck className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No shipments yet</h3>
            <p className="text-sm text-muted-foreground mb-6">Create your first shipment to start tracking</p>
            <CreateShipmentDialog />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>All Shipments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Shipment ID</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Route</TableHead>
                    <TableHead className="font-semibold text-center">Vehicles</TableHead>
                    <TableHead className="font-semibold text-right">Total Cost</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((shipment) => {
                    const statusInfo = statusConfig[shipment.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo.icon;
                    const totalCost = Number(shipment.groundTransportCost || 0) +
                      Number(shipment.customsBrokerFees || 0) +
                      Number(shipment.oceanFreightCost || 0) +
                      Number(shipment.importFees || 0);

                    return (
                      <TableRow
                        key={shipment.id}
                        className="hover-elevate"
                        data-testid={`row-shipment-${shipment.id}`}
                      >
                        <TableCell className="font-mono font-medium" data-testid={`text-shipment-id-${shipment.id}`}>
                          {shipment.shipmentNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(shipment.shipmentDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{shipment.route}</TableCell>
                        <TableCell className="text-center">-</TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          ${totalCost.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/shipments/${shipment.id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              data-testid={`button-view-${shipment.id}`}
                              className="hover-elevate active-elevate-2"
                            >
                              View Details
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
