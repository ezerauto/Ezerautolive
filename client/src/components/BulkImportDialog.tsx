import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Upload, FileSpreadsheet, AlertCircle } from "lucide-react";
import Papa from "papaparse";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BulkImportDialog() {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const importMutation = useMutation({
    mutationFn: async (vehicles: any[]) => {
      const response = await fetch("/api/vehicles/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicles }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to import vehicles");
      }
      return response.json();
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      
      if (data.errors && data.errors.length > 0) {
        setErrors(data.errors.map((e: any) => `Row ${e.row}: ${e.error}`));
        toast({
          variant: data.success > 0 ? "default" : "destructive",
          title: data.success > 0 ? "Partial import completed" : "Import failed",
          description: `Successfully imported ${data.success} vehicle(s). Failed: ${data.failed}`,
        });
      } else {
        toast({
          title: "Import completed",
          description: `Successfully imported ${data.success} vehicle(s).`,
        });
        setOpen(false);
        setFile(null);
        setPreview([]);
        setErrors([]);
      }
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message || "Failed to import vehicles",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setErrors([]);

    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: any) => {
          // Map CSV columns to vehicle schema
          const mileageValue = row.Mileage || row.mileage || row.odometer || row.Odometer;
          const statusValue = row.Status || row.status || "";
          const statusMap: Record<string, string> = {
            "For Sale": "in_stock",
            "In Transit": "in_transit",
            "Sold": "sold",
          };
          
          return {
            vin: row.VIN || row.vin || "",
            make: row.Make || row.make || "",
            model: row.Model || row.model || "",
            year: row.Year || row.year ? parseInt(row.Year || row.year) : undefined,
            purchasePrice: row["Purchase Price"] || row.purchasePrice || row.purchase_price || "",
            purchaseDate: row["Purchase Date"] || row.purchaseDate || row.purchase_date || new Date().toISOString(),
            targetSalePrice: row["Target Sale Price"] || row.targetSalePrice || row.target_sale_price || null,
            status: statusMap[statusValue] || statusValue.toLowerCase().replace(/\s+/g, '_') || "in_stock",
            shipmentId: null,
            odometer: mileageValue && mileageValue !== "Exempt" ? parseInt(mileageValue) : null,
            color: row.Color || row.color || "",
          };
        });
        setPreview(mapped.slice(0, 5)); // Show first 5 rows
      },
      error: (error) => {
        setErrors([`Failed to parse CSV: ${error.message}`]);
      },
    });
  };

  const handleImport = () => {
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mapped = results.data.map((row: any) => {
          const mileageValue = row.Mileage || row.mileage || row.odometer || row.Odometer;
          const statusValue = row.Status || row.status || "";
          const statusMap: Record<string, string> = {
            "For Sale": "in_stock",
            "In Transit": "in_transit",
            "Sold": "sold",
          };
          
          return {
            vin: row.VIN || row.vin || "",
            make: row.Make || row.make || "",
            model: row.Model || row.model || "",
            year: row.Year || row.year ? parseInt(row.Year || row.year) : undefined,
            purchasePrice: row["Purchase Price"] || row.purchasePrice || row.purchase_price || "",
            purchaseDate: row["Purchase Date"] || row.purchaseDate || row.purchase_date || new Date().toISOString(),
            targetSalePrice: row["Target Sale Price"] || row.targetSalePrice || row.target_sale_price || null,
            status: statusMap[statusValue] || statusValue.toLowerCase().replace(/\s+/g, '_') || "in_stock",
            shipmentId: null,
            odometer: mileageValue && mileageValue !== "Exempt" ? parseInt(mileageValue) : null,
            color: row.Color || row.color || "",
          };
        });
        importMutation.mutate(mapped);
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" data-testid="button-bulk-import" className="hover-elevate active-elevate-2">
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Bulk Import Vehicles</DialogTitle>
          <DialogDescription>
            Upload a CSV file with vehicle data. Required: VIN, Make, Model, Year, Purchase Price. Optional: Target Sale Price, Status, Mileage, Color. Purchase Date defaults to today if not provided.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {errors.map((error, i) => (
                  <div key={i}>{error}</div>
                ))}
              </AlertDescription>
            </Alert>
          )}

          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-upload"
              data-testid="input-csv-file"
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm font-medium mb-1">
                {file ? file.name : "Click to upload CSV file"}
              </p>
              <p className="text-xs text-muted-foreground">
                CSV format with headers
              </p>
            </label>
          </div>

          {preview.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2">Preview (first 5 rows):</h4>
              <div className="border border-border rounded-lg overflow-auto max-h-64">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-2 py-1 text-left">VIN</th>
                      <th className="px-2 py-1 text-left">Make</th>
                      <th className="px-2 py-1 text-left">Model</th>
                      <th className="px-2 py-1 text-left">Year</th>
                      <th className="px-2 py-1 text-left">Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-2 py-1">{row.vin}</td>
                        <td className="px-2 py-1">{row.make}</td>
                        <td className="px-2 py-1">{row.model}</td>
                        <td className="px-2 py-1">{row.year}</td>
                        <td className="px-2 py-1">${row.purchasePrice}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-testid="button-cancel-import"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || importMutation.isPending}
              data-testid="button-confirm-import"
              className="hover-elevate active-elevate-2"
            >
              {importMutation.isPending ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
