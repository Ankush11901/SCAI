import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getSubscription, getTransactionHistory } from "@/lib/services/billing-service";
import { 
  getCustomerInvoices, 
  isStripeConfigured,
} from "@/lib/services/stripe-service";

/**
 * GET /api/billing/history
 * Get billing history including invoices and credit transactions
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - type: 'all' | 'invoices' | 'transactions' (default: 'all')
 * 
 * Response: { invoices, transactions, pagination }
 */
export async function GET(request: NextRequest) {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;

    // Parse query params
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")));
    const type = searchParams.get("type") || "all";
    const offset = (page - 1) * limit;

    const response: {
      invoices?: Array<{
        id: string;
        date: string;
        amount: number;
        status: string;
        description: string;
        pdfUrl?: string;
        hostedUrl?: string;
      }>;
      transactions?: {
        items: Array<{
          id: string;
          date: string;
          type: string;
          amount: string;
          description: string;
        }>;
        hasMore: boolean;
      };
      pagination: {
        page: number;
        limit: number;
      };
    } = {
      pagination: { page, limit },
    };

    // Get Stripe invoices if requested and Stripe is configured
    if ((type === "all" || type === "invoices") && isStripeConfigured()) {
      const subscription = await getSubscription(userId);
      
      if (subscription.stripeCustomerId) {
        const stripeInvoices = await getCustomerInvoices(
          subscription.stripeCustomerId,
          limit
        );

        response.invoices = stripeInvoices.map((invoice) => ({
          id: invoice.id || `inv_${invoice.created}`,
          date: new Date(invoice.created * 1000).toISOString(),
          amount: invoice.amount_paid ?? 0,
          status: invoice.status || "unknown",
          description: invoice.description || 
            (invoice.lines.data[0]?.description || "Invoice"),
          pdfUrl: invoice.invoice_pdf || undefined,
          hostedUrl: invoice.hosted_invoice_url || undefined,
        }));
      } else {
        response.invoices = [];
      }
    }

    // Get credit transactions if requested
    if (type === "all" || type === "transactions") {
      const history = await getTransactionHistory(userId, limit, offset);
      
      response.transactions = {
        items: history.transactions.map((t) => ({
          id: t.id,
          date: t.date.toISOString(),
          type: t.type,
          amount: t.amount,
          description: t.description,
        })),
        hasMore: history.hasMore,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[billing/history] Error:", error);
    return NextResponse.json(
      { error: "Failed to get billing history" },
      { status: 500 }
    );
  }
}
