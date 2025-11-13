import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CARD_STYLES, ICON_SIZES } from "@/lib/design-system";
import { LucideIcon } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
  testId?: string;
};

export function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  className = "",
  testId,
}: MetricCardProps) {
  return (
    <Card className={`${CARD_STYLES.METRIC} ${className}`} data-testid={testId}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon && <Icon className={`${ICON_SIZES.MD} text-muted-foreground`} />}
      </CardHeader>
      <CardContent>
        <div className={`text-3xl font-bold font-mono ${className}`} data-testid={`${testId}-value`}>
          {value}
        </div>
        {(subtitle || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span 
                className={`text-xs font-medium ${
                  trend.isPositive ? 'text-success' : 'text-destructive'
                }`}
              >
                {trend.value}
              </span>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
