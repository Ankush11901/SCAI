"use client"

import { useState, useEffect, useCallback } from "react"
import { Building2, Plus, Pencil, Trash2, Loader2, MapPin } from "lucide-react"
import { SettingsCard } from "@/components/ui/SettingsCard"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { PhoneInput } from "@/components/ui/PhoneInput"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/Dialog"
import { ConfirmDialog } from "@/components/ui/ConfirmDialog"
import { toast } from "sonner"

interface SavedBusiness {
  id: string
  label: string
  businessName?: string | null
  phone?: string | null
  hours?: string | null
  city?: string | null
  stateRegion?: string | null
  postalCode?: string | null
  servicesOffered?: string | null
  email?: string | null
  website?: string | null
  gbpUrl?: string | null
}

const EMPTY_FORM = {
  label: "",
  businessName: "",
  phone: "",
  hours: "",
  city: "",
  stateRegion: "",
  postalCode: "",
  servicesOffered: "",
  email: "",
  website: "",
  gbpUrl: "",
}

export function SavedBusinessesSection() {
  const [businesses, setBusinesses] = useState<SavedBusiness[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [deleteTarget, setDeleteTarget] = useState<SavedBusiness | null>(null)

  const fetchBusinesses = useCallback(async () => {
    try {
      const res = await fetch("/api/user/businesses")
      if (res.ok) {
        const data = await res.json()
        setBusinesses(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchBusinesses()
  }, [fetchBusinesses])

  const openCreate = () => {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (b: SavedBusiness) => {
    setEditingId(b.id)
    setForm({
      label: b.label || "",
      businessName: b.businessName || "",
      phone: b.phone || "",
      hours: b.hours || "",
      city: b.city || "",
      stateRegion: b.stateRegion || "",
      postalCode: b.postalCode || "",
      servicesOffered: b.servicesOffered || "",
      email: b.email || "",
      website: b.website || "",
      gbpUrl: b.gbpUrl || "",
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
        ? `/api/user/businesses/${editingId}`
        : "/api/user/businesses"
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
      fetchBusinesses()
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
      const res = await fetch(`/api/user/businesses/${id}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Profile deleted")
        setBusinesses(prev => prev.filter(b => b.id !== id))
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

  return (
    <SettingsCard
      icon={<Building2 className="w-5 h-5 text-scai-brand1" />}
      title="Saved Businesses"
      description="Save business profiles for local SEO articles"
      delay={0.2}
    >
      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-scai-text-sec" />
          </div>
        ) : businesses.length === 0 ? (
          <div className="text-center py-6 text-sm text-scai-text-sec">
            <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p>No saved businesses yet.</p>
            <p className="text-xs mt-1">Save a business profile to quickly fill in local SEO details.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {businesses.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-lg border border-scai-border bg-scai-surface px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{b.label}</div>
                  {(b.city || b.stateRegion) && (
                    <div className="flex items-center gap-1 text-xs text-scai-text-sec mt-0.5">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {[b.city, b.stateRegion].filter(Boolean).join(", ")}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1 ml-3 flex-shrink-0">
                  <button
                    onClick={() => openEdit(b)}
                    className="p-1.5 rounded-md text-scai-text-sec hover:text-scai-text hover:bg-scai-input transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(b)}
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
          disabled={businesses.length >= 20}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Business Profile
        </Button>
        {businesses.length >= 20 && (
          <p className="text-xs text-scai-text-sec text-center">Maximum 20 profiles reached</p>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Business Profile" : "Add Business Profile"}</DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update your business details."
                : "Save a business profile to quickly fill in local SEO details when generating articles."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-x-4 gap-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <Input
              label="Profile Label *"
              value={form.label}
              onChange={e => updateField("label", e.target.value)}
              placeholder="e.g. Portland Plumbing Co."
            />
            <Input
              label="Business Name"
              value={form.businessName}
              onChange={e => updateField("businessName", e.target.value)}
              placeholder="e.g. City Plumbing Co."
            />
            <PhoneInput
              label="Phone Number"
              value={form.phone}
              onChange={phone => updateField("phone", phone)}
            />
            <Input
              label="Business Hours"
              value={form.hours}
              onChange={e => updateField("hours", e.target.value)}
              placeholder="e.g. Mon-Fri 8am-6pm, Sat 9am-3pm"
            />
            <Input
              label="City"
              value={form.city}
              onChange={e => updateField("city", e.target.value)}
              placeholder="e.g. Portland"
            />
            <Input
              label="State / Region"
              value={form.stateRegion}
              onChange={e => updateField("stateRegion", e.target.value)}
              placeholder="e.g. OR or Ontario"
            />
            <Input
              label="Postal Code"
              value={form.postalCode}
              onChange={e => updateField("postalCode", e.target.value)}
              placeholder="e.g. 97201 or M5V 3A8"
            />
            <Input
              label="Services Offered"
              value={form.servicesOffered}
              onChange={e => updateField("servicesOffered", e.target.value)}
              placeholder="e.g. Drain cleaning, pipe repair"
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={e => updateField("email", e.target.value)}
              placeholder="e.g. info@cityplumbing.com"
            />
            <Input
              label="Website"
              value={form.website}
              onChange={e => updateField("website", e.target.value)}
              placeholder="e.g. https://cityplumbing.com"
            />
            <div className="col-span-2">
              <Input
                label="Google Business Profile URL"
                value={form.gbpUrl}
                onChange={e => updateField("gbpUrl", e.target.value)}
                placeholder="e.g. https://maps.google.com/..."
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
        title="Delete Business Profile"
        description={`Are you sure you want to delete "${deleteTarget?.label}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </SettingsCard>
  )
}
