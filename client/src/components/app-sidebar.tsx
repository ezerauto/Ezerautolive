import {
  LayoutDashboard,
  Truck,
  Package,
  FileText,
  TrendingUp,
  CreditCard,
  Receipt,
  User,
  Building2,
  Users,
  BarChart3,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/useAuth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type MenuItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  testId: string;
  badge?: string;
};

const dashboardItems: MenuItem[] = [
  {
    title: "Overview",
    url: "/",
    icon: LayoutDashboard,
    testId: "link-dashboard",
  },
  {
    title: "Financials",
    url: "/financials",
    icon: TrendingUp,
    testId: "link-financials",
  },
];

const operationsItems: MenuItem[] = [
  {
    title: "Inventory",
    url: "/inventory",
    icon: Package,
    testId: "link-inventory",
  },
  {
    title: "Shipments",
    url: "/shipments",
    icon: Truck,
    testId: "link-shipments",
  },
  {
    title: "Operations Hub",
    url: "/operations",
    icon: Building2,
    testId: "link-operations",
    badge: "EZER",
  },
];

const transactionsItems: MenuItem[] = [
  {
    title: "Payments",
    url: "/payments",
    icon: CreditCard,
    testId: "link-payments",
  },
  {
    title: "Costs",
    url: "/costs",
    icon: Receipt,
    testId: "link-costs",
  },
  {
    title: "Contracts",
    url: "/contracts",
    icon: FileText,
    testId: "link-contracts",
  },
];

const networkItems: MenuItem[] = [
  {
    title: "Partners",
    url: "/partners",
    icon: Users,
    testId: "link-partners",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  const renderMenuItems = (items: MenuItem[]) => {
    return items.map((item) => {
      const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
      return (
        <SidebarMenuItem key={item.title}>
          <SidebarMenuButton
            asChild
            isActive={isActive}
            data-testid={item.testId}
          >
            <Link href={item.url} className="flex items-center gap-3 px-3 py-2.5">
              <item.icon className="h-4 w-4" />
              <span className="flex-1">{item.title}</span>
              {item.badge && (
                <Badge variant="secondary" className="text-xs px-1.5 py-0.5 h-5 no-default-hover-elevate no-default-active-elevate">
                  {item.badge}
                </Badge>
              )}
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold">EZER Auto Import</h2>
            <p className="text-xs text-muted-foreground truncate">Partnership Dashboard</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {renderMenuItems(dashboardItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {renderMenuItems(operationsItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="mb-4">
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Transactions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {renderMenuItems(transactionsItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Network
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5">
              {renderMenuItems(networkItems)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9">
            <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} className="object-cover" />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate" data-testid="text-user-name">
              {user?.firstName && user?.lastName 
                ? `${user.firstName} ${user.lastName}` 
                : user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate" data-testid="text-user-email">
              {user?.email}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 justify-start hover-elevate active-elevate-2"
          onClick={() => {window.location.href = '/api/logout'}}
          data-testid="button-logout"
        >
          <User className="h-4 w-4 mr-2" />
          Log Out
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
