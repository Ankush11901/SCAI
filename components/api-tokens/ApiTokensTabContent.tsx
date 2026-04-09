"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CreateApiKeyCard,
  ApiKeysList,
  TokenRevealModal,
  type ApiKey,
} from "@/components/api-tokens";

export function ApiTokensTabContent() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newToken, setNewToken] = useState<{ name: string; value: string } | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch existing API keys on mount
  useEffect(() => {
    const fetchApiKeys = async () => {
      try {
        const res = await fetch('/api/tokens');
        if (res.ok) {
          const data = await res.json();
          setApiKeys(data.tokens.map((t: { id: string; name: string; maskedKey: string; createdAt: string; lastUsedAt?: string | null }) => ({
            id: t.id,
            name: t.name,
            prefix: t.maskedKey,
            status: "active" as const,
            createdAt: new Date(t.createdAt),
            lastUsedAt: t.lastUsedAt ? new Date(t.lastUsedAt) : undefined,
          })));
        }
      } catch (error) {
        console.error('Failed to fetch API keys:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchApiKeys();
  }, []);

  const handleCreateKey = async (name: string) => {
    try {
      const res = await fetch('/api/tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to create API key');
        throw new Error(error.error);
      }

      const data = await res.json();

      const newKey: ApiKey = {
        id: data.id,
        name: data.name,
        prefix: data.maskedKey,
        status: "active",
        createdAt: new Date(data.createdAt),
      };

      setApiKeys((prev) => [...prev, newKey]);
      setNewToken({ name: data.name, value: data.key });
      toast.success("API key created successfully");

      return { key: data.key };
    } catch (error) {
      console.error('Failed to create API key:', error);
      throw error;
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const res = await fetch(`/api/tokens?id=${id}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const error = await res.json();
        toast.error(error.error || 'Failed to delete API key');
        return;
      }

      setApiKeys((prev) => prev.filter((key) => key.id !== id));
      toast.success("API key deleted");
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toast.error('Failed to delete API key');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="w-6 h-6 animate-spin text-scai-brand1" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-start gap-3 p-4 rounded-lg bg-scai-brand1/5 border border-scai-brand1/20 mb-6">
          <Info className="w-5 h-5 text-scai-brand1 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-scai-text">API Access</p>
            <p className="text-xs text-scai-text-muted mt-1">
              Use API keys to access SCAI programmatically. Keys are shown once upon creation.
              Store them securely as you won&apos;t be able to see them again.
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CreateApiKeyCard
          onCreateKey={handleCreateKey}
        />

        <ApiKeysList
          keys={apiKeys}
          onDelete={handleDeleteKey}
        />
      </div>

      {newToken && (
        <TokenRevealModal
          isOpen={true}
          onClose={() => setNewToken(null)}
          keyName={newToken.name}
          token={newToken.value}
        />
      )}
    </div>
  );
}
