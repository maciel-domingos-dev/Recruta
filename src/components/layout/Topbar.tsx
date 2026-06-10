'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Search, ChevronDown, LogOut, Settings } from 'lucide-react'

const DEV_USER = {
  name: 'Admin Recruta',
  email: 'admin@recruta.com',
  initials: 'AR',
}

export default function Topbar({ title }: { title?: string }) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  async function handleSignOut() {
    await fetch('/api/dev-logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-20">
      {/* Esquerda */}
      <div className="flex items-center gap-4">
        {title && (
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
        )}
      </div>

      {/* Busca central */}
      <div className="hidden md:flex items-center max-w-sm w-full mx-4">
        <div className="relative w-full">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar vagas, candidatos..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent"
          />
        </div>
      </div>

      {/* Direita */}
      <div className="flex items-center gap-3">
        {/* Notificações */}
        <button className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <Bell size={18} className="text-gray-500" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
        </button>

        {/* Avatar + dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(v => !v)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ background: '#185FA5' }}
            >
              {DEV_USER.initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">{DEV_USER.name}</p>
              <p className="text-xs text-gray-400 leading-none mt-0.5 truncate max-w-[120px]">
                {DEV_USER.email}
              </p>
            </div>
            <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 z-40 py-1 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{DEV_USER.name}</p>
                  <p className="text-xs text-gray-400 truncate">{DEV_USER.email}</p>
                </div>

                <a
                  href="/configuracoes"
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings size={15} className="text-gray-400" />
                  Configurações
                </a>

                <div className="border-t border-gray-100 mt-1" />
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut size={15} />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
