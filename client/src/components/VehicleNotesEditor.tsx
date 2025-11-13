import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageSquare, Save } from "lucide-react";

interface VehicleNotesEditorProps {
  vehicleId: string;
  initialNotes?: string | null;
}

export function VehicleNotesEditor({ vehicleId, initialNotes }: VehicleNotesEditorProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(initialNotes || "");
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state when initialNotes changes (e.g., after vehicle data loads)
  useEffect(() => {
    setNotes(initialNotes || "");
    setHasChanges(false);
  }, [initialNotes]);

  const updateNotesMutation = useMutation({
    mutationFn: async (newNotes: string) => {
      return apiRequest("PATCH", `/api/vehicles/${vehicleId}`, { 
        notes: newNotes 
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === "string" && key.startsWith("/api/vehicles");
        }
      });
      setHasChanges(false);
      toast({
        title: "Notes saved",
        description: "Vehicle notes have been updated",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Failed to save notes",
        description: error.message || "An error occurred",
      });
    },
  });

  const handleSave = () => {
    updateNotesMutation.mutate(notes);
  };

  const handleChange = (value: string) => {
    setNotes(value);
    setHasChanges(value !== (initialNotes || ""));
  };

  return (
    <Card data-testid={`card-notes-${vehicleId}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          Notes & Comments
        </CardTitle>
        {hasChanges && (
          <Button
            onClick={handleSave}
            size="sm"
            disabled={updateNotesMutation.isPending}
            data-testid={`button-save-notes-${vehicleId}`}
          >
            <Save className="h-3 w-3 mr-2" />
            {updateNotesMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Add notes or comments about this vehicle..."
          className="min-h-[120px] resize-y"
          data-testid={`textarea-notes-${vehicleId}`}
        />
        {hasChanges && (
          <p className="text-xs text-muted-foreground mt-2">
            You have unsaved changes
          </p>
        )}
      </CardContent>
    </Card>
  );
}
