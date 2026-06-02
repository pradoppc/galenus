import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  if (!session) redirect('/login')
  if (session.user?.role !== 'admin') redirect('/')

  return (
    <div className="min-h-screen bg-[#FAFCFB]">
      <nav className="bg-[#1A4D3A] text-[#EAF3EE] px-6 py-3 flex items-center justify-between">
        <span className="text-[20px] font-medium" style={{ fontFamily: 'var(--font-display)' }}>
          Galenus — Admin
        </span>
        <span className="text-[16px] text-[#7EC9A8]">{session.user?.email}</span>
      </nav>
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        {children}
      </div>
    </div>
  )
}
