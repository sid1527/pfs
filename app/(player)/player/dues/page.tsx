"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { Wallet } from "lucide-react"
import { toast } from "sonner"

type Due = {
  id: string
  match_id: string
  amount_owed: number
  is_paid: boolean
  match?: { title: string }
}

export default function PlayerDuesPage() {
  const [dues, setDues] = useState<Due[]>([])
  const [loading, setLoading] = useState(true)
  const [payDialogOpen, setPayDialogOpen] = useState(false)
  const [selectedDue, setSelectedDue] = useState<Due | null>(null)

  const supabase = createClient()

  const fetchDues = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data } = await supabase
      .from("user_dues")
      .select(`
        id,
        match_id,
        amount_owed,
        is_paid,
        matches (title)
      `)
      .eq("user_id", user.id)
      .eq("is_paid", false)
      .gt("amount_owed", 0)

    setDues(
      (data ?? []).map((d) => {
        const row = d as unknown as { matches?: { title: string } | { title: string }[] | null }
        const m = Array.isArray(row.matches) ? row.matches[0] : row.matches
        return {
          ...d,
          match: m ? { title: m.title } : undefined,
        }
      })
    )
    setLoading(false)
  }

  useEffect(() => {
    fetchDues()
  }, [])

  const handleMarkPaid = (due: Due) => {
    setSelectedDue(due)
    setPayDialogOpen(true)
  }

  const handleConfirmPaid = async () => {
    if (!selectedDue) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from("user_dues")
      .update({
        is_paid: true,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", selectedDue.id)
      .eq("user_id", user.id)

    if (error) {
      toast.error("Failed to mark as paid")
      return
    }

    toast.success("Marked as paid! Waiting for admin approval.")
    setPayDialogOpen(false)
    setSelectedDue(null)
    fetchDues()
  }

  const totalUnpaid = dues.reduce((sum, d) => sum + Number(d.amount_owed), 0)

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">My Dues</h1>
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">My Dues</h1>

      {dues.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Wallet className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="font-medium">No pending dues!</p>
            <p className="text-sm text-muted-foreground">You&apos;re all caught up.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Total Pending</CardTitle>
              <CardDescription>Amount owed across all matches</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">₹{totalUnpaid.toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {dues.map((due) => (
              <Card key={due.id}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium">{due.match?.title ?? "Match"}</p>
                    <p className="text-sm text-muted-foreground">
                      ₹{Number(due.amount_owed).toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => handleMarkPaid(due)}>
                    Mark as Paid
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={payDialogOpen} onOpenChange={setPayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Scan the UPI QR code below to pay ₹
              {selectedDue ? Number(selectedDue.amount_owed).toLocaleString("en-IN") : "0"}{" "}
              for {selectedDue?.match?.title ?? ""}. After payment, click Confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="flex h-48 w-48 items-center justify-center rounded-lg border-2 border-dashed bg-muted">
              <p className="text-sm text-muted-foreground">UPI QR Placeholder</p>
            </div>
            <p className="text-center text-xs text-muted-foreground">
              In production, this would show your team&apos;s UPI QR code.
            </p>
            <Button onClick={handleConfirmPaid} className="w-full">
              I&apos;ve Paid - Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
