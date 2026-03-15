"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type RsvpStatus = "CONFIRMED" | "WAITLISTED" | "OUT"

export function RSVPButton({
  matchId,
  userId,
  currentStatus,
  confirmedCount,
  maxCapacity,
  matchTitle,
  onSuccess,
}: {
  matchId: string
  userId: string
  currentStatus?: string
  confirmedCount: number
  maxCapacity: number
  matchTitle: string
  onSuccess?: () => void
}) {
  const [status, setStatus] = useState<RsvpStatus | undefined>(
    (currentStatus as RsvpStatus) ?? undefined
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setStatus((currentStatus as RsvpStatus) ?? undefined)
  }, [currentStatus])

  const supabase = createClient()

  const handleIn = async () => {
    const newStatus: RsvpStatus = "WAITLISTED"
    const prevStatus = status
    setStatus(newStatus)
    setLoading(true)
    try {
      const { error } = await supabase.from("rsvps").upsert(
        {
          match_id: matchId,
          user_id: userId,
          status: newStatus,
          created_at: new Date().toISOString(),
        },
        { onConflict: "match_id,user_id" }
      )
      if (error) throw error
      toast.success("You're on the waitlist. Captain will confirm the squad.")
      onSuccess?.()
    } catch (err) {
      setStatus(prevStatus)
      toast.error(err instanceof Error ? err.message : "Failed to update RSVP")
    } finally {
      setLoading(false)
    }
  }

  const handleOut = async () => {
    const prevStatus = status
    setStatus("OUT")
    setLoading(true)
    try {
      const { error } = await supabase.from("rsvps").upsert(
        {
          match_id: matchId,
          user_id: userId,
          status: "OUT",
          created_at: new Date().toISOString(),
        },
        { onConflict: "match_id,user_id" }
      )
      if (error) throw error
      toast.success("You're out. No worries!")
      onSuccess?.()
    } catch (err) {
      setStatus(prevStatus)
      toast.error(err instanceof Error ? err.message : "Failed to update RSVP")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className={cn(
          "min-h-[44px]",
          "flex-1",
          status === "CONFIRMED" || status === "WAITLISTED"
            ? "bg-green-600 hover:bg-green-700"
            : ""
        )}
        onClick={handleIn}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          "I am IN"
        )}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={cn("flex-1 min-h-[44px]", status === "OUT" ? "bg-muted" : "")}
        onClick={handleOut}
        disabled={loading}
      >
        I am OUT
      </Button>
    </div>
  )
}
