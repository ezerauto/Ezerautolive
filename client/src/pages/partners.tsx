import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Ship, Truck, FileText, Sparkles } from "lucide-react";

interface Partner {
  id: string;
  name: string;
  type: string;
  contactInfo: { phone?: string; email?: string } | null;
  isActive: boolean;
  createdAt: string;
}

export default function Partners() {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("all");

  const { data: partners, isLoading } = useQuery<Partner[]>({
    queryKey: ['/api/partners'],
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('POST', '/api/partners/seed', {});
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/partners'] });
      toast({
        title: "Partners Seeded",
        description: data.message || "Initial partners have been created",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to seed partners",
        variant: "destructive",
      });
    },
  });

  const filteredPartners = partners?.filter(p => 
    selectedType === "all" || p.type === selectedType
  ) || [];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'shipping':
        return <Ship className="h-4 w-4" />;
      case 'trucking':
        return <Truck className="h-4 w-4" />;
      case 'customs_broker':
        return <FileText className="h-4 w-4" />;
      default:
        return null;
    }
  };

  const getTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'shipping':
        return "default";
      case 'trucking':
        return "secondary";
      case 'customs_broker':
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Partners</h1>
          <p className="text-muted-foreground mt-1">
            Manage shipping companies, truckers, and customs brokers
          </p>
        </div>
        <Button 
          onClick={() => seedMutation.mutate()}
          disabled={seedMutation.isPending}
          data-testid="button-seed-partners"
        >
          <Sparkles className="h-4 w-4 mr-2" />
          {seedMutation.isPending ? "Seeding..." : "Seed Initial Partners"}
        </Button>
      </div>

      <Tabs value={selectedType} onValueChange={setSelectedType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[700px]">
          <TabsTrigger value="all" data-testid="tab-all">All Partners</TabsTrigger>
          <TabsTrigger value="shipping" data-testid="tab-shipping">
            <Ship className="h-4 w-4 mr-2" />
            Shipping
          </TabsTrigger>
          <TabsTrigger value="trucking" data-testid="tab-trucking">
            <Truck className="h-4 w-4 mr-2" />
            Trucking
          </TabsTrigger>
          <TabsTrigger value="customs_broker" data-testid="tab-customs">
            <FileText className="h-4 w-4 mr-2" />
            Customs Brokers
          </TabsTrigger>
        </TabsList>

        <Card>
          <CardHeader>
            <CardTitle>
              {selectedType === "all" ? "All Partners" : 
               selectedType === "shipping" ? "Shipping Companies" :
               selectedType === "trucking" ? "Trucking Companies" :
               "Customs Brokers"
              }
            </CardTitle>
            <CardDescription>
              {filteredPartners.length} partner{filteredPartners.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      Loading partners...
                    </TableCell>
                  </TableRow>
                ) : filteredPartners.length > 0 ? (
                  filteredPartners.map((partner) => (
                    <TableRow key={partner.id} data-testid={`partner-row-${partner.id}`}>
                      <TableCell className="font-medium">{partner.name}</TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(partner.type)} className="gap-1">
                          {getTypeIcon(partner.type)}
                          {partner.type.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {partner.contactInfo ? (
                          <div className="space-y-1">
                            {partner.contactInfo.phone && (
                              <div className="text-xs">{partner.contactInfo.phone}</div>
                            )}
                            {partner.contactInfo.email && (
                              <div className="text-xs text-muted-foreground">
                                {partner.contactInfo.email}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={partner.isActive ? "default" : "secondary"}>
                          {partner.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                      No partners found. Click "Seed Initial Partners" to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Tabs>
    </div>
  );
}
