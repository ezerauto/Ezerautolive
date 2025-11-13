import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CheckCircle2, XCircle, AlertCircle } from "lucide-react";
import type { Vehicle } from "@shared/schema";

interface Props {
  vehicle: Vehicle;
}

export function ExportReadinessIndicator({ vehicle }: Props) {
  const checks = {
    billOfSale: !!vehicle.billOfSaleUrl,
    title: !!vehicle.titleUrl,
    titleClean: vehicle.titleStatus === 'clean' || vehicle.titleStatus === 'salvage',
    photos: (vehicle.photoUrls?.length || 0) >= 6,
  };

  const violations = [];
  if (!checks.billOfSale) violations.push("Bill of sale");
  if (!checks.title) violations.push("Title document");
  if (!checks.titleClean) violations.push("Title must be clean/salvage");
  if (!checks.photos) violations.push(`${vehicle.photoUrls?.length || 0}/6 photos`);

  const allReady = Object.values(checks).every(Boolean);
  const someReady = Object.values(checks).some(Boolean);

  if (allReady) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="default" className="gap-1">
            <CheckCircle2 className="h-3 w-3" />
            Ready
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">All export requirements met</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (someReady) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="secondary" className="gap-1">
            <AlertCircle className="h-3 w-3" />
            Incomplete
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="text-xs font-semibold">Missing:</p>
            {violations.map((v, i) => (
              <p key={i} className="text-xs">• {v}</p>
            ))}
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="destructive" className="gap-1">
          <XCircle className="h-3 w-3" />
          Not Ready
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1">
          <p className="text-xs font-semibold">Export checklist incomplete:</p>
          {violations.map((v, i) => (
            <p key={i} className="text-xs">• {v}</p>
          ))}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
