import { NextRequest, NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiTokens } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import crypto from "crypto";

// Token configuration
const TOKEN_PREFIX = "scai_";
const TOKEN_LENGTH = 32; // Characters after prefix

/**
 * Generate a secure random API token
 */
function generateToken(): { token: string; prefix: string; hash: string } {
  const randomBytes = crypto.randomBytes(TOKEN_LENGTH);
  const tokenBody = randomBytes.toString("base64url").slice(0, TOKEN_LENGTH);
  const token = `${TOKEN_PREFIX}${tokenBody}`;
  const prefix = `${TOKEN_PREFIX}${tokenBody.slice(0, 4)}****${tokenBody.slice(-4)}`;
  const hash = crypto.createHash("sha256").update(token).digest("hex");

  return { token, prefix, hash };
}

/**
 * Hash a token for comparison
 */
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * GET /api/tokens
 * List user's API tokens (masked)
 */
export async function GET() {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    // Get all non-revoked tokens for user
    const tokens = await db
      .select({
        id: apiTokens.id,
        name: apiTokens.name,
        tokenPrefix: apiTokens.tokenPrefix,
        scopes: apiTokens.scopes,
        lastUsedAt: apiTokens.lastUsedAt,
        expiresAt: apiTokens.expiresAt,
        createdAt: apiTokens.createdAt,
      })
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.userId, authSession.user.id),
          isNull(apiTokens.revokedAt)
        )
      )
      .orderBy(apiTokens.createdAt);

    return NextResponse.json({
      tokens: tokens.map((t) => ({
        id: t.id,
        name: t.name,
        prefix: t.tokenPrefix,
        scopes: t.scopes ? JSON.parse(t.scopes) : ["generate", "read"],
        lastUsedAt: t.lastUsedAt?.toISOString() || null,
        expiresAt: t.expiresAt?.toISOString() || null,
        createdAt: t.createdAt?.toISOString() || null,
        isExpired: t.expiresAt ? t.expiresAt < new Date() : false,
      })),
    });
  } catch (error) {
    console.error("[tokens] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to list tokens" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tokens
 * Create a new API token
 * 
 * Body: { name, scopes?: string[], expiresInDays?: number }
 * Response: { token, id } - token is only shown once!
 */
export async function POST(request: NextRequest) {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { 
      name, 
      scopes = ["generate", "read"], 
      expiresInDays 
    } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.length < 1 || name.length > 100) {
      return NextResponse.json(
        { error: "Name is required (1-100 characters)" },
        { status: 400 }
      );
    }

    // Validate scopes
    const validScopes = ["generate", "read", "usage", "admin"];
    if (!Array.isArray(scopes) || !scopes.every((s) => validScopes.includes(s))) {
      return NextResponse.json(
        { error: "Invalid scopes", validScopes },
        { status: 400 }
      );
    }

    // Check token limit (max 10 active tokens per user)
    const existingTokens = await db
      .select({ id: apiTokens.id })
      .from(apiTokens)
      .where(
        and(
          eq(apiTokens.userId, authSession.user.id),
          isNull(apiTokens.revokedAt)
        )
      );

    if (existingTokens.length >= 10) {
      return NextResponse.json(
        { error: "Maximum of 10 active tokens allowed. Please revoke unused tokens." },
        { status: 400 }
      );
    }

    // Generate token
    const { token, prefix, hash } = generateToken();

    // Calculate expiration
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    // Create token record
    const tokenId = crypto.randomUUID();
    await db.insert(apiTokens).values({
      id: tokenId,
      userId: authSession.user.id,
      name,
      tokenPrefix: prefix,
      tokenHash: hash,
      scopes: JSON.stringify(scopes),
      expiresAt,
    });

    // Return the token - this is the only time it will be shown!
    return NextResponse.json({
      id: tokenId,
      token,
      name,
      prefix,
      scopes,
      expiresAt: expiresAt?.toISOString() || null,
      warning: "Save this token securely. It will only be shown once!",
    });
  } catch (error) {
    console.error("[tokens] POST Error:", error);
    return NextResponse.json(
      { error: "Failed to create token" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tokens
 * Revoke an API token
 * 
 * Query: ?id=token_id
 */
export async function DELETE(request: NextRequest) {
  try {
    const authSession = await getAuthSession();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tokenId = searchParams.get("id");

    if (!tokenId) {
      return NextResponse.json(
        { error: "Token ID required" },
        { status: 400 }
      );
    }

    // Verify token belongs to user and revoke it
    const result = await db
      .update(apiTokens)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(apiTokens.id, tokenId),
          eq(apiTokens.userId, authSession.user.id),
          isNull(apiTokens.revokedAt)
        )
      );

    return NextResponse.json({
      success: true,
      message: "Token revoked successfully",
    });
  } catch (error) {
    console.error("[tokens] DELETE Error:", error);
    return NextResponse.json(
      { error: "Failed to revoke token" },
      { status: 500 }
    );
  }
}
