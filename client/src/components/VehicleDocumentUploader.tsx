import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { FileText, Upload, ExternalLink } from "lucide-react";

interface VehicleDocumentUploaderProps {
  vehicleId: string;
  billOfSaleUrl?: string | null;
  titleUrl?: string | null;
}

export function VehicleDocumentUploader({ vehicleId, billOfSaleUrl, titleUrl }: VehicleDocumentUploaderProps) {
  const { toast } = useToast();
  const [uploadingBill, setUploadingBill] = useState(false);
  const [uploadingTitle, setUploadingTitle] = useState(false);

  const updateDocumentMutation = useMutation({
    mutationFn: async (data: { billOfSaleUrl?: string; titleUrl?: string }) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicleId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      toast({
        title: "Document uploaded",
        description: "Vehicle document has been saved",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to upload document",
        description: error.message || "An error occurred",
      });
    },
  });

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
    documentType: 'billOfSale' | 'title'
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const setUploading = documentType === 'billOfSale' ? setUploadingBill : setUploadingTitle;
    setUploading(true);

    try {
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (!allowedTypes.includes(file.type)) {
        throw new Error('Only PDF, JPEG, and PNG files are allowed');
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      // Get upload URL from server
      const response = await apiRequest("POST", "/api/objects/upload", {
        directory: `vehicles/${vehicleId}/documents`,
        contentType: file.type,
      });
      const { uploadURL, publicURL } = await response.json() as { uploadURL: string; publicURL: string };

      // Upload file to object storage
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: {
          "Content-Type": file.type,
        },
      });

      const finalUrl = publicURL || uploadURL;
      
      // Update vehicle with document URL
      if (documentType === 'billOfSale') {
        updateDocumentMutation.mutate({ billOfSaleUrl: finalUrl });
      } else {
        updateDocumentMutation.mutate({ titleUrl: finalUrl });
      }

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message || "Failed to upload document",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  return (
    <Card data-testid={`card-document-upload-${vehicleId}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Vehicle Documents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Bill of Sale</span>
            {billOfSaleUrl ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(billOfSaleUrl, '_blank')}
                  data-testid={`button-view-bill-${vehicleId}`}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
                <label htmlFor="bill-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingBill}
                    onClick={() => document.getElementById('bill-upload')?.click()}
                    data-testid={`button-upload-bill-${vehicleId}`}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Replace
                  </Button>
                </label>
              </div>
            ) : (
              <label htmlFor="bill-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingBill}
                  onClick={() => document.getElementById('bill-upload')?.click()}
                  data-testid={`button-upload-bill-${vehicleId}`}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadingBill ? 'Uploading...' : 'Upload'}
                </Button>
              </label>
            )}
          </div>
          <input
            id="bill-upload"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => handleFileUpload(e, 'billOfSale')}
            className="hidden"
            data-testid={`input-bill-upload-${vehicleId}`}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Title</span>
            {titleUrl ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(titleUrl, '_blank')}
                  data-testid={`button-view-title-${vehicleId}`}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  View
                </Button>
                <label htmlFor="title-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingTitle}
                    onClick={() => document.getElementById('title-upload')?.click()}
                    data-testid={`button-upload-title-${vehicleId}`}
                  >
                    <Upload className="h-3 w-3 mr-1" />
                    Replace
                  </Button>
                </label>
              </div>
            ) : (
              <label htmlFor="title-upload">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploadingTitle}
                  onClick={() => document.getElementById('title-upload')?.click()}
                  data-testid={`button-upload-title-${vehicleId}`}
                >
                  <Upload className="h-3 w-3 mr-1" />
                  {uploadingTitle ? 'Uploading...' : 'Upload'}
                </Button>
              </label>
            )}
          </div>
          <input
            id="title-upload"
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            onChange={(e) => handleFileUpload(e, 'title')}
            className="hidden"
            data-testid={`input-title-upload-${vehicleId}`}
          />
        </div>
      </CardContent>
    </Card>
  );
}
