import { SPACING, TYPOGRAPHY } from "@/lib/design-system";
import { Breadcrumb } from "./Breadcrumb";

type PageTemplateProps = {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
  kpiCards?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

export function PageTemplate({
  title,
  subtitle,
  breadcrumbs,
  actions,
  kpiCards,
  children,
  className = "",
}: PageTemplateProps) {
  return (
    <div className={`min-h-full ${SPACING.SECTION} ${className}`}>
      {/* Breadcrumb Navigation */}
      {breadcrumbs && breadcrumbs.length > 0 && (
        <div className="mb-6">
          <Breadcrumb items={breadcrumbs} />
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className={TYPOGRAPHY.HEADING_XL} data-testid="page-title">
            {title}
          </h1>
          {subtitle && (
            <p className="text-muted-foreground mt-1" data-testid="page-subtitle">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-3">
            {actions}
          </div>
        )}
      </div>

      {/* KPI Strip (max 4 cards) */}
      {kpiCards && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 ${SPACING.GRID_GAP} mb-8`}>
          {kpiCards}
        </div>
      )}

      {/* Main Content */}
      <div className={SPACING.STACK}>
        {children}
      </div>
    </div>
  );
}
