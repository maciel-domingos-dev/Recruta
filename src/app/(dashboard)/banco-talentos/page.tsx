'use client'

import { useState, useEffect, useCallback } from 'react'
import { Search, Database, Plus, Loader2, Calendar, Mail } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Candidato = {
  id: string
  nome: string
  email: string
  cargo: string | null
  status: string
  created_at: string
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  DISPONIVEL:  { label: 'Disponível',  cls: 'bg-green-100 text-green-700' },
  EM_PROCESSO: { label: 'Em processo', cls: 'bg-blue-100 text-blue-700' },
  CONTRATADO:  { label: 'Contratado',  cls: 'bg-purple-100 text-purple-700' },
  ATIVO:       { label: 'Ativo',       cls: 'bg-gray-100 text-gray-600' },
  INATIVO:     { label: 'Inativo',     cls: 'bg-red-100 text-red-700' },
}

const AVATAR_COLORS = ['#185FA5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

function AvatarCircle({ nome }: { nome: string }) {
  const initials = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const color = AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div
      className="w-14 h-14 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

export default function BancoTalentosPage() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')

  const fetchData = useCallback(async () => {
    setLoading(true)
    let query = supabase
      .from('candidatos')
      .select('id, nome, email, cargo, status, created_at')
      .order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search.trim()) query = query.ilike('nome', `%${search.trim()}%`)
    const { data } = await query
    setCandidatos(data ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchData() }, [fetchData])

  const total = candidatos.length
  const disponiveis = candidatos.filter(c => c.status === 'DISPONIVEL').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Banco de Talentos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? '...' : `${total} talento${total !== 1 ? 's' : ''} · ${disponiveis} disponíve${disponiveis !== 1 ? 'is' : 'l'}`}
          </p>
        </div>
        <a href="/candidatos" className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Adicionar talento
        </a>
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              className="input pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-44"
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#185FA5]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && candidatos.length === 0 && (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e8f0f9] flex items-center justify-center mb-4">
            <Database size={28} style={{ color: '#185FA5' }} />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Banco de talentos vazio</h3>
          <p className="text-sm text-gray-400 max-w-sm mb-6">
            {search || statusFilter
              ? 'Nenhum resultado para os filtros aplicados.'
              : 'Cadastre candidatos na página de Candidatos para vê-los aqui.'}
          </p>
          <a href="/candidatos" className="btn-primary flex items-center gap-2">
            <Plus size={15} />
            Cadastrar candidatos
          </a>
        </div>
      )}

      {/* Cards grid */}
      {!loading && candidatos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {candidatos.map((c) => {
            const sc = statusConfig[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <div
                key={c.id}
                className="card hover:shadow-md transition-shadow border border-transparent hover:border-[#185FA5]/20"
              >
                <div className="flex items-start gap-4">
                  <AvatarCircle nome={c.nome} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 truncate">{c.nome}</h3>
                      <span className={`badge flex-shrink-0 ${sc.cls}`}>{sc.label}</span>
                    </div>
                    <p className="text-sm text-gray-500 truncate mb-3">
                      {c.cargo ?? 'Cargo não informado'}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs text-gray-400 flex items-center gap-1.5 truncate">
                        <Mail size={11} />
                        {c.email}
                      </p>
                      <p className="text-xs text-gray-400 flex items-center gap-1.5">
                        <Calendar size={11} />
                        {new Date(c.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
