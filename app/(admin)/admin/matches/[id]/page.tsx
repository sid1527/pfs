"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { PlayerCard, type PlayerWithStats } from "@/components/PlayerCard"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

type Match = {
  id: string
  title: string
  status: string
  match_type: string
  opponent_name: string | null
  match_date: string
  venue: string
  max_capacity: number
}

type RsvpWithUser = {
  id: string
  user_id: string
  status: string
  users: PlayerWithStats | PlayerWithStats[] | null
}

type Expense = {
  id: string
  category_name: string
  total_amount: number
}

type Due = {
  id: string
  user_id: string
  amount_owed: number
  is_paid: boolean
  approved_by: string | null
  users?: { full_name: string | null } | { full_name: string | null }[]
}

export default function AdminMatchDetailPage() {
  const params = useParams()
  const matchId = params.id as string
  const [match, setMatch] = useState<Match | null>(null)
  const [confirmed, setConfirmed] = useState<PlayerWithStats[]>([])
  const [waitlisted, setWaitlisted] = useState<PlayerWithStats[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [expenseAssignments, setExpenseAssignments] = useState<Record<string, Set<string>>>({})
  const [pendingApprovals, setPendingApprovals] = useState<Due[]>([])
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newCategoryAmount, setNewCategoryAmount] = useState("")
  const [attendance, setAttendance] = useState<Record<string, boolean>>({})
  const [performanceNotes, setPerformanceNotes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const supabase = createClient()

  const fetchData = async () => {
    const { data: matchData } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single()

    if (!matchData) {
      setLoading(false)
      return
    }
    setMatch(matchData)

    const { data: rsvpsData } = await supabase
      .from("rsvps")
      .select(`
        id,
        user_id,
        status,
        users (
          id,
          full_name,
          player_type,
          profile_photo_url,
          recent_form,
          last_active
        )
      `)
      .eq("match_id", matchId)
      .in("status", ["CONFIRMED", "WAITLISTED"])

    const confirmedList: PlayerWithStats[] = []
    const waitlistedList: PlayerWithStats[] = []

    for (const r of rsvpsData ?? []) {
      const row = r as unknown as RsvpWithUser
      const u = Array.isArray(row.users) ? row.users[0] : row.users
      if (!u) continue
      const withRel = await getReliability(u.id)
      const player: PlayerWithStats = { ...u, reliability_percent: withRel }
      if (row.status === "CONFIRMED") confirmedList.push(player)
      else waitlistedList.push(player)
    }

    setConfirmed(confirmedList)
    setWaitlisted(waitlistedList)

    const { data: expensesData } = await supabase
      .from("expenses")
      .select("*")
      .eq("match_id", matchId)

    setExpenses(expensesData ?? [])

    const { data: assignmentsData } = await supabase
      .from("expense_assignments")
      .select("expense_id, user_id")
      .in("expense_id", (expensesData ?? []).map((e) => e.id))

    const assignMap: Record<string, Set<string>> = {}
    assignmentsData?.forEach((a) => {
      if (!assignMap[a.expense_id]) assignMap[a.expense_id] = new Set()
      assignMap[a.expense_id].add(a.user_id)
    })
    setExpenseAssignments(assignMap)

    const { data: duesData } = await supabase
      .from("user_dues")
      .select("id, user_id, amount_owed, is_paid, approved_by, users(full_name)")
      .eq("match_id", matchId)
      .eq("is_paid", true)
      .is("approved_by", null)
      .gt("amount_owed", 0)

    setPendingApprovals((duesData ?? []) as unknown as Due[])

    const { data: attendanceData } = await supabase
      .from("attendance")
      .select("user_id, attended, performance_notes")
      .eq("match_id", matchId)

    const attMap: Record<string, boolean> = {}
    const notesMap: Record<string, string> = {}
    attendanceData?.forEach((a) => {
      attMap[a.user_id] = a.attended
      notesMap[a.user_id] = a.performance_notes ?? ""
    })
    setAttendance(attMap)
    setPerformanceNotes(notesMap)

    setLoading(false)
  }

  async function getReliability(userId: string): Promise<number> {
    const { data: rsvped } = await supabase
      .from("rsvps")
      .select("match_id")
      .eq("user_id", userId)
      .in("status", ["CONFIRMED", "WAITLISTED"])

    const { data: completed } = await supabase
      .from("matches")
      .select("id")
      .eq("status", "Completed")

    const completedIds = new Set(completed?.map((m) => m.id) ?? [])
    const rsvpedCompleted = rsvped?.filter((r) => completedIds.has(r.match_id)).length ?? 0

    const { data: attended } = await supabase
      .from("attendance")
      .select("match_id")
      .eq("user_id", userId)
      .eq("attended", true)

    const attendedCount = attended?.length ?? 0
    return rsvpedCompleted > 0 ? Math.round((attendedCount / rsvpedCompleted) * 100) : 0
  }

  useEffect(() => {
    fetchData()
  }, [matchId])

  const updateRsvp = async (userId: string, newStatus: string) => {
    setSaving(true)
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
      toast.success("Squad updated")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  const addExpense = async () => {
    if (!newCategoryName || !newCategoryAmount) return
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from("expenses")
        .insert({
          match_id: matchId,
          category_name: newCategoryName,
          total_amount: parseFloat(newCategoryAmount),
        })
        .select("id")
        .single()
      if (error) throw error
      setExpenses((e) => [...e, { id: data.id, category_name: newCategoryName, total_amount: parseFloat(newCategoryAmount) }])
      setExpenseAssignments((a) => ({ ...a, [data.id]: new Set() }))
      setNewCategoryName("")
      setNewCategoryAmount("")
      toast.success("Expense added")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add expense")
    } finally {
      setSaving(false)
    }
  }

  const toggleExpenseAssignment = (expenseId: string, userId: string) => {
    setExpenseAssignments((prev) => {
      const next = { ...prev }
      const set = new Set(next[expenseId] ?? [])
      if (set.has(userId)) set.delete(userId)
      else set.add(userId)
      next[expenseId] = set
      return next
    })
  }

  const saveExpenseMatrix = async () => {
    setSaving(true)
    try {
      const amountByUser: Record<string, number> = {}
      for (const expense of expenses) {
        const assigned = expenseAssignments[expense.id] ?? new Set()
        const amountPerPerson = assigned.size > 0 ? expense.total_amount / assigned.size : 0
        for (const userId of assigned) {
          amountByUser[userId] = (amountByUser[userId] ?? 0) + amountPerPerson
        }
      }

      for (const [userId, amount] of Object.entries(amountByUser)) {
        await supabase.from("user_dues").upsert(
          {
            match_id: matchId,
            user_id: userId,
            amount_owed: amount,
            is_paid: false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "match_id,user_id" }
        )
      }

      for (const expense of expenses) {
        const assigned = expenseAssignments[expense.id] ?? new Set()
        await supabase.from("expense_assignments").delete().eq("expense_id", expense.id)
        for (const userId of assigned) {
          await supabase.from("expense_assignments").insert({
            expense_id: expense.id,
            user_id: userId,
          })
        }
      }
      toast.success("Dues updated")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const approvePayment = async (dueId: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setSaving(true)
    try {
      await supabase
        .from("user_dues")
        .update({ approved_by: user.id, updated_at: new Date().toISOString() })
        .eq("id", dueId)
      toast.success("Payment approved")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to approve")
    } finally {
      setSaving(false)
    }
  }

  const markCompleted = async () => {
    setSaving(true)
    try {
      await supabase
        .from("matches")
        .update({ status: "Completed", updated_at: new Date().toISOString() })
        .eq("id", matchId)

      for (const [userId, attended] of Object.entries(attendance)) {
        await supabase.from("attendance").upsert(
          {
            match_id: matchId,
            user_id: userId,
            attended,
            performance_notes: performanceNotes[userId] ?? null,
          },
          { onConflict: "match_id,user_id" }
        )
      }
      toast.success("Match marked as completed")
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to complete")
    } finally {
      setSaving(false)
    }
  }

  if (loading || !match) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{match.title}</h1>
        <p className="text-muted-foreground">
          {new Date(match.match_date).toLocaleDateString("en-IN")} · {match.venue}
        </p>
      </div>

      <Tabs defaultValue="squad">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="squad">Squad Builder</TabsTrigger>
          <TabsTrigger value="expenses">Expense Manager</TabsTrigger>
          <TabsTrigger value="postmatch">Post-Match</TabsTrigger>
        </TabsList>

        <TabsContent value="squad" className="mt-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Confirmed</CardTitle>
                <CardDescription>{confirmed.length} players</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {confirmed.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    showMoveOut
                    onMoveOut={() => updateRsvp(p.id, "OUT")}
                    disabled={saving}
                  />
                ))}
                {confirmed.length === 0 && (
                  <p className="text-sm text-muted-foreground">No confirmed players</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Waitlisted</CardTitle>
                <CardDescription>{waitlisted.length} players</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {waitlisted.map((p) => (
                  <PlayerCard
                    key={p.id}
                    player={p}
                    showMoveToConfirmed
                    onMoveToConfirmed={() => updateRsvp(p.id, "CONFIRMED")}
                    disabled={saving}
                  />
                ))}
                {waitlisted.length === 0 && (
                  <p className="text-sm text-muted-foreground">No waitlisted players</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Expense Categories</CardTitle>
              <CardDescription>Add categories and assign to players</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Input
                  placeholder="Category (e.g. Ground Fee)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="max-w-[200px]"
                />
                <Input
                  type="number"
                  placeholder="Amount (₹)"
                  value={newCategoryAmount}
                  onChange={(e) => setNewCategoryAmount(e.target.value)}
                  className="max-w-[120px]"
                />
                <Button onClick={addExpense} disabled={saving}>
                  Add
                </Button>
              </div>

              {expenses.length > 0 && confirmed.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[400px] border-collapse text-sm">
                    <thead>
                      <tr>
                        <th className="border p-2 text-left">Player</th>
                        {expenses.map((e) => (
                          <th key={e.id} className="border p-2 text-left">
                            {e.category_name} (₹{e.total_amount})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {confirmed.map((p) => (
                        <tr key={p.id}>
                          <td className="border p-2 font-medium">{p.full_name}</td>
                          {expenses.map((e) => (
                            <td key={e.id} className="border p-2">
                              <input
                                type="checkbox"
                                checked={(expenseAssignments[e.id] ?? new Set()).has(p.id)}
                                onChange={() => toggleExpenseAssignment(e.id, p.id)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <Button onClick={saveExpenseMatrix} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Dues"}
              </Button>

              {pendingApprovals.length > 0 && (
                <div className="mt-6 space-y-2">
                  <h4 className="font-medium">Pending Approval</h4>
                  <p className="text-sm text-muted-foreground">Players marked as paid, awaiting admin approval</p>
                  <ul className="space-y-2">
                    {pendingApprovals.map((d) => {
                      const u = Array.isArray(d.users) ? d.users[0] : d.users
                      return (
                        <li key={d.id} className="flex items-center justify-between rounded-lg border p-3">
                          <span>{u?.full_name ?? "Player"}</span>
                          <span>₹{Number(d.amount_owed).toLocaleString("en-IN")}</span>
                          <Button size="sm" onClick={() => approvePayment(d.id)} disabled={saving}>
                            Approve Payment
                          </Button>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="postmatch" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Post-Match</CardTitle>
              <CardDescription>Mark attendance and add performance notes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {confirmed.map((p) => (
                <div key={p.id} className="flex flex-col gap-2 rounded-lg border p-4">
                  <div className="flex items-center gap-4">
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted">
                      {p.profile_photo_url ? (
                        <Image
                          src={p.profile_photo_url}
                          alt={p.full_name ?? ""}
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-sm">
                          {(p.full_name ?? "?")[0]}
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{p.full_name}</p>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={attendance[p.id] ?? false}
                          onChange={(e) =>
                            setAttendance((a) => ({ ...a, [p.id]: e.target.checked }))
                          }
                        />
                        Attended
                      </label>
                    </div>
                  </div>
                  <Input
                    placeholder="Performance notes"
                    value={performanceNotes[p.id] ?? ""}
                    onChange={(e) =>
                      setPerformanceNotes((n) => ({ ...n, [p.id]: e.target.value }))
                    }
                  />
                </div>
              ))}

              {match.status !== "Completed" && (
                <Button onClick={markCompleted} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Mark as Completed"}
                </Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
