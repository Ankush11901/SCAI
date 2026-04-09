"use client";

import { useState } from "react";
import { Coins, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/Dialog";
import { CREDIT_PACKAGES } from "@/lib/billing/constants";
import { toast } from "sonner";

export interface CreditPackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreditPackModal({ isOpen, onClose }: CreditPackModalProps) {
  const [selectedPack, setSelectedPack] = useState<string>(
    CREDIT_PACKAGES.find((p) => "popular" in p && p.popular)?.id || CREDIT_PACKAGES[0]?.id || ""
  );
  const [loading, setLoading] = useState(false);

  const handlePurchase = async () => {
    if (!selectedPack || loading) return;
    setLoading(true);

    try {
      const packId = selectedPack.replace("credits_", "");

      const res = await fetch("/api/credits/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packId }),
      });

      if (!res.ok) {
        const data = await res.json();
        const errorMessage = data.error || "Failed to create checkout";
        
        // Show status-specific error messages
        if (res.status === 401) {
          toast.error('Authentication required', {
            description: 'Please sign in again to continue.',
            duration: 5000,
          });
        } else if (res.status === 503) {
          toast.error('Payment system temporarily unavailable', {
            description: 'Please try again in a few moments.',
            duration: 5000,
          });
        } else if (res.status === 400) {
          toast.error('Invalid credit pack selected', {
            description: errorMessage,
            duration: 5000,
          });
        } else {
          toast.error('Unable to purchase credits', {
            description: errorMessage,
            duration: 5000,
          });
        }
        return;
      }

      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Credit purchase error:", error);
      toast.error('Unable to connect to payment system', {
        description: 'Please check your connection and try again.',
        duration: 5000,
      });
    } finally {
      setLoading(false);
    }
  };

  const selected = CREDIT_PACKAGES.find((p) => p.id === selectedPack);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent showClose className="max-w-md p-0">
        {/* Header */}
        <DialogHeader className="p-5 pb-0 mb-0">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-lg bg-scai-brand1/20">
              <Coins className="w-5 h-5 text-scai-brand1" />
            </div>
            <div>
              <DialogTitle className="text-lg">Buy Credits</DialogTitle>
              <DialogDescription>
                Credits never expire and work with all features
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Pack Grid */}
        <div className="p-5">
          <div className="grid grid-cols-2 gap-3 mb-5">
            {CREDIT_PACKAGES.map((pack) => (
              <button
                key={pack.id}
                onClick={() => setSelectedPack(pack.id)}
                className={`relative p-4 rounded-lg border transition-all text-left ${
                  selectedPack === pack.id
                    ? "border-scai-brand1 bg-scai-brand1/10"
                    : "border-scai-border hover:border-scai-border-bright"
                }`}
              >
                {"popular" in pack && pack.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-scai-brand1 text-scai-page">
                    Popular
                  </span>
                )}
                {"savings" in pack && pack.savings && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-medium rounded-full bg-scai-brand2 text-scai-page">
                    {pack.savings}
                  </span>
                )}
                <div className="text-lg font-semibold text-scai-text">
                  {pack.credits.toLocaleString()}
                </div>
                <div className="text-xs text-scai-text-muted">credits</div>
                <div className="text-sm font-medium text-scai-text-sec mt-1">
                  ${pack.price}
                </div>
                {selectedPack === pack.id && (
                  <Check className="absolute top-3 right-3 w-4 h-4 text-scai-brand1" />
                )}
              </button>
            ))}
          </div>

          <Button
            variant="primary"
            className="w-full"
            disabled={loading}
            onClick={handlePurchase}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Redirecting to checkout...
              </>
            ) : (
              <>
                Buy {selected?.credits.toLocaleString()} Credits — $
                {selected?.price}
              </>
            )}
          </Button>

          <p className="text-xs text-scai-text-muted text-center mt-3">
            Secure checkout via Stripe. Credits are added instantly.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
