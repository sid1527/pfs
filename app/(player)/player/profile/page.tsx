"use client"

import { useEffect, useState, useRef } from "react"
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
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { LogoutButton } from "@/components/LogoutButton"

const PLAYER_TYPES = ["Batsman", "Bowler", "All-Rounder", "Wicketkeeper"] as const

export default function PlayerProfilePage() {
  const [fullName, setFullName] = useState("")
  const [nickname, setNickname] = useState("")
  const [phone, setPhone] = useState("")
  const [playerType, setPlayerType] = useState<string>("Batsman")
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null)
  const [attendancePercent, setAttendancePercent] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordLoading, setPasswordLoading] = useState(false)
  const [newPassword, setNewPassword] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const supabase = createClient()

  const fetchProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from("users")
      .select("full_name, nickname, phone, player_type, profile_photo_url")
      .eq("id", user.id)
      .single()

    if (profile) {
      setFullName(profile.full_name ?? "")
      setNickname(profile.nickname ?? "")
      setPhone(profile.phone ?? "")
      setPlayerType(profile.player_type ?? "Batsman")
      setProfilePhotoUrl(profile.profile_photo_url)
    }

    // Lifetime attendance: attended / rsvped (CONFIRMED or WAITLISTED for completed matches)
    const { data: attended } = await supabase
      .from("attendance")
      .select("match_id")
      .eq("user_id", user.id)
      .eq("attended", true)

    const { data: rsvped } = await supabase
      .from("rsvps")
      .select("match_id")
      .in("status", ["CONFIRMED", "WAITLISTED"])
      .eq("user_id", user.id)

    const completedMatchIds = await (async () => {
      const { data } = await supabase
        .from("matches")
        .select("id")
        .eq("status", "Completed")
      return new Set(data?.map((m) => m.id) ?? [])
    })()

    const rsvpedCompleted = rsvped?.filter((r) => completedMatchIds.has(r.match_id)).length ?? 0
    const attendedCount = attended?.length ?? 0
    const pct = rsvpedCompleted > 0 ? Math.round((attendedCount / rsvpedCompleted) * 100) : null
    setAttendancePercent(pct)

    await supabase
      .from("users")
      .update({ last_active: new Date().toISOString() })
      .eq("id", user.id)

    setLoading(false)
  }

  useEffect(() => {
    fetchProfile()
  }, [])

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    try {
      const ext = file.name.split(".").pop() ?? "jpg"
      const path = `${user.id}/avatar.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path)
      const url = `${urlData.publicUrl}?t=${Date.now()}`

      await supabase
        .from("users")
        .update({ profile_photo_url: url })
        .eq("id", user.id)

      setProfilePhotoUrl(url)
      toast.success("Profile photo updated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo")
    } finally {
      setSaving(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    setSaving(true)
    try {
      const { error } = await supabase
        .from("users")
        .update({
          full_name: fullName,
          nickname: nickname || null,
          phone: phone || null,
          player_type: playerType,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)

      if (error) throw error
      toast.success("Profile updated!")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      toast.success("Password updated!")
      setNewPassword("")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update password")
    } finally {
      setPasswordLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold">Profile</h1>
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Profile</h1>
        <LogoutButton />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile Photo</CardTitle>
          <CardDescription>Upload a photo for your profile</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <div className="relative h-24 w-24 overflow-hidden rounded-full bg-muted">
            {profilePhotoUrl ? (
              <Image
                src={profilePhotoUrl}
                alt="Profile"
                fill
                className="object-cover"
                unoptimized
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-3xl text-muted-foreground">
                ?
              </div>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Upload Photo"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
          <CardDescription>Update your name and player type</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                placeholder="e.g. Sid"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="e.g. +91 98765 43210"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={saving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="playerType">Player Type</Label>
              <select
                id="playerType"
                value={playerType}
                onChange={(e) => setPlayerType(e.target.value)}
                className="flex h-8 w-full rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm"
                disabled={saving}
              >
                {PLAYER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {attendancePercent !== null && (
        <Card>
          <CardHeader>
            <CardTitle>Lifetime Attendance</CardTitle>
            <CardDescription>Your attendance rate for matches you RSVP&apos;d to</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{attendancePercent}%</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="Min 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={6}
                disabled={passwordLoading}
              />
            </div>
            <Button type="submit" disabled={passwordLoading || !newPassword}>
              {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Password"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
