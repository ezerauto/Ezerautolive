import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, FileText, CheckCircle2, Clock, AlertCircle, Shield, Download, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";

type ContractRequiredSigner = {
  id: string;
  userId: string;
  role: string | null;
  sequenceOrder: number;
  signedAt: string | null;
  user: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
  } | null;
};

type ContractSignature = {
  id: string;
  userId: string;
  signedAt: string;
  dobVerified: boolean;
  typedName: string | null;
  documentHash: string | null;
};

type ContractDetail = {
  id: string;
  title: string;
  type: string;
  status: string;
  signatureStatus: string;
  contractDate: string;
  parties: string[];
  documentUrl: string | null;
  fullySignedAt: string | null;
  notes: string | null;
  requiredSigners: ContractRequiredSigner[];
  signatures: ContractSignature[];
};

export default function ContractDetail() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [showSignModal, setShowSignModal] = useState(false);
  const [dobInput, setDobInput] = useState("");
  const [typedName, setTypedName] = useState("");

  const { data: contract, isLoading } = useQuery<ContractDetail>({
    queryKey: ['/api/contracts', id],
  });

  const { data: currentUser } = useQuery<{ id: string; firstName: string | null; lastName: string | null }>({
    queryKey: ['/api/auth/user'],
  });

  const signMutation = useMutation({
    mutationFn: async (data: { dobInput: string; typedName: string }) => {
      return apiRequest('POST', `/api/contracts/${id}/sign`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contracts', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/contracts'] });
      setShowSignModal(false);
      setDobInput("");
      setTypedName("");
      toast({
        title: "Contract Signed",
        description: "Your signature has been recorded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Signature Failed",
        description: error.message || "Failed to sign contract. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSign = () => {
    if (!dobInput || !typedName) {
      toast({
        title: "Missing Information",
        description: "Please provide your date of birth and type your name.",
        variant: "destructive",
      });
      return;
    }
    signMutation.mutate({ dobInput, typedName });
  };

  if (isLoading) {
    return (
      <div className="container py-8" data-testid="contract-detail-loading">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading contract...</div>
        </div>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground">Contract not found</p>
            <Button onClick={() => navigate('/contracts')} className="mt-4" data-testid="button-back">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Contracts
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentUserSigner = currentUser && contract.requiredSigners.find(s => s.userId === currentUser.id);
  const hasUserSigned = currentUserSigner?.signedAt !== null;
  const canSign = currentUserSigner && !hasUserSigned;

  return (
    <div className="container py-8" data-testid="contract-detail-page">
      <Button
        variant="ghost"
        onClick={() => navigate('/contracts')}
        className="mb-6"
        data-testid="button-back-to-contracts"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Contracts
      </Button>

      <Card data-testid="card-contract-detail">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2" data-testid="text-contract-title">
                {contract.title}
              </CardTitle>
              <CardDescription className="flex items-center gap-4">
                <span data-testid="text-contract-date">
                  Contract Date: {format(new Date(contract.contractDate), 'MMMM d, yyyy')}
                </span>
                <Badge variant="outline" data-testid="badge-contract-type">{contract.type}</Badge>
              </CardDescription>
            </div>
            {contract.signatureStatus === 'completed' ? (
              <Badge className="bg-green-500 hover:bg-green-600" data-testid="badge-fully-signed">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Fully Signed
              </Badge>
            ) : contract.signatureStatus === 'in_progress' ? (
              <Badge className="bg-yellow-500 hover:bg-yellow-600" data-testid="badge-in-progress">
                <Clock className="h-3 w-3 mr-1" />
                Awaiting Signatures
              </Badge>
            ) : (
              <Badge variant="outline" data-testid="badge-pending">
                <AlertCircle className="h-3 w-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {contract.parties && contract.parties.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Parties</h3>
              <div className="flex flex-wrap gap-2">
                {contract.parties.map((party, idx) => (
                  <Badge key={idx} variant="secondary" data-testid={`badge-party-${idx}`}>{party}</Badge>
                ))}
              </div>
            </div>
          )}

          {contract.notes && (
            <div>
              <h3 className="font-semibold mb-2">Notes</h3>
              <p className="text-sm text-muted-foreground" data-testid="text-contract-notes">{contract.notes}</p>
            </div>
          )}

          {contract.documentUrl && (
            <>
              <Separator />
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Contract Document
                  </h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid="button-view-document"
                    >
                      <a href={contract.documentUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Open in New Tab
                      </a>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      data-testid="button-download-document"
                    >
                      <a href={contract.documentUrl} download>
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="border rounded-lg overflow-hidden bg-muted/20" data-testid="contract-document-preview">
                  {contract.documentUrl.toLowerCase().endsWith('.pdf') ? (
                    <iframe
                      src={contract.documentUrl}
                      className="w-full h-[600px]"
                      title="Contract Document Preview"
                    />
                  ) : (
                    <img
                      src={contract.documentUrl}
                      alt="Contract Document"
                      className="w-full h-auto"
                    />
                  )}
                </div>
              </div>
            </>
          )}

          <Separator />

          <div>
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Required Signers
            </h3>
            <div className="space-y-3" data-testid="signers-list">
              {contract.requiredSigners.map((signer) => (
                <div
                  key={signer.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                  data-testid={`signer-${signer.userId}`}
                >
                  <div>
                    <p className="font-medium" data-testid={`signer-name-${signer.userId}`}>
                      {signer.user?.firstName} {signer.user?.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">{signer.user?.email}</p>
                    {signer.role && (
                      <Badge variant="outline" className="mt-1" data-testid={`signer-role-${signer.userId}`}>
                        {signer.role}
                      </Badge>
                    )}
                  </div>
                  <div>
                    {signer.signedAt ? (
                      <div className="text-right">
                        <Badge className="bg-green-500 hover:bg-green-600" data-testid={`signer-signed-${signer.userId}`}>
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Signed
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(signer.signedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    ) : (
                      <Badge variant="outline" data-testid={`signer-pending-${signer.userId}`}>
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {contract.signatures.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-4">Signature Audit Trail</h3>
                <div className="space-y-2" data-testid="signatures-audit-trail">
                  {contract.signatures.map((sig) => (
                    <div key={sig.id} className="text-sm p-3 rounded-lg bg-muted" data-testid={`signature-${sig.id}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium" data-testid={`signature-name-${sig.id}`}>{sig.typedName}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(sig.signedAt), 'MMM d, yyyy h:mm:ss a')}
                        </span>
                      </div>
                      {sig.dobVerified && (
                        <p className="text-xs text-green-600 mt-1" data-testid={`signature-verified-${sig.id}`}>
                          <CheckCircle2 className="h-3 w-3 inline mr-1" />
                          Identity Verified
                        </p>
                      )}
                      {sig.documentHash && (
                        <p className="text-xs text-muted-foreground mt-1 font-mono" data-testid={`signature-hash-${sig.id}`}>
                          Hash: {sig.documentHash.substring(0, 16)}...
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {canSign && (
            <>
              <Separator />
              <div className="flex justify-end">
                <Button
                  onClick={() => setShowSignModal(true)}
                  size="lg"
                  data-testid="button-sign-contract"
                >
                  <Shield className="h-4 w-4 mr-2" />
                  Sign Contract
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={showSignModal} onOpenChange={setShowSignModal}>
        <DialogContent data-testid="dialog-sign-contract">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Sign Contract with Identity Verification
            </DialogTitle>
            <DialogDescription>
              To sign this contract, please verify your identity by providing your date of birth.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dob-input">Date of Birth</Label>
              <Input
                id="dob-input"
                type="date"
                value={dobInput}
                onChange={(e) => setDobInput(e.target.value)}
                data-testid="input-dob"
              />
              <p className="text-xs text-muted-foreground">
                This must match the date of birth on file for your account
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="typed-name">Type Your Full Name</Label>
              <Input
                id="typed-name"
                type="text"
                placeholder="Your Full Name"
                value={typedName}
                onChange={(e) => setTypedName(e.target.value)}
                data-testid="input-typed-name"
              />
              <p className="text-xs text-muted-foreground">
                By typing your name, you agree to electronically sign this contract
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSignModal(false)}
              disabled={signMutation.isPending}
              data-testid="button-cancel-sign"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSign}
              disabled={signMutation.isPending || !dobInput || !typedName}
              data-testid="button-confirm-sign"
            >
              {signMutation.isPending ? "Signing..." : "Sign Contract"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
