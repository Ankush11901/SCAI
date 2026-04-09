"use client";

import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  SubscriptionCard,
  PaymentMethodCard,
  AddOnCreditsCard,
  InvoiceTable,
  CreditPackModal,
  CreditTransactionTable,
  PlanComparison,
  type Invoice,
} from "@/components/billing";
import { PLANS } from "@/lib/billing/constants";

export function BillingTabContent() {
  const [showCreditPackModal, setShowCreditPackModal] = useState(false);
  const [showPlanComparison, setShowPlanComparison] = useState(false);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [managingBilling, setManagingBilling] = useState(false);
  const [billingData, setBillingData] = useState<{
    tier: string;
    subscription: { status: string; planType?: string; currentPeriodEnd?: string } | null;
    credits: {
      daily: { used: number; limit: number };
      monthly: { used: number; limit: number };
      payg: number;
    };
    paymentMethod?: { brand: string; last4: string; expMonth: number; expYear: number } | null;
  } | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // Fetch billing data on mount
  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        const cacheBust = `_t=${Date.now()}`;
        const [billingRes, historyRes] = await Promise.all([
          fetch(`/api/billing?${cacheBust}`, { cache: 'no-store' }),
          fetch(`/api/billing/history?${cacheBust}`, { cache: 'no-store' }),
        ]);

        if (billingRes.ok) {
          const data = await billingRes.json();
          setBillingData(data);
        }

        if (historyRes.ok) {
          const data = await historyRes.json();
          setInvoices(data.invoices || []);
        }
      } catch (error) {
        console.error('Failed to fetch billing data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBillingData();

    // If returning from Stripe checkout, poll for subscription activation
    const params = new URLSearchParams(window.location.search);
    if (params.has('success') || params.has('session_id') || params.has('purchase')) {
      window.history.replaceState({}, '', `${window.location.pathname}?tab=billing`);

      const pollForActivation = async () => {
        const toastId = toast.loading('Processing your payment...', {
          description: 'This may take a few moments.',
        });

        const maxAttempts = 15; // 30 seconds (2 sec interval)
        let attempts = 0;
        let activated = false;

        const checkStatus = async (): Promise<boolean> => {
          try {
            const res = await fetch(`/api/billing/sync?_t=${Date.now()}`, { 
              cache: 'no-store' 
            });
            
            if (res.ok) {
              const data = await res.json();
              // Check if subscription is now active
              if (data.subscription?.status === 'active') {
                return true;
              }
            }
          } catch (error) {
            console.error('[billing] Poll error:', error);
          }
          return false;
        };

        // Poll loop
        const pollInterval = setInterval(async () => {
          attempts++;
          
          const isActive = await checkStatus();
          
          if (isActive) {
            activated = true;
            clearInterval(pollInterval);
            toast.dismiss(toastId);
            toast.success('Payment successful!', {
              description: 'Your subscription is now active.',
              duration: 5000,
            });
            await fetchBillingData();
            return;
          }

          if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            
            // Timeout reached - try manual sync as fallback
            try {
              const syncRes = await fetch('/api/billing/sync', { method: 'POST' });
              if (syncRes.ok) {
                const syncData = await syncRes.json();
                if (syncData.synced || syncData.tier === 'pro') {
                  toast.dismiss(toastId);
                  toast.success('Payment processed', {
                    description: 'There was a delay, but your subscription is now active.',
                    duration: 6000,
                  });
                  await fetchBillingData();
                  return;
                }
              }
            } catch (error) {
              console.error('[billing] Sync fallback failed:', error);
            }

            // Still not activated - show warning
            toast.dismiss(toastId);
            toast.warning('Payment is processing', {
              description: 'Your payment may still be processing. Please refresh in a few minutes or contact support if this persists.',
              duration: 8000,
            });
            await fetchBillingData();
          }
        }, 2000);
      };

      // Start polling after a short delay
      setTimeout(pollForActivation, 1000);
    }
  }, []);

  // Handle upgrade / change plan with period selection
  const handleChangePlan = async (period: 'monthly' | 'yearly' = 'monthly') => {
    setUpgrading(true);
    try {
      const res = await fetch('/api/billing/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } else {
        const error = await res.json();
        const errorMessage = error.error || 'Failed to start checkout';
        
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
          toast.error('Invalid plan selection', {
            description: errorMessage,
            duration: 5000,
          });
        } else {
          toast.error('Unable to start subscription checkout', {
            description: errorMessage,
            duration: 5000,
          });
        }
        setUpgrading(false);
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Unable to connect to payment system', {
        description: 'Please check your connection and try again.',
        duration: 5000,
      });
      setUpgrading(false);
    }
  };

  // Handle manage billing portal
  const handleManageBilling = async () => {
    setManagingBilling(true);
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.portalUrl) {
          window.location.href = data.portalUrl;
          return;
        }
      }
      
      const error = await res.json();
      const errorMessage = error.error || 'Failed to open billing portal';
      
      // Show status-specific error messages
      if (res.status === 401) {
        toast.error('Authentication required', {
          description: 'Please sign in again to access billing portal.',
          duration: 5000,
        });
      } else if (res.status === 503) {
        toast.error('Billing portal temporarily unavailable', {
          description: 'Please try again in a few moments.',
          duration: 5000,
        });
      } else {
        toast.error('Unable to open billing portal', {
          description: errorMessage,
          duration: 5000,
        });
      }
      setManagingBilling(false);
    } catch (error) {
      console.error('Portal error:', error);
      toast.error('Unable to connect to billing system', {
        description: 'Please check your connection and try again.',
        duration: 5000,
      });
      setManagingBilling(false);
    }
  };

  // Handle buy credits
  const handleBuyCredits = () => {
    setShowCreditPackModal(true);
  };

  // Handle view plans
  const handleViewPlans = () => {
    setShowPlanComparison(true);
  };

  // Handle plan selection from comparison view
  const handleSelectPlan = (plan: 'free' | 'pro', period: 'monthly' | 'yearly') => {
    if (plan === 'pro') {
      handleChangePlan(period);
    }
    // Free plan: user is already free or needs to downgrade via Stripe portal
  };

  // Handle invoice download
  const handleDownloadInvoice = (invoiceId: string) => {
    const invoice = invoices.find(i => i.id === invoiceId);
    if (invoice?.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-scai-brand1" />
      </div>
    );
  }

  // Debug: Override tier with URL parameter (?tier=pro or ?tier=free)
  let tier = (billingData?.tier || 'free') as 'free' | 'pro';
  if (typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const tierParam = params.get('tier');
    if (tierParam === 'pro' || tierParam === 'free') {
      tier = tierParam;
      // Mock Pro subscription data for debug view
      if (tierParam === 'pro' && billingData) {
        billingData.subscription = {
          status: 'active',
          planType: 'monthly',
          currentPeriodEnd: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
        };
      }
    }
  }

  const isPro = tier === 'pro';
  const pm = billingData?.paymentMethod;
  const planType = (billingData?.subscription?.planType || 'monthly') as 'monthly' | 'yearly';
  const planFeatures = isPro ? [...PLANS.pro.features] : [...PLANS.free.features];
  const price = isPro
    ? (planType === 'yearly' ? PLANS.pro.priceYearly : PLANS.pro.price)
    : PLANS.free.price;

  // Show Plan Comparison view
  if (showPlanComparison) {
    return (
      <PlanComparison
        currentTier={tier}
        onSelectPlan={handleSelectPlan}
        onBack={() => setShowPlanComparison(false)}
        isLoading={upgrading}
        loadingPlan={upgrading ? 'pro' : null}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-xl font-bold text-scai-text">Subscriptions</h2>
        <p className="text-sm text-scai-text-sec mt-1">
          Manage your subscription plan and payment details
        </p>
      </div>

      {/* Main Grid: Subscription + Payment Methods */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-4 items-stretch">
        {/* Left: Subscription Card */}
        <SubscriptionCard
          tier={tier}
          status={billingData?.subscription?.status as "active" | "canceled" | "past_due" | undefined}
          planType={planType}
          renewalDate={billingData?.subscription?.currentPeriodEnd}
          features={planFeatures}
          price={price}
          isLoading={upgrading}
          isManageLoading={managingBilling}
          onChangePlan={() => handleChangePlan('monthly')}
          onManageBilling={handleManageBilling}
          onViewPlans={handleViewPlans}
        />

        {/* Right: Payment Methods + Add-on Credits */}
        <div className="flex flex-col gap-4">
          <PaymentMethodCard
            hasPaymentMethod={!!pm}
            cardBrand={pm?.brand}
            cardLast4={pm?.last4}
            cardExpMonth={pm?.expMonth}
            cardExpYear={pm?.expYear}
            isPro={isPro}
            onManageBilling={handleManageBilling}
          />

          {isPro && (
            <AddOnCreditsCard
              balance={billingData?.credits?.payg || 0}
              onBuyMore={handleBuyCredits}
            />
          )}
        </div>
      </div>

      {/* Billing History */}
      <InvoiceTable
        invoices={invoices}
        onDownload={handleDownloadInvoice}
      />

      {/* Credit Transactions */}
      <CreditTransactionTable />

      {/* Credit Pack Purchase Modal */}
      <CreditPackModal
        isOpen={showCreditPackModal}
        onClose={() => setShowCreditPackModal(false)}
      />
    </div>
  );
}
