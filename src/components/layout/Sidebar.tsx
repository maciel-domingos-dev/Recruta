'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  LayoutDashboard,
  Briefcase,
  Users,
  Database,
  HandshakeIcon,
  CreditCard,
  Trophy,
  CalendarDays,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  ExternalLink,
  Video,
  Kanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard',       label: 'Dashboard',         icon: LayoutDashboard },
  { href: '/vagas',           label: 'Vagas',             icon: Briefcase },
  { href: '/candidatos',      label: 'Candidatos',        icon: Users },
  { href: '/pipeline',        label: 'Pipeline',          icon: Kanban },
  { href: '/banco-de-talentos', label: 'Banco de Talentos', icon: Database },
  { href: '/crm-comercial',   label: 'CRM Comercial',     icon: HandshakeIcon },
  { href: '/cobrancas',       label: 'Cobranças',         icon: CreditCard },
  { href: '/ranking',         label: 'Ranking',           icon: Trophy },
  { href: '/agenda',          label: 'Agenda',            icon: CalendarDays },
  { href: '/entrevistas',     label: 'Entrevistas',       icon: Video },
  { href: '/ia-analise',      label: 'IA & Análise',      icon: Zap },
  { href: '/configuracoes',   label: 'Configurações',     icon: Settings },
]

const BRAND = '#185FA5'

export default function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className={cn(
        'flex flex-col h-screen sticky top-0 transition-all duration-300 ease-in-out shadow-lg z-30',
        collapsed ? 'w-16' : 'w-60'
      )}
      style={{ background: BRAND }}
    >
      {/* ─── Logo ─── */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0 backdrop-blur">
          <span className="text-white font-black text-sm">R</span>
        </div>
        {!collapsed && (
          <span className="text-white font-bold text-lg tracking-tight truncate">Recruta</span>
        )}
      </div>

      {/* ─── Navegação ─── */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
                active
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              )}
            >
              {/* Indicador ativo */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-white"
                />
              )}

              <Icon
                size={18}
                className={cn('flex-shrink-0', active ? 'text-white' : 'text-blue-200 group-hover:text-white')}
              />

              {!collapsed && (
                <span className={cn('text-sm font-medium truncate', active ? 'text-white' : '')}>
                  {label}
                </span>
              )}

              {/* Tooltip quando collapsed */}
              {collapsed && (
                <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* ─── Plano / Upgrade ─── */}
      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-lg bg-white/10 backdrop-blur">
          <p className="text-white/70 text-xs mb-1">Plano atual</p>
          <p className="text-white font-semibold text-sm mb-2">Starter</p>
          <button className="w-full py-1.5 rounded-md bg-white text-[#185FA5] text-xs font-semibold hover:bg-blue-50 transition-colors">
            Fazer upgrade
          </button>
        </div>
      )}

      {/* ─── Portal Público ─── */}
      <div className="px-2 pb-2">
        <div className="border-t border-white/10 pt-2">
          <a
            href="/candidatar"
            target="_blank"
            rel="noopener noreferrer"
            title={collapsed ? 'Portal Público' : undefined}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group relative',
              'text-blue-100 hover:bg-white/10 hover:text-white'
            )}
          >
            <ExternalLink
              size={18}
              className="flex-shrink-0 text-blue-200 group-hover:text-white"
            />
            {!collapsed && (
              <span className="text-sm font-medium truncate">Portal Público</span>
            )}
            {collapsed && (
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-900 text-white text-xs rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg z-50">
                Portal Público
              </span>
            )}
          </a>
        </div>
      </div>

      {/* ─── Botão colapsar ─── */}
      <button
        onClick={() => setCollapsed(v => !v)}
        className="flex items-center justify-center py-3 border-t border-white/10 hover:bg-white/10 transition-colors"
        aria-label={collapsed ? 'Expandir menu' : 'Colapsar menu'}
      >
        {collapsed
          ? <ChevronRight size={16} className="text-blue-200" />
          : <ChevronLeft size={16} className="text-blue-200" />
        }
      </button>
    </aside>
  )
}
