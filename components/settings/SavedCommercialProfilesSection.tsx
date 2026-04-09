"use client"

import { useState, useEffect, useCallback } from "react"
import { Briefcase, Plus, Pencil, Trash2, Loader2, Tag } from "lucide-react"
import { SettingsCard } from "@/components/ui/SettingsCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/Select"
import { toast } from "sonner"

interface SavedCommercialProfile {
  id: string
  label: string
  productName?: string | null
  category?: string | null
  targetAudience?: string | null
  painPoint?: string | null
  keyBenefits?: string | null
  keyFeatures?: string | null
  uniqueValue?: string | null
  ctaSuggestion?: string | null
  pricePosition?: string | null
}

const EMPTY_FORM = {
  label: "",
  productName: "",
  category: "",
  targetAudience: "",
  painPoint: "",
  keyBenefits: "",
  keyFeatures: "",
  uniqueValue: "",
  ctaSuggestion: "",
  pricePosition: "",
}

export function SavedCommercialProfilesSection() {
  const [profiles, setProfiles] = useState<SavedCommercialProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<SavedCommercialProfile | null>(null)

  const fetchProfiles = useCallback(async () => {
    try {
      const res = await fetch("/api/user/commercial-profiles")
      if (res.ok) {
        const data = await res.json()
        setProfiles(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProfiles()
  }, [fetchProfiles])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (p: SavedCommercialProfile) => {
    setEditingId(p.id)
    setForm({
      label: p.label || "",
      productName: p.productName || "",
      category: p.category || "",
      targetAudience: p.targetAudience || "",
      painPoint: p.painPoint || "",
      keyBenefits: p.keyBenefits || "",
      keyFeatures: p.keyFeatures || "",
      uniqueValue: p.uniqueValue || "",
      ctaSuggestion: p.ctaSuggestion || "",
      pricePosition: p.pricePosition || "",
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.label.trim()) {
      toast.error("Profile label is required")
      return
    }
    setSaving(true)
    try {
      const url = editingId
        ? `/api/user/commercial-profiles/${editingId}`
        : "/api/user/commercial-profiles"
      const method = editingId ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to save")
        return
      }

      toast.success(editingId ? "Profile updated" : "Profile saved")
      setDialogOpen(false)
      fetchProfiles()
    } catch {
      toast.error("Failed to save profile")
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const id = deleteTarget.id
    try {
      const res = await fetch(`/api/user/commercial-profiles/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Profile deleted")
        setProfiles(prev => prev.filter(p => p.id !== id))
      } else {
        toast.error("Failed to delete")
      }
    } catch {
      toast.error("Failed to delete")
    }
  }

  const updateField = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const PRICE_OPTIONS = [
    { value: "none", label: "Not specified" },
    { value: "budget", label: "Budget" },
    { value: "mid-range", label: "Mid-range" },
    { value: "premium", label: "Premium" },
    { value: "enterprise", label: "Enterprise" },
  ]

  return (
    <SettingsCard
      icon={<Briefcase className="w-5 h-5 text-scai-brand2" />}
      title="Saved Product Profiles"
      description="Save product/service profiles for commercial articles"
      delay={0.3}
    >
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-scai-text-sec" />
          </div>
        ) : profiles.length === 0 ? (
          <div className="text-center py-6 text-sm text-scai-text-sec">
            <Briefcase className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No saved product profiles yet.</p>
            <p className="text-xs mt-1">Save a product/service profile to quickly fill in details when generating commercial articles.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {profiles.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-scai-border bg-scai-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.label}</div>
                  {(p.productName || p.category) && (
                    <div className="flex items-center gap-1 text-xs text-scai-text-sec mt-0.5">
                      <Tag className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {[p.productName, p.category].filter(Boolean).join(" · ")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  <button
                    onClick={() => openEdit(p)}
                    className="p-1.5 rounded-md text-scai-text-sec hover:text-scai-text hover:bg-scai-input transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="p-1.5 rounded-md transition-colors text-scai-text-sec hover:text-error hover:bg-error/10"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Button
          variant="secondary"
          size="sm"
          onClick={openCreate}
          disabled={profiles.length >= 20}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Product Profile
        </Button>
        {profiles.length >= 20 && (
          <p className="text-xs text-scai-text-sec text-center">Maximum 20 profiles reached</p>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Product Profile" : "Add Product Profile"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update your product/service details."
                : "Save a product/service profile to quickly fill in details when generating commercial articles."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <Input
              label="Profile Label *"
              value={form.label}
              onChange={e => updateField("label", e.target.value)}
              placeholder="e.g. Acme CRM Pro"
            />
            <Input
              label="Product / Service Name"
              value={form.productName}
              onChange={e => updateField("productName", e.target.value)}
              placeholder="e.g. Acme CRM Pro"
            />
            <Input
              label="Category"
              value={form.category}
              onChange={e => updateField("category", e.target.value)}
              placeholder="e.g. SaaS, Consulting, E-commerce"
            />
            <Input
              label="Target Audience"
              value={form.targetAudience}
              onChange={e => updateField("targetAudience", e.target.value)}
              placeholder="e.g. Small business owners"
            />
            <Input
              label="Pain Point"
              value={form.painPoint}
              onChange={e => updateField("painPoint", e.target.value)}
              placeholder="e.g. Losing track of customer interactions"
            />
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-scai-text-sec">Price Position</label>
              <Select
                value={form.pricePosition || "none"}
                onValueChange={(val) => updateField("pricePosition", val === "none" ? "" : val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Not specified" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Input
                label="Key Benefits"
                value={form.keyBenefits}
                onChange={e => updateField("keyBenefits", e.target.value)}
                placeholder="e.g. Save time, increase revenue, reduce churn"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Key Features"
                value={form.keyFeatures}
                onChange={e => updateField("keyFeatures", e.target.value)}
                placeholder="e.g. Contact management, email automation, analytics"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="Unique Selling Point"
                value={form.uniqueValue}
                onChange={e => updateField("uniqueValue", e.target.value)}
                placeholder="e.g. Only CRM with built-in AI assistant"
              />
            </div>
            <div className="col-span-2">
              <Input
                label="CTA Suggestion"
                value={form.ctaSuggestion}
                onChange={e => updateField("ctaSuggestion", e.target.value)}
                placeholder="e.g. Start Your Free Trial Today"
              />
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button variant="secondary" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving || !form.label.trim()}>
              {saving ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : editingId ? (
                "Save Changes"
              ) : (
                "Save Profile"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}
        title="Delete Product Profile"
        description={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </SettingsCard>
  )
}
