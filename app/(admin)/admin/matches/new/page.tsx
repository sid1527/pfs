"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function NewMatchPage() {
  const router = useRouter()
  const [matchType, setMatchType] = useState<"Internal" | "External">("Internal")
  const [title, setTitle] = useState("")
  const [opponentName, setOpponentName] = useState("")
  const [matchDate, setMatchDate] = useState("")
  const [venue, setVenue] = useState("")
  const [maxCapacity, setMaxCapacity] = useState(11)
  const [loading, setLoading] = useState(false)

  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("matches")
        .insert({
          title: title || (matchType === "Internal" ? "Internal Practice" : `vs ${opponentName}`),
          match_type: matchType,
          opponent_name: matchType === "External" ? opponentName : null,
          match_date: matchDate,
          venue,
          max_capacity: maxCapacity,
          status: "Upcoming",
        })
        .select("id")
        .single()

      if (error) throw error
      toast.success("Match created!")
      router.push(`/admin/matches/${data.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create match")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Create Match</h1>

      <Card>
        <CardHeader>
          <CardTitle>Match Details</CardTitle>
          <CardDescription>Add a new match or practice session</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Match Type</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="matchType"
                    value="Internal"
                    checked={matchType === "Internal"}
                    onChange={() => setMatchType("Internal")}
                    className="rounded"
                  />
                  Internal Practice
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="matchType"
                    value="External"
                    checked={matchType === "External"}
                    onChange={() => setMatchType("External")}
                    className="rounded"
                  />
                  External Opponent
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder={matchType === "Internal" ? "Internal Practice" : "Match vs Opponent"}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={loading}
              />
            </div>

            {matchType === "External" && (
              <div className="space-y-2">
                <Label htmlFor="opponent">Opponent Name</Label>
                <Input
                  id="opponent"
                  placeholder="Opponent team name"
                  value={opponentName}
                  onChange={(e) => setOpponentName(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="date">Match Date</Label>
              <Input
                id="date"
                type="datetime-local"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue</Label>
              <Input
                id="venue"
                placeholder="Ground name / address"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capacity">Max Capacity</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={maxCapacity}
                onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10) || 11)}
                disabled={loading}
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Match"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
