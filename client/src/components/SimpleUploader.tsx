import { useState, useRef, useId } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface SimpleUploaderProps {
  directory?: string;
  onUploadComplete?: (url: string) => void;
  allowedMimeTypes?: string[];
  maxFileSizeMB?: number;
}

export function SimpleUploader({
  directory = "uploads",
  onUploadComplete,
  allowedMimeTypes = ["image/jpeg", "image/png", "application/pdf"],
  maxFileSizeMB = 10,
}: SimpleUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        // Validate file type
        if (!allowedMimeTypes.includes(file.type)) {
          throw new Error(`File type ${file.type} not allowed`);
        }

        // Validate file size
        if (file.size > maxFileSizeMB * 1024 * 1024) {
          throw new Error(`File size must be less than ${maxFileSizeMB}MB`);
        }

        // Get upload URL from server
        const response = await apiRequest("POST", "/api/objects/upload");
        const { uploadURL } = await response.json() as { uploadURL: string };

        // Upload file to object storage
        await fetch(uploadURL, {
          method: "PUT",
          body: file,
          headers: {
            "Content-Type": file.type,
          },
        });

        // Extract the file path from the upload URL
        const url = new URL(uploadURL);
        const filePath = url.pathname;
        
        setUploadedFiles(prev => [...prev, file.name]);
        onUploadComplete?.(filePath);
      }
    } catch (err: any) {
      setError(err.message || "Upload failed");
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      // Reset the input
      event.target.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <div className="border border-dashed border-border rounded-lg p-6 text-center">
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
        <p className="text-sm text-muted-foreground mb-3">
          Upload documents (PDF, JPEG, PNG)
        </p>
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            data-testid="button-upload"
          >
            {uploading ? (
              <>
                <Upload className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Choose Files
              </>
            )}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          id={inputId}
          type="file"
          multiple
          accept={allowedMimeTypes.join(",")}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <X className="h-4 w-4" />
          {error}
        </div>
      )}

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Uploaded Files:</p>
          {uploadedFiles.map((filename, idx) => (
            <div key={idx} className="flex items-center gap-2 p-2 bg-success/10 text-success rounded text-sm">
              <Check className="h-4 w-4" />
              {filename}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
