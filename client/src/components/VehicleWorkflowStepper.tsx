import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import type { Vehicle } from "@shared/schema";

interface Props {
  vehicle: Vehicle;
}

export function VehicleWorkflowStepper({ vehicle }: Props) {
  const steps = [
    {
      id: "buy",
      label: "Purchase",
      completed: !!vehicle.purchaseDate,
      active: !!vehicle.purchaseDate,
    },
    {
      id: "inspect",
      label: "Inspect",
      completed: (vehicle.photoUrls?.length || 0) >= 6,
      active: !!vehicle.purchaseDate && (vehicle.photoUrls?.length || 0) < 6,
    },
    {
      id: "title",
      label: "Title",
      completed: !!vehicle.titleUrl && (vehicle.titleStatus === 'clean' || vehicle.titleStatus === 'salvage'),
      active: !!vehicle.purchaseDate && (!vehicle.titleUrl || (vehicle.titleStatus !== 'clean' && vehicle.titleStatus !== 'salvage')),
    },
    {
      id: "list",
      label: "List",
      completed: !!(vehicle.targetSalePrice && vehicle.minimumPrice),
      active: !!vehicle.titleUrl && (!vehicle.targetSalePrice || !vehicle.minimumPrice),
    },
    {
      id: "sell_or_ship",
      label: "Sell/Ship",
      completed: vehicle.status === 'sold' || vehicle.status === 'in_transit',
      active: !!vehicle.targetSalePrice && vehicle.status === 'in_stock',
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Procurement Workflow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <div key={step.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-2">
                <div className={`rounded-full p-2 ${
                  step.completed
                    ? 'bg-success/10 text-success'
                    : step.active
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {step.completed ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : step.active ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <Circle className="h-5 w-5" />
                  )}
                </div>
                <div className="text-center">
                  <div className={`text-sm font-medium ${
                    step.completed || step.active ? '' : 'text-muted-foreground'
                  }`}>
                    {step.label}
                  </div>
                  {step.active && !step.completed && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      In Progress
                    </Badge>
                  )}
                </div>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${
                  steps[idx + 1].completed ? 'bg-success' : 'bg-muted'
                }`} />
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
