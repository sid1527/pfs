"use client"

import Link from "next/link"
import { Calendar, MapPin } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RSVPButton } from "@/components/RSVPButton"
import { cn } from "@/lib/utils"

export type Match = {
  id: string
  title: string
  match_type: string
  opponent_name: string | null
  match_date: string
  venue: string
  max_capacity: number
  status: string
  confirmed_count?: number
  user_rsvp?: { status: string } | null
}

export function MatchCard({
  match,
  userId,
  onRsvpChange,
}: {
  match: Match
  userId: string
  onRsvpChange?: () => void
}) {
  const spotsLeft = Math.max(0, match.max_capacity - (match.confirmed_count ?? 0))
  const isUpcoming = match.status === "Upcoming"

  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold">{match.title}</h3>
            {match.opponent_name && (
              <p className="text-sm text-muted-foreground">vs {match.opponent_name}</p>
            )}
          </div>
          {isUpcoming && (
            <Badge variant={spotsLeft > 0 ? "secondary" : "destructive"}>
              {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 shrink-0" />
            <span>{new Date(match.match_date).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{match.venue}</span>
          </div>
        </div>

        {isUpcoming && (
          <RSVPButton
            matchId={match.id}
            userId={userId}
            currentStatus={match.user_rsvp?.status}
            confirmedCount={match.confirmed_count ?? 0}
            maxCapacity={match.max_capacity}
            matchTitle={match.title}
            onSuccess={onRsvpChange}
          />
        )}

        {match.status === "Completed" && (
          <p className="text-sm text-muted-foreground">Match completed</p>
        )}
      </CardContent>
    </Card>
  )
}
