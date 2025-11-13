import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Camera, Upload, X } from "lucide-react";

interface VehiclePhotoUploaderProps {
  vehicleId: string;
  currentPhotos?: string[] | null;
}

export function VehiclePhotoUploader({ vehicleId, currentPhotos }: VehiclePhotoUploaderProps) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>(currentPhotos || []);

  const updatePhotosMutation = useMutation({
    mutationFn: async (photoUrls: string[]) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicleId}`, { photoUrls });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      toast({
        title: "Photos updated",
        description: "Vehicle photos have been saved",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to update photos",
        description: error.message || "An error occurred",
      });
    },
  });

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      const newPhotoUrls: string[] = [];

      for (const file of Array.from(files)) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File ${file.name} is not an image`);
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
          throw new Error(`File ${file.name} is too large (max 10MB)`);
        }

        // Get upload URL from server
        const response = await apiRequest("POST", "/api/objects/upload", {
          directory: `vehicles/${vehicleId}/photos`,
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

        newPhotoUrls.push(publicURL || uploadURL);
      }

      const updatedPhotos = [...uploadedFiles, ...newPhotoUrls];
      setUploadedFiles(updatedPhotos);
      updatePhotosMutation.mutate(updatedPhotos);

    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Upload failed",
        description: err.message || "Failed to upload photos",
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleRemovePhoto = (index: number) => {
    const updatedPhotos = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(updatedPhotos);
    updatePhotosMutation.mutate(updatedPhotos);
  };

  return (
    <Card data-testid={`card-photo-upload-${vehicleId}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Camera className="h-4 w-4 text-muted-foreground" />
          Vehicle Photos
        </CardTitle>
        <label htmlFor="photo-upload">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || updatePhotosMutation.isPending}
            onClick={() => document.getElementById('photo-upload')?.click()}
            data-testid={`button-upload-photos-${vehicleId}`}
          >
            <Upload className="h-3 w-3 mr-2" />
            {uploading ? 'Uploading...' : 'Add Photos'}
          </Button>
        </label>
        <input
          id="photo-upload"
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          data-testid={`input-photo-upload-${vehicleId}`}
        />
      </CardHeader>
      <CardContent>
        {uploadedFiles.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {uploadedFiles.map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={`Vehicle photo ${idx + 1}`}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleRemovePhoto(idx)}
                  data-testid={`button-remove-photo-${vehicleId}-${idx}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No photos uploaded yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
