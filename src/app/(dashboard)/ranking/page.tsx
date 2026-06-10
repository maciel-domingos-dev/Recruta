'use client'

import { useState, useEffect } from 'react'
import { Trophy, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Candidato = {
  id: string
  nome: string
  cargo: string | null
  status: string
}

type PipelineEntry = {
  candidato_id: string
  score_ia: number | null
}

type RankedCandidato = Candidato & {
  score: number
  pos: number
}

const STATUS_PRIORITY: Record<string, number> = {
  CONTRATADO:  100,
  EM_PROCESSO: 80,
  DISPONIVEL:  60,
  ATIVO:       40,
  INATIVO:     20,
}

const AVATAR_COLORS = ['#185FA5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']
const MEDAL_COLORS  = ['#FFD700', '#C0C0C0', '#CD7F32']

function AvatarCircle({ nome, size = 'sm' }: { nome: string; size?: 'sm' | 'md' }) {
  const initials = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const color    = AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length]
  const cls      = size === 'md' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${cls} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

export default function RankingPage() {
  const [ranked, setRanked]   = useState<RankedCandidato[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: candidatos }, { data: pipeline }] = await Promise.all([
        supabase.from('candidatos').select('id, nome, cargo, status'),
        supabase.from('pipeline').select('candidato_id, score_ia'),
      ])

      const pipelineMap: Record<string, number> = {}
      for (const p of (pipeline ?? []) as PipelineEntry[]) {
        if (p.score_ia !== null) {
          const cur = pipelineMap[p.candidato_id] ?? 0
          pipelineMap[p.candidato_id] = Math.max(cur, p.score_ia)
        }
      }

      const hasIAScores = Object.keys(pipelineMap).length > 0

      const sorted = ((candidatos ?? []) as Candidato[])
        .map(c => ({
          ...c,
          score: hasIAScores
            ? (pipelineMap[c.id] ?? STATUS_PRIORITY[c.status] ?? 0)
            : (STATUS_PRIORITY[c.status] ?? 0),
        }))
        .sort((a, b) => b.score - a.score)
        .map((c, i) => ({ ...c, pos: i + 1 }))

      setRanked(sorted)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={28} className="animate-spin text-[#185FA5]" />
      </div>
    )
  }

  if (ranked.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ranking</h1>
          <p className="text-gray-500 text-sm mt-1">Candidatos rankeados por score de IA</p>
        </div>
        <div className="card text-center py-16">
          <Trophy size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="font-semibold text-gray-900">Nenhum candidato cadastrado</p>
          <p className="text-sm text-gray-400 mt-1">
            Cadastre candidatos e use IA & Análise para gerar scores automáticos.
          </p>
        </div>
      </div>
    )
  }

  const top3    = ranked.slice(0, 3)
  const podium  = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3
  const rest    = ranked.slice(3)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ranking</h1>
        <p className="text-gray-500 text-sm mt-1">
          {ranked.length} candidato{ranked.length !== 1 ? 's' : ''} · ordenados por score de IA
        </p>
      </div>

      {/* Pódio */}
      {top3.length >= 2 && (
        <div className="card">
          <div className="flex items-end justify-center gap-6 pt-4 pb-2">
            {podium.map((r) => {
              const realPos = r.pos
              const height  = realPos === 1 ? 'h-28' : realPos === 2 ? 'h-20' : 'h-16'
              const bg      = realPos === 1
                ? 'linear-gradient(135deg, #185FA5, #104880)'
                : realPos === 2
                ? 'linear-gradient(135deg, #6b7280, #4b5563)'
                : 'linear-gradient(135deg, #b45309, #92400e)'
              return (
                <div key={r.id} className="flex flex-col items-center gap-2 w-24">
                  <AvatarCircle nome={r.nome} size="md" />
                  <p className="text-xs font-medium text-gray-700 text-center leading-tight truncate w-full">
                    {r.nome.split(' ')[0]}
                  </p>
                  <div
                    className={`w-full ${height} rounded-t-xl flex flex-col items-center justify-center gap-1`}
                    style={{ background: bg }}
                  >
                    <Trophy size={14} className="text-white/80" />
                    <span className="text-white font-bold text-lg">{realPos}º</span>
                    <span className="text-white/70 text-xs font-semibold">{r.score}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Tabela completa */}
      <div className="card p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">POS.</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CANDIDATO</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CARGO</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">STATUS</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">SCORE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {ranked.map((r) => (
              <tr
                key={r.id}
                className={`hover:bg-gray-50 transition-colors ${r.pos === 1 ? 'bg-[#e8f0f9]/40' : ''}`}
              >
                <td className="px-6 py-4">
                  {r.pos <= 3 ? (
                    <Trophy size={16} style={{ color: MEDAL_COLORS[r.pos - 1] }} />
                  ) : (
                    <span className="text-gray-400 font-mono text-xs">{r.pos}º</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-3">
                    <AvatarCircle nome={r.nome} />
                    <span className="font-medium text-gray-900">{r.nome}</span>
                  </div>
                </td>
                <td className="px-4 py-4 text-gray-500 text-sm">{r.cargo ?? '—'}</td>
                <td className="px-4 py-4">
                  <span className="badge bg-gray-100 text-gray-600">{r.status}</span>
                </td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${r.score}%`, background: '#185FA5' }}
                      />
                    </div>
                    <span className="text-xs font-bold text-[#185FA5]">{r.score}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rest.length === 0 && ranked.length > 0 && (
          <p className="text-center text-xs text-gray-400 py-3">
            Use IA & Análise para gerar scores precisos para cada candidato.
          </p>
        )}
      </div>
    </div>
  )
}
