import { useQuery, useMutation } from "@tanstack/react-query";
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
import { CheckCircle2, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Payment } from "@shared/schema";

const statusConfig = {
  paid: { label: "Paid", icon: CheckCircle2, color: "bg-success/10 text-success" },
  pending: { label: "Pending", icon: Clock, color: "bg-warning/10 text-warning" },
  overdue: { label: "Overdue", icon: AlertTriangle, color: "bg-destructive/10 text-destructive" },
};

export default function Payments() {
  const { toast } = useToast();
  const { data: payments, isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments"],
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      return apiRequest('PATCH', `/api/payments/${paymentId}`, {
        status: 'paid'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/payments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      toast({
        title: "Payment marked as paid",
        description: "The payment status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update payment status",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8">
        <Skeleton className="h-8 w-48 mb-8" />
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Collections</h1>
        <p className="text-muted-foreground">Track what's owed and when it's due</p>
      </div>

      {!payments || payments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckCircle2 className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No payments yet</h3>
            <p className="text-sm text-muted-foreground">Payments will appear here when vehicles are sold</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Payment Tracking</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-semibold">Payment ID</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold">Vehicle</TableHead>
                    <TableHead className="font-semibold text-right">Amount Due</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold">Date Paid</TableHead>
                    <TableHead className="font-semibold">Method</TableHead>
                    <TableHead className="font-semibold">Reference #</TableHead>
                    <TableHead className="font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => {
                    const statusInfo = statusConfig[payment.status as keyof typeof statusConfig];
                    const StatusIcon = statusInfo.icon;

                    return (
                      <TableRow
                        key={payment.id}
                        className="hover-elevate"
                        data-testid={`row-payment-${payment.id}`}
                      >
                        <TableCell className="font-mono font-medium" data-testid={`text-payment-id-${payment.id}`}>
                          {payment.paymentNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(payment.dueDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>-</TableCell>
                        <TableCell className="text-right font-mono font-semibold" data-testid={`text-amount-${payment.id}`}>
                          ${Number(payment.amount).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`${statusInfo.color} uppercase text-xs`}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.datePaid ? new Date(payment.datePaid).toLocaleDateString() : '-'}
                        </TableCell>
                        <TableCell>{payment.paymentMethod || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{payment.referenceNumber || '-'}</TableCell>
                        <TableCell>
                          {(payment.status === 'pending' || payment.status === 'overdue') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => markAsPaidMutation.mutate(payment.id)}
                              disabled={markAsPaidMutation.isPending}
                              data-testid={`button-mark-paid-${payment.id}`}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Mark as Paid
                            </Button>
                          )}
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
