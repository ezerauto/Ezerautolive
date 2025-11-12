import { useQuery } from "@tanstack/react-query";
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
import { Plus, Receipt, FileText } from "lucide-react";
import type { Cost } from "@shared/schema";

const categoryLabels: Record<string, string> = {
  vehicle_purchase: "Vehicle Purchase",
  ground_transport: "Ground Transport",
  customs_broker: "Customs Broker",
  ocean_freight: "Ocean Freight",
  import_fees: "Import Fees",
  other: "Other",
};

export default function Costs() {
  const { data: costs, isLoading } = useQuery<Cost[]>({
    queryKey: ["/api/costs"],
  });

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
          <h1 className="text-3xl font-bold mb-2">Cost Documentation</h1>
          <p className="text-muted-foreground">Upload and manage receipts and expense documentation</p>
        </div>
        <Button data-testid="button-upload-receipt" className="hover-elevate active-elevate-2">
          <Plus className="h-4 w-4 mr-2" />
          Upload Receipt
        </Button>
      </div>

      {!costs || costs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Receipt className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No receipts uploaded</h3>
            <p className="text-sm text-muted-foreground mb-6">Start documenting costs by uploading receipts</p>
            <Button data-testid="button-upload-first-receipt" className="hover-elevate active-elevate-2">
              <Plus className="h-4 w-4 mr-2" />
              Upload First Receipt
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
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-view-receipt-${cost.id}`}
                            className="hover-elevate active-elevate-2"
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            View
                          </Button>
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
    </div>
  );
}
