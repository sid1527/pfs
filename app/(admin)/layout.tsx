import { AdminNav } from "@/components/AdminNav"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <AdminNav />
      <main className="container mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}
