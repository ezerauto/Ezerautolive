import {
  BarChart3,
  Truck,
  Warehouse,
  FileText,
  DollarSign,
  Handshake,
  Receipt,
  User,
  TrendingUp,
  Users,
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

const menuItems = [
  {
    title: "The Books",
    url: "/",
    icon: BarChart3,
    testId: "link-dashboard",
  },
  {
    title: "Shipments",
    url: "/shipments",
    icon: Truck,
    testId: "link-shipments",
  },
  {
    title: "The Vault",
    url: "/inventory",
    icon: Warehouse,
    testId: "link-inventory",
  },
  {
    title: "Arrangements",
    url: "/contracts",
    icon: FileText,
    testId: "link-contracts",
  },
  {
    title: "The Take",
    url: "/financials",
    icon: DollarSign,
    testId: "link-financials",
  },
  {
    title: "Collections",
    url: "/payments",
    icon: Handshake,
    testId: "link-payments",
  },
  {
    title: "The Ledger",
    url: "/costs",
    icon: Receipt,
    testId: "link-costs",
  },
];

const ezerMenuItems = [
  {
    title: "EZER Auto HQ",
    url: "/operations",
    icon: TrendingUp,
    testId: "link-operations",
  },
  {
    title: "The Network",
    url: "/partners",
    icon: Users,
    testId: "link-partners",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  return (
    <Sidebar>
      <SidebarHeader className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h2 className="text-base font-semibold">The Family Business</h2>
            <p className="text-xs text-muted-foreground">Partnership Operations</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            The Family
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={item.testId}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            EZER Auto Operations
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ezerMenuItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      data-testid={item.testId}
                    >
                      <Link href={item.url} className="flex items-center gap-3 px-4 py-3">
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
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
