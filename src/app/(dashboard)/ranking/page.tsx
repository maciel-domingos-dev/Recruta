'use client'

import { useState, useEffect } from 'react'
import { Trophy, Loader2, Briefcase } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Vaga = {
  id: string
  titulo: string
  empresa: string
}

type Candidato = {
  id: string
  nome: string
  cargo: string | null
  status: string
}

type PipelineEntry = {
  candidato_id: string
  vaga_id: string
  score_ia: number | null
}

type EntrevistaEntry = {
  candidato_id: string
  vaga_id: string | null
  transcricao: string | null
  diagnostico_final: string | null
}

type ScoreSource = 'diagnostico' | 'entrevista' | 'curriculo' | 'status'

type RankedCandidato = Candidato & {
  score: number
  scoreSource: ScoreSource
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

const SOURCE_BADGE: Record<ScoreSource, { label: string; cls: string }> = {
  diagnostico: { label: 'Diagnóstico Final', cls: 'bg-green-100 text-green-700' },
  entrevista:  { label: 'Score Entrevista',  cls: 'bg-blue-100 text-blue-700' },
  curriculo:   { label: 'Score Currículo',   cls: 'bg-purple-100 text-purple-700' },
  status:      { label: 'Sem avaliação',     cls: 'bg-gray-100 text-gray-500' },
}

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

function extractScore(
  candidatoId: string,
  vagaId: string | null,
  pipelineAll: PipelineEntry[],
  entrevistasAll: EntrevistaEntry[],
  status: string,
): { score: number; source: ScoreSource } {
  const pipelines   = pipelineAll.filter(
    p => p.candidato_id === candidatoId && (!vagaId || p.vaga_id === vagaId),
  )
  const entrevistas = entrevistasAll.filter(
    e => e.candidato_id === candidatoId && (!vagaId || e.vaga_id === vagaId),
  )

  // 1. diagnostico_final.score_final (maior prioridade — diagnóstico pós-entrevista)
  for (const e of entrevistas) {
    if (e.diagnostico_final) {
      try {
        const d = JSON.parse(e.diagnostico_final) as { score_final?: unknown }
        if (typeof d.score_final === 'number' && d.score_final > 0) {
          return { score: d.score_final, source: 'diagnostico' }
        }
      } catch { /* não é JSON */ }
    }
  }

  // 2. entrevistas.transcricao.score (análise de entrevista)
  for (const e of entrevistas) {
    if (e.transcricao) {
      try {
        const t = JSON.parse(e.transcricao) as { score?: unknown }
        if (typeof t.score === 'number' && t.score > 0) {
          return { score: t.score, source: 'entrevista' }
        }
      } catch { /* não é JSON */ }
    }
  }

  // 3. pipeline.score_ia (análise currículo × vaga)
  const bestPipeline = pipelines.reduce<number | null>(
    (best, p) => (p.score_ia !== null && (best === null || p.score_ia > best) ? p.score_ia : best),
    null,
  )
  if (bestPipeline !== null) return { score: bestPipeline, source: 'curriculo' }

  // 4. fallback por status do candidato
  return { score: STATUS_PRIORITY[status] ?? 0, source: 'status' }
}

export default function RankingPage() {
  const [vagas,          setVagas]          = useState<Vaga[]>([])
  const [vagaFiltro,     setVagaFiltro]     = useState<string>('')
  const [ranked,         setRanked]         = useState<RankedCandidato[]>([])
  const [loading,        setLoading]        = useState(true)
  const [candidatos,     setCandidatos]     = useState<Candidato[]>([])
  const [pipelineAll,    setPipelineAll]    = useState<PipelineEntry[]>([])
  const [entrevistasAll, setEntrevistasAll] = useState<EntrevistaEntry[]>([])

  useEffect(() => {
    async function load() {
      const [
        { data: vagasData },
        { data: candidatosData },
        { data: pipelineData },
        { data: entrevistasData },
      ] = await Promise.all([
        supabase.from('vagas').select('id, titulo, empresa').order('titulo'),
        supabase.from('candidatos').select('id, nome, cargo, status'),
        supabase.from('pipeline').select('candidato_id, vaga_id, score_ia'),
        supabase.from('entrevistas').select('candidato_id, vaga_id, transcricao, diagnostico_final'),
      ])

      setVagas(vagasData ?? [])
      setCandidatos(candidatosData ?? [])
      setPipelineAll(pipelineData ?? [])
      setEntrevistasAll(entrevistasData ?? [])
      setLoading(false)
    }
    load()
  }, [])

  // Recomputa ranking sempre que filtro ou dados mudam
  useEffect(() => {
    if (loading) return

    let pool: Candidato[]

    if (vagaFiltro) {
      // Candidatos vinculados a esta vaga (via pipeline ou entrevista)
      const idsNaVaga = new Set<string>()
      pipelineAll.filter(p => p.vaga_id === vagaFiltro).forEach(p => idsNaVaga.add(p.candidato_id))
      entrevistasAll.filter(e => e.vaga_id === vagaFiltro).forEach(e => idsNaVaga.add(e.candidato_id))
      pool = candidatos.filter(c => idsNaVaga.has(c.id))
    } else {
      pool = candidatos
    }

    const sorted = pool
      .map(c => {
        const { score, source } = extractScore(
          c.id,
          vagaFiltro || null,
          pipelineAll,
          entrevistasAll,
          c.status,
        )
        return { ...c, score, scoreSource: source }
      })
      .sort((a, b) => b.score - a.score)
      .map((c, i) => ({ ...c, pos: i + 1 }))

    setRanked(sorted)
  }, [loading, vagaFiltro, candidatos, pipelineAll, entrevistasAll])

  if (loading) {
    return (
      <div className="flex justify-center py-32">
        <Loader2 size={28} className="animate-spin text-[#185FA5]" />
      </div>
    )
  }

  const vagaSelecionada = vagas.find(v => v.id === vagaFiltro)
  const top3   = ranked.slice(0, 3)
  const podium = top3.length >= 2 ? [top3[1], top3[0], top3[2]].filter(Boolean) : top3

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ranking</h1>
        <p className="text-gray-500 text-sm mt-1">
          {ranked.length} candidato{ranked.length !== 1 ? 's' : ''} ·{' '}
          {vagaSelecionada
            ? `${vagaSelecionada.titulo} — ${vagaSelecionada.empresa}`
            : 'Todas as vagas'}
        </p>
      </div>

      {/* Filtro por vaga */}
      {vagas.length > 0 && (
        <div className="card p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Briefcase size={16} className="text-gray-400 flex-shrink-0" />
            <select
              className="input flex-1 min-w-[200px] max-w-sm"
              value={vagaFiltro}
              onChange={e => setVagaFiltro(e.target.value)}
            >
              <option value="">Todas as vagas</option>
              {vagas.map(v => (
                <option key={v.id} value={v.id}>
                  {v.titulo} — {v.empresa}
                </option>
              ))}
            </select>
            {vagaFiltro && (
              <button
                onClick={() => setVagaFiltro('')}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Limpar filtro
              </button>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {ranked.length === 0 && (
        <div className="card text-center py-16">
          <Trophy size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="font-semibold text-gray-900">
            {vagaFiltro ? 'Nenhum candidato nesta vaga' : 'Nenhum candidato cadastrado'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {vagaFiltro
              ? 'Adicione candidatos ao pipeline desta vaga para vê-los aqui.'
              : 'Cadastre candidatos e use IA & Análise para gerar scores automáticos.'}
          </p>
        </div>
      )}

      {/* Pódio */}
      {top3.length >= 2 && (
        <div className="card">
          <div className="flex items-end justify-center gap-6 pt-4 pb-2">
            {podium.map((r) => {
              const realPos = r.pos
              const height  = realPos === 1 ? 'h-28' : realPos === 2 ? 'h-20' : 'h-16'
              const bg      =
                realPos === 1 ? 'linear-gradient(135deg, #185FA5, #104880)' :
                realPos === 2 ? 'linear-gradient(135deg, #6b7280, #4b5563)' :
                                'linear-gradient(135deg, #b45309, #92400e)'
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
      {ranked.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">POS.</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CANDIDATO</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CARGO</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">AVALIAÇÃO</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">SCORE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {ranked.map((r) => {
                const badge = SOURCE_BADGE[r.scoreSource]
                return (
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
                      <span className={`badge text-xs ${badge.cls}`}>{badge.label}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${Math.min(r.score, 100)}%`, background: '#185FA5' }}
                          />
                        </div>
                        <span className="text-xs font-bold text-[#185FA5]">{r.score}</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
