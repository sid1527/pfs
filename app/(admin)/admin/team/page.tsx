"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Loader2, Shield, User } from "lucide-react"
import { toast } from "sonner"

type TeamMember = {
  id: string
  full_name: string | null
  nickname: string | null
  email: string
  role: string
  player_type: string | null
}

export default function AdminTeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([])
  const [loading, setLoading] = useState(true)
  const [promotingId, setPromotingId] = useState<string | null>(null)

  const supabase = createClient()

  const fetchMembers = async () => {
    const { data } = await supabase
      .from("users")
      .select("id, full_name, nickname, email, role, player_type")
      .order("full_name")

    setMembers(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    fetchMembers()
  }, [])

  const handleMakeAdmin = async (userId: string) => {
    setPromotingId(userId)
    try {
      const { error } = await supabase
        .from("users")
        .update({ role: "admin", updated_at: new Date().toISOString() })
        .eq("id", userId)

      if (error) throw error
      toast.success("User promoted to admin")
      fetchMembers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to promote user")
    } finally {
      setPromotingId(null)
    }
  }

  const displayName = (m: TeamMember) => m.nickname || m.full_name || m.email

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Team</h1>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team</h1>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage team members. Admins can promote players to admin.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <p className="text-muted-foreground">No team members yet.</p>
          ) : (
            <ul className="space-y-3">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {m.role === "admin" ? (
                        <Shield className="h-5 w-5 text-primary" />
                      ) : (
                        <User className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{displayName(m)}</p>
                      <p className="text-sm text-muted-foreground">{m.email}</p>
                      {m.player_type && (
                        <p className="text-xs text-muted-foreground">{m.player_type}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.role === "admin" ? (
                      <Badge variant="secondary">Admin</Badge>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleMakeAdmin(m.id)}
                        disabled={promotingId === m.id}
                      >
                        {promotingId === m.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Make Admin"
                        )}
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
