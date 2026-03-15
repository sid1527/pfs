"use client"

import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowUp, ArrowDown } from "lucide-react"
import { cn } from "@/lib/utils"

export type PlayerWithStats = {
  id: string
  full_name: string | null
  player_type: string | null
  profile_photo_url: string | null
  recent_form: string | null
  last_active: string | null
  reliability_percent: number | null
}

function getActivityLevel(lastActive: string | null): string {
  if (!lastActive) return "Inactive"
  const days = (Date.now() - new Date(lastActive).getTime()) / (1000 * 60 * 60 * 24)
  if (days <= 1) return "Very Active"
  if (days <= 7) return "Active"
  if (days <= 30) return "Moderate"
  return "Inactive"
}

export function PlayerCard({
  player,
  onMoveToConfirmed,
  onMoveOut,
  showMoveToConfirmed,
  showMoveOut,
  disabled,
}: {
  player: PlayerWithStats
  onMoveToConfirmed?: () => void
  onMoveOut?: () => void
  showMoveToConfirmed?: boolean
  showMoveOut?: boolean
  disabled?: boolean
}) {
  const activityLevel = getActivityLevel(player.last_active)

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-muted">
          {player.profile_photo_url ? (
            <Image
              src={player.profile_photo_url}
              alt={player.full_name ?? "Player"}
              fill
              className="object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-medium text-muted-foreground">
              {(player.full_name ?? "?")[0]}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{player.full_name ?? "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{player.player_type ?? "-"}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs">
            <span title="Reliability">
              Rel: {player.reliability_percent ?? 0}%
            </span>
            <span title="Activity">· {activityLevel}</span>
          </div>
          {player.recent_form && (
            <p className="mt-1 truncate text-xs text-muted-foreground" title={player.recent_form}>
              {player.recent_form}
            </p>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          {showMoveToConfirmed && (
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onMoveToConfirmed}
              disabled={disabled}
              title="Move to Confirmed"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          {showMoveOut && (
            <Button
              size="icon-sm"
              variant="outline"
              onClick={onMoveOut}
              disabled={disabled}
              title="Move Out"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
