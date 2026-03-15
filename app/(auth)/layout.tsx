export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background/95 px-4 py-3">
        <h1 className="text-center text-lg font-semibold">Prime Force Spartans</h1>
      </header>
      {children}
    </div>
  )
}
