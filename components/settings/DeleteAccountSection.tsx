"use client"

import { useState } from "react"
import { AlertTriangle, Trash2, Loader2 } from "lucide-react"
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
import { toast } from "sonner"
import { signOut } from "@/lib/auth-client"
import { motion } from "motion/react"

interface DeleteAccountSectionProps {
  userEmail: string
}

export function DeleteAccountSection({ userEmail }: DeleteAccountSectionProps) {
  const [showDialog, setShowDialog] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState("")
  const [deleting, setDeleting] = useState(false)

  const emailMatches = confirmEmail.toLowerCase() === userEmail.toLowerCase()

  const handleDelete = async () => {
    if (!emailMatches) return

    setDeleting(true)
    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmEmail }),
      })

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error || "Failed to delete account")
        setDeleting(false)
        return
      }

      toast.success("Account deleted successfully")
      await signOut({
        fetchOptions: {
          onSuccess: () => {
            window.location.href = "/"
          },
        },
      })
    } catch {
      toast.error("An error occurred while deleting your account")
      setDeleting(false)
    }
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="flex items-center justify-between gap-4 rounded-xl border border-error/20 bg-error/5 px-5 py-3.5"
      >
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-4 h-4 text-error flex-shrink-0" />
          <p className="text-sm text-scai-text-sec truncate">
            Permanently delete your account and all associated data
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-error hover:bg-error/10 flex-shrink-0"
          onClick={() => setShowDialog(true)}
        >
          <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          Delete Account
        </Button>
      </motion.div>

      <Dialog open={showDialog} onOpenChange={(open) => {
        setShowDialog(open)
        if (!open) {
          setConfirmEmail("")
          setDeleting(false)
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-error">Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently delete your account and all data. This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <p className="text-sm text-scai-text-sec">
              Type{" "}
              <span className="font-mono bg-scai-input px-1.5 py-0.5 rounded text-scai-text">
                {userEmail}
              </span>{" "}
              to confirm:
            </p>
            <Input
              value={confirmEmail}
              onChange={e => setConfirmEmail(e.target.value)}
              placeholder="Enter your email to confirm"
              disabled={deleting}
            />
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3">
            <Button
              variant="secondary"
              onClick={() => setShowDialog(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              className="text-error border-error/30 hover:bg-error/10"
              onClick={handleDelete}
              disabled={!emailMatches || deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Permanently Delete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
