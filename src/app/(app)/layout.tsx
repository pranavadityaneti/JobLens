// src/app/(app)/layout.tsx
import { Header } from '@/components/layout/header'

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-zinc-50">
      <Header />
      <main>{children}</main>
    </div>
  )
}
