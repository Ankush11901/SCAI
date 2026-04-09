"use client";

export interface PaymentMethodCardProps {
  hasPaymentMethod: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  isPro: boolean;
  onManageBilling?: () => void;
}

const BRAND_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  visa: { bg: "bg-blue-600", text: "text-white", label: "VISA" },
  mastercard: { bg: "bg-red-600", text: "text-white", label: "MC" },
  amex: { bg: "bg-blue-500", text: "text-white", label: "AMEX" },
  discover: { bg: "bg-orange-500", text: "text-white", label: "DISC" },
};

export function PaymentMethodCard({
  hasPaymentMethod,
  cardBrand,
  cardLast4,
  cardExpMonth,
  cardExpYear,
  isPro,
  onManageBilling,
}: PaymentMethodCardProps) {
  const formatBrand = (brand?: string) => {
    if (!brand) return "Card";
    return brand.charAt(0).toUpperCase() + brand.slice(1);
  };

  const brandStyle = BRAND_STYLES[cardBrand?.toLowerCase() ?? ""] ?? {
    bg: "bg-scai-border",
    text: "text-scai-text",
    label: "CARD",
  };

  const formatExpiry = () => {
    if (!cardExpMonth || !cardExpYear) return null;
    return `${cardExpMonth}/${cardExpYear}`;
  };

  return (
    <div className="rounded-xl border border-scai-border-bright bg-[#0a0a0a] p-6 flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-bold text-scai-text">Payment Methods</h3>
        {isPro && (
          <button
            onClick={onManageBilling}
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-scai-border-bright text-scai-text-sec hover:border-scai-brand1/50 hover:text-scai-text transition-colors"
          >
            Update Payment details
          </button>
        )}
      </div>

      {hasPaymentMethod && cardLast4 ? (
        <div className="space-y-4 flex-1 flex flex-col">
          {/* Card display */}
          <div className="rounded-lg border border-scai-border p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Brand logo pill */}
                <span
                  className={`px-2 py-1 text-[10px] font-bold rounded ${brandStyle.bg} ${brandStyle.text}`}
                >
                  {brandStyle.label}
                </span>
                <div>
                  <p className="text-sm font-medium text-scai-text">
                    {formatBrand(cardBrand)} &bull;&bull;&bull;&bull; {cardLast4}
                  </p>
                  {formatExpiry() && (
                    <p className="text-xs text-scai-text-sec">
                      Expires {formatExpiry()}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onManageBilling}
                  className="text-xs text-scai-text-sec hover:text-scai-text transition-colors"
                >
                  Remove
                </button>
                <button
                  onClick={onManageBilling}
                  className="text-xs text-scai-text-sec hover:text-scai-text transition-colors"
                >
                  Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg border border-scai-border p-4">
            <p className="text-sm text-scai-text-sec">
              {isPro
                ? "No payment method on file. Add one in the billing portal."
                : "No payment method needed for Free plan."}
            </p>
            {isPro && (
              <button
                onClick={onManageBilling}
                className="mt-3 text-sm font-medium text-scai-brand1 hover:text-scai-brand2 transition-colors"
              >
                Add Payment Method
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
