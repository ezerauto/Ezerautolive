import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Truck, TrendingUp, Shield, BarChart3 } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Import Tracker</h1>
              <p className="text-xs text-muted-foreground">Partnership Dashboard</p>
            </div>
          </div>
          <Button
            variant="default"
            onClick={() => {window.location.href = '/api/login'}}
            data-testid="button-login"
            className="hover-elevate active-elevate-2"
          >
            Log In
          </Button>
        </div>
      </header>

      <main>
        <section className="container max-w-7xl mx-auto px-6 py-24">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Professional Vehicle Import Partnership Tracking
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Comprehensive dashboard for managing vehicle imports from USA to Honduras. 
              Track shipments, inventory, financials, and profit distribution with complete transparency.
            </p>
            <Button
              size="lg"
              onClick={() => {window.location.href = '/api/login'}}
              data-testid="button-get-started"
              className="hover-elevate active-elevate-2"
            >
              Get Started
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-20">
            <Card className="p-6 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 mb-4">
                <Truck className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Shipment Tracking</h3>
              <p className="text-sm text-muted-foreground">
                Monitor vehicles from purchase through customs clearance with real-time status updates
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 mb-4">
                <BarChart3 className="h-6 w-6 text-success" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Inventory Management</h3>
              <p className="text-sm text-muted-foreground">
                Track vehicle details, costs, pricing strategy, and days in inventory
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 mb-4">
                <TrendingUp className="h-6 w-6 text-warning" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Financial Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Automated profit calculations with 60/40 split during reinvestment, then 50/50
              </p>
            </Card>

            <Card className="p-6 hover-elevate">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 mb-4">
                <Shield className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Secure Documents</h3>
              <p className="text-sm text-muted-foreground">
                Store contracts, receipts, and proof of payment with role-based access
              </p>
            </Card>
          </div>
        </section>
      </main>
    </div>
  );
}
