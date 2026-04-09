import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db, creditTransactions } from "@/lib/db";
import { eq, and, gte, sql, desc } from "drizzle-orm";

/**
 * GET /api/usage/history
 * Get daily credit usage history for the usage graph
 * 
 * Query params:
 * - period: '7d' | '30d' (default: '7d')
 * 
 * Response: { period, data: [{ date, credits }] }
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
    const period = searchParams.get("period") || "7d";
    const days = period === "30d" ? 30 : 7;

    // Calculate the start date (N days ago at midnight UTC)
    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - days + 1);

    // Get all debit transactions (negative amounts = usage)
    // Grouped by day
    const transactions = await db
      .select({
        day: sql<string>`date(${creditTransactions.createdAt}, 'unixepoch')`.as('day'),
        totalCredits: sql<number>`SUM(ABS(${creditTransactions.amount}))`.as('total_credits'),
      })
      .from(creditTransactions)
      .where(
        and(
          eq(creditTransactions.userId, userId),
          sql`${creditTransactions.amount} < 0`, // Only debit transactions (usage)
          gte(creditTransactions.createdAt, startDate)
        )
      )
      .groupBy(sql`date(${creditTransactions.createdAt}, 'unixepoch')`)
      .orderBy(sql`date(${creditTransactions.createdAt}, 'unixepoch')`);

    // Build a complete array with all days (filling in zeros for days with no usage)
    const data: Array<{ date: string; credits: number }> = [];
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    // Create a map of existing data
    const usageMap = new Map<string, number>();
    for (const t of transactions) {
      if (t.day) {
        usageMap.set(t.day, t.totalCredits || 0);
      }
    }

    // Fill in all days
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setUTCDate(startDate.getUTCDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      data.push({
        date: dateStr,
        credits: usageMap.get(dateStr) || 0,
      });
    }

    return NextResponse.json({
      period,
      data,
    }, {
      headers: {
        "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("[usage/history] Error:", error);
    return NextResponse.json(
      { error: "Failed to get usage history" },
      { status: 500 }
    );
  }
}
