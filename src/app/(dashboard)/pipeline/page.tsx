'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'
import type { DragStartEvent, DragEndEvent, DragOverEvent } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import {
  Users,
  LayoutGrid,
  List,
  TrendingUp,
  UserCheck,
  Filter,
  MoreVertical,
  Calendar,
  Brain,
  XCircle,
  History,
  MoveRight,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import HistoricoModal from '@/components/pipeline/HistoricoModal'
import MoverEtapaModal from '@/components/pipeline/MoverEtapaModal'

/* ─── Types ─── */
type PipelineItem = {
  id: string
  candidato_id: string
  vaga_id: string
  etapa: string
  created_at: string
  nome: string
  email: string | null
  score_ia: number | null
  vaga_titulo: string | null
}

type VagaOpt = { id: string; titulo: string }

type CardAction = 'agenda' | 'ia' | 'mover' | 'historico' | 'reprovar'

/* ─── Etapas config — 7 colunas, Reprovado no final ─── */
const ETAPAS = [
  { id: 'Triagem',           label: 'Triagem',           colBg: 'bg-gray-50',   headerColor: '#6b7280', badgeCls: 'bg-gray-100 text-gray-700',    isTerminal: false },
  { id: 'Entrevista RH',     label: 'Entrevista RH',     colBg: 'bg-green-50',  headerColor: '#16a34a', badgeCls: 'bg-green-100 text-green-700',  isTerminal: false },
  { id: 'Teste Técnico',     label: 'Teste Técnico',     colBg: 'bg-purple-50', headerColor: '#7c3aed', badgeCls: 'bg-purple-100 text-purple-700', isTerminal: false },
  { id: 'Entrevista Gestor', label: 'Entrevista Gestor', colBg: 'bg-yellow-50', headerColor: '#d97706', badgeCls: 'bg-yellow-100 text-yellow-700', isTerminal: false },
  { id: 'Proposta',          label: 'Proposta',          colBg: 'bg-blue-50',   headerColor: '#185FA5', badgeCls: 'bg-blue-100 text-blue-700',    isTerminal: false },
  { id: 'Contratado',        label: 'Contratado',        colBg: 'bg-orange-50', headerColor: '#ea580c', badgeCls: 'bg-orange-100 text-orange-700', isTerminal: false },
  { id: 'Reprovado',         label: 'Reprovado',         colBg: 'bg-red-50',    headerColor: '#dc2626', badgeCls: 'bg-red-100 text-red-700',      isTerminal: true  },
] as const

type Etapa = typeof ETAPAS[number]

/* ─── Etapas de progresso (excluindo terminal) ─── */
const PROGRESS_ETAPAS = ETAPAS.filter(e => !e.isTerminal)

/* ─── Normaliza etapa do banco (pode vir em maiúsculo: 'TRIAGEM' → 'Triagem') ─── */
function normalizeEtapa(raw: string | null | undefined): string {
  if (!raw) return 'Triagem'
  const match = ETAPAS.find(e => e.id.toLowerCase() === raw.toLowerCase())
  return match ? match.id : raw
}

/* ─── Helpers ─── */
function getInitials(nome: string) {
  return nome.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

function scoreBadge(score: number | null) {
  if (score === null) return null
  if (score >= 80) return { cls: 'bg-green-100 text-green-700', label: `${score}%` }
  if (score >= 60) return { cls: 'bg-amber-100 text-amber-700',  label: `${score}%` }
  return               { cls: 'bg-red-100 text-red-700',        label: `${score}%` }
}

function progressPct(etapa: string) {
  const idx = PROGRESS_ETAPAS.findIndex(e => e.id === etapa)
  return idx >= 0 ? Math.round((idx / (PROGRESS_ETAPAS.length - 1)) * 100) : 0
}

function diasDesde(iso: string) {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

/* ─── SkeletonCard ─── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl p-3 animate-pulse">
      <div className="flex gap-2 mb-2.5">
        <div className="w-8 h-8 rounded-lg bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-gray-200 rounded w-3/4" />
          <div className="h-2.5 bg-gray-100 rounded w-1/2" />
        </div>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full" />
    </div>
  )
}

/* ─── CardContent ─── */
function CardContent({
  item,
  onAction,
  overlay = false,
}: {
  item: PipelineItem
  onAction: (item: PipelineItem, action: CardAction) => void
  overlay?: boolean
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const badge       = scoreBadge(item.score_ia)
  const pct         = progressPct(item.etapa)
  const isReprovado = item.etapa === 'Reprovado'

  return (
    <>
      <div className="flex items-start gap-2.5 mb-2">
        {/* Avatar */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white select-none"
          style={{ background: isReprovado ? '#dc2626' : '#185FA5' }}
        >
          {getInitials(item.nome)}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-900 truncate leading-snug">{item.nome}</p>
          {item.vaga_titulo && (
            <p className="text-[11px] text-gray-400 truncate leading-snug">{item.vaga_titulo}</p>
          )}
        </div>

        {/* Menu */}
        {!overlay && (
          <div
            className="relative flex-shrink-0"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => setMenuOpen(v => !v)}
              onBlur={() => setTimeout(() => setMenuOpen(false), 150)}
              className="p-1 rounded hover:bg-gray-100 transition-colors"
            >
              <MoreVertical size={13} className="text-gray-400" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-6 bg-white rounded-xl shadow-xl border border-gray-100 z-50 w-40 py-1 text-xs">
                {([
                  { action: 'agenda'    as CardAction, icon: Calendar,  label: 'Agendar',     cls: 'text-gray-700 hover:bg-gray-50' },
                  { action: 'ia'        as CardAction, icon: Brain,     label: 'Ver IA',      cls: 'text-gray-700 hover:bg-gray-50' },
                  { action: 'mover'     as CardAction, icon: MoveRight, label: 'Mover etapa', cls: 'text-gray-700 hover:bg-gray-50' },
                  { action: 'historico' as CardAction, icon: History,   label: 'Histórico',   cls: 'text-gray-700 hover:bg-gray-50' },
                ] as const).map(({ action, icon: Icon, label, cls }) => (
                  <button
                    key={action}
                    onClick={() => { setMenuOpen(false); onAction(item, action) }}
                    className={cn('w-full text-left px-3 py-2 flex items-center gap-2', cls)}
                  >
                    <Icon size={12} /> {label}
                  </button>
                ))}

                {!isReprovado && (
                  <>
                    <div className="mx-2 my-1 border-t border-gray-100" />
                    <button
                      onClick={() => { setMenuOpen(false); onAction(item, 'reprovar') }}
                      className="w-full text-left px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50"
                    >
                      <XCircle size={12} /> Reprovar
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Score badge — só exibe se score_ia não for null */}
      {badge && (
        <div className="mb-2">
          <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full font-semibold', badge.cls)}>
            Score IA: {badge.label}
          </span>
        </div>
      )}

      {/* Barra de progresso — oculta para Reprovado */}
      {!isReprovado && (
        <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-1 rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: '#185FA5' }}
          />
        </div>
      )}
    </>
  )
}

/* ─── DraggableCard ─── */
function DraggableCard({
  item,
  onAction,
}: {
  item: PipelineItem
  onAction: (i: PipelineItem, a: CardAction) => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })
  const style = { transform: CSS.Translate.toString(transform) }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'bg-white rounded-xl p-3 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-150',
        'cursor-grab active:cursor-grabbing select-none',
        isDragging && 'opacity-30',
      )}
      {...attributes}
      {...listeners}
    >
      <CardContent item={item} onAction={onAction} />
    </div>
  )
}

/* ─── DroppableColumn ─── */
function DroppableColumn({
  etapa,
  items,
  loading,
  isOver,
  onAction,
}: {
  etapa: Etapa
  items: PipelineItem[]
  loading: boolean
  isOver: boolean
  onAction: (i: PipelineItem, a: CardAction) => void
}) {
  const { setNodeRef } = useDroppable({ id: etapa.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex flex-col rounded-2xl min-w-[220px] w-56 flex-shrink-0 transition-all duration-150',
        etapa.colBg,
        isOver && !etapa.isTerminal && 'ring-2 ring-[#185FA5]/40 ring-offset-1 shadow-md',
        isOver && etapa.isTerminal  && 'ring-2 ring-red-400/50 ring-offset-1 shadow-md',
      )}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2.5 rounded-t-2xl"
        style={{ background: etapa.headerColor }}
      >
        <span className="text-xs font-bold text-white truncate">{etapa.label}</span>
        <span className="ml-2 text-[10px] bg-white/25 text-white px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
          {items.length}
        </span>
      </div>

      {/* Cards area */}
      <div className="flex-1 p-2 space-y-2 min-h-[120px]">
        {loading ? (
          [1, 2].map(n => <SkeletonCard key={n} />)
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            {etapa.isTerminal
              ? <XCircle size={20} className="text-red-200 mb-1" />
              : <Users  size={20} className="text-gray-200 mb-1" />
            }
            <p className="text-[11px] text-gray-300">Nenhum candidato</p>
          </div>
        ) : (
          items.map(item => (
            <DraggableCard key={item.id} item={item} onAction={onAction} />
          ))
        )}
      </div>
    </div>
  )
}

/* ─── Main Page ─── */
export default function PipelinePage() {
  const router = useRouter()

  const [items, setItems]           = useState<PipelineItem[]>([])
  const [vagas, setVagas]           = useState<VagaOpt[]>([])
  const [vagaFilter, setVagaFilter] = useState('')
  const [viewMode, setViewMode]     = useState<'kanban' | 'lista'>('kanban')
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')

  // DnD
  const [activeId, setActiveId]     = useState<string | null>(null)
  const [overColumn, setOverColumn] = useState<string | null>(null)

  // Modals
  const [historicoTarget, setHistoricoTarget] = useState<PipelineItem | null>(null)
  const [moverTarget, setMoverTarget]         = useState<PipelineItem | null>(null)

  // List view
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState<keyof PipelineItem>('created_at')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage]       = useState(0)
  const PAGE_SIZE = 20

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  /* ── Fetch ── */
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')

    const [{ data: pipe, error: pipeErr }, { data: vagasData }] = await Promise.all([
      supabase
        .from('pipeline')
        // score_ia explícito para evitar ambiguidade; sem filtro de etapa (inclui Reprovado)
        .select('id, candidato_id, vaga_id, etapa, score_ia, created_at, candidatos(nome, email), vagas(titulo)')
        .order('created_at', { ascending: false }),
      supabase.from('vagas').select('id, titulo').order('titulo'),
    ])

    if (pipeErr) { setError(pipeErr.message); setLoading(false); return }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = (pipe ?? []).map((row: any): PipelineItem => ({
      id:           row.id,
      candidato_id: row.candidato_id,
      vaga_id:      row.vaga_id,
      etapa:        normalizeEtapa(row.etapa),
      created_at:   row.created_at,
      nome:         row.candidatos?.nome  ?? 'Sem nome',
      email:        row.candidatos?.email ?? null,
      score_ia:     row.score_ia          ?? null,
      vaga_titulo:  row.vagas?.titulo     ?? null,
    }))

    // Deduplicação: query já ordenada por created_at DESC → primeiro registro = mais recente
    const seen  = new Set<string>()
    const deduped = mapped.filter(item => {
      const key = `${item.candidato_id}-${item.vaga_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    setItems(deduped)
    setVagas((vagasData as VagaOpt[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  /* ── DnD ── */
  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragOver({ over }: DragOverEvent) {
    setOverColumn(over && ETAPAS.some(e => e.id === over.id) ? (over.id as string) : null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    setOverColumn(null)
    if (!over) return

    const novaEtapa = over.id as string
    if (!ETAPAS.find(e => e.id === novaEtapa)) return

    const item = items.find(i => i.id === active.id)
    if (!item || item.etapa === novaEtapa) return

    const etapaAnterior = item.etapa

    // Optimistic update — move para nova etapa (incluindo Reprovado)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, etapa: novaEtapa } : i))

    await Promise.all([
      supabase.from('pipeline').update({ etapa: novaEtapa }).eq('id', item.id),
      supabase.from('pipeline_historico').insert({
        candidato_id:   item.candidato_id,
        vaga_id:        item.vaga_id,
        etapa_anterior: etapaAnterior,
        etapa_nova:     novaEtapa,
      }),
    ])
  }

  function handleDragCancel() {
    setActiveId(null)
    setOverColumn(null)
  }

  /* ── Card actions ── */
  async function handleAction(item: PipelineItem, action: CardAction) {
    if (action === 'historico') { setHistoricoTarget(item); return }
    if (action === 'mover')     { setMoverTarget(item); return }
    if (action === 'ia') {
      sessionStorage.setItem('ia_candidato_id', item.candidato_id)
      sessionStorage.setItem('ia_candidato_nome', item.nome)
      router.push('/ia-analise')
      return
    }
    if (action === 'agenda') {
      router.push('/entrevistas')
      return
    }
    if (action === 'reprovar') {
      if (!confirm(`Reprovar ${item.nome}?`)) return
      const ant = item.etapa
      // Move para coluna Reprovado (não remove do estado)
      setItems(prev => prev.map(i => i.id === item.id ? { ...i, etapa: 'Reprovado' } : i))
      await Promise.all([
        supabase.from('pipeline').update({ etapa: 'Reprovado' }).eq('id', item.id),
        supabase.from('pipeline_historico').insert({
          candidato_id:   item.candidato_id,
          vaga_id:        item.vaga_id,
          etapa_anterior: ant,
          etapa_nova:     'Reprovado',
        }),
      ])
    }
  }

  /* ── Dados filtrados ── */
  const filtered = vagaFilter ? items.filter(i => i.vaga_id === vagaFilter) : items

  /* ── Métricas (excluem Reprovados — pipeline ativa) ── */
  const activeItems     = filtered.filter(i => i.etapa !== 'Reprovado')
  const totalPipeline   = activeItems.length
  const scores          = activeItems.map(i => i.score_ia).filter((s): s is number => s !== null)
  const avgScore        = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
  const emTriagem       = activeItems.filter(i => i.etapa === 'Triagem').length
  const now             = new Date()
  const contratadosMes  = filtered.filter(i => {
    if (i.etapa !== 'Contratado') return false
    const d = new Date(i.created_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  /* ── Item sendo arrastado ── */
  const activeItem = activeId ? (items.find(i => i.id === activeId) ?? null) : null

  /* ── Lista view ── */
  const listFiltered = filtered.filter(i =>
    i.nome.toLowerCase().includes(search.toLowerCase()) ||
    (i.email ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const listSorted = [...listFiltered].sort((a, b) => {
    const va = String(a[sortKey] ?? '')
    const vb = String(b[sortKey] ?? '')
    return sortAsc ? va.localeCompare(vb) : vb.localeCompare(va)
  })

  const totalPages = Math.ceil(listSorted.length / PAGE_SIZE)
  const listPage   = listSorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  function toggleSort(key: keyof PipelineItem) {
    if (sortKey === key) setSortAsc(v => !v)
    else { setSortKey(key); setSortAsc(true); setPage(0) }
  }

  function SortIcon({ col }: { col: keyof PipelineItem }) {
    if (sortKey !== col) return null
    return sortAsc ? <ChevronUp size={11} className="inline" /> : <ChevronDown size={11} className="inline" />
  }

  /* ─── Render ─── */
  return (
    <div className="space-y-5">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pipeline</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {loading ? '...' : `${totalPipeline} candidato${totalPipeline !== 1 ? 's' : ''} ativos na pipeline`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            className="input text-sm h-9 py-0"
            value={vagaFilter}
            onChange={e => setVagaFilter(e.target.value)}
          >
            <option value="">Todas as vagas</option>
            {vagas.map(v => <option key={v.id} value={v.id}>{v.titulo}</option>)}
          </select>

          <div className="flex bg-gray-100 rounded-xl p-1 gap-0.5">
            {(['kanban', 'lista'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5',
                  viewMode === mode
                    ? 'bg-white text-[#185FA5] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700',
                )}
              >
                {mode === 'kanban' ? <><LayoutGrid size={13} /> Kanban</> : <><List size={13} /> Lista</>}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Métricas ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Total na Pipeline',  value: totalPipeline,                            icon: Users,      color: '#185FA5', bg: '#e8f0f9' },
          { label: 'Média Score IA',     value: avgScore !== null ? `${avgScore}%` : '—', icon: TrendingUp, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Em Triagem',         value: emTriagem,                                 icon: Filter,     color: '#d97706', bg: '#fffbeb' },
          { label: 'Contratados (mês)',  value: contratadosMes,                            icon: UserCheck,  color: '#ea580c', bg: '#fff7ed' },
        ].map(m => (
          <div key={m.label} className="card flex items-center gap-3 py-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: m.bg }}
            >
              <m.icon size={18} style={{ color: m.color }} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900 leading-tight">{m.value}</p>
              <p className="text-xs text-gray-400">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle size={14} /> {error}
        </div>
      )}

      {/* ── Kanban View ── */}
      {viewMode === 'kanban' && (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
        >
          <div className="overflow-x-auto pb-4 w-full">
            <div className="flex gap-3 min-w-max">
              {ETAPAS.map(etapa => (
                <DroppableColumn
                  key={etapa.id}
                  etapa={etapa}
                  items={filtered.filter(i => i.etapa === etapa.id)}
                  loading={loading}
                  isOver={overColumn === etapa.id}
                  onAction={handleAction}
                />
              ))}
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeItem && (
              <div className="bg-white rounded-xl p-3 shadow-2xl border border-[#185FA5]/20 w-56 rotate-1 cursor-grabbing ring-2 ring-[#185FA5]/20">
                <CardContent item={activeItem} onAction={() => {}} overlay />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}

      {/* ── Lista View ── */}
      {viewMode === 'lista' && (
        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-gray-100">
            <div className="relative max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                className="input pl-8 text-sm h-9 py-0"
                placeholder="Buscar candidato..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(0) }}
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-14">
              <Loader2 size={24} className="animate-spin text-[#185FA5]" />
            </div>
          ) : listPage.length === 0 ? (
            <div className="text-center py-14">
              <Users size={28} className="mx-auto text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Nenhum candidato encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/80 text-left">
                    {(
                      [
                        { key: 'nome'        as keyof PipelineItem, label: 'Candidato'     },
                        { key: 'vaga_titulo' as keyof PipelineItem, label: 'Vaga'          },
                        { key: 'etapa'       as keyof PipelineItem, label: 'Etapa'         },
                        { key: 'score_ia'    as keyof PipelineItem, label: 'Score IA'      },
                        { key: 'created_at'  as keyof PipelineItem, label: 'Entrada'       },
                        { key: null,                                 label: 'Dias na etapa' },
                      ] as Array<{ key: keyof PipelineItem | null; label: string }>
                    ).map(col => (
                      <th
                        key={col.label}
                        onClick={() => col.key && toggleSort(col.key)}
                        className={cn(
                          'px-4 py-3 text-xs font-semibold text-gray-500 whitespace-nowrap',
                          col.key && 'cursor-pointer select-none hover:text-gray-700',
                        )}
                      >
                        {col.label}
                        {col.key && <SortIcon col={col.key} />}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-xs font-semibold text-gray-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {listPage.map(item => {
                    const etapaCfg = ETAPAS.find(e => e.id === item.etapa)
                    const badge    = scoreBadge(item.score_ia)
                    const dias     = diasDesde(item.created_at)

                    return (
                      <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ background: etapaCfg?.isTerminal ? '#dc2626' : '#185FA5' }}
                            >
                              {getInitials(item.nome)}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900 leading-snug">{item.nome}</p>
                              <p className="text-xs text-gray-400">{item.email ?? '—'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{item.vaga_titulo ?? '—'}</td>
                        <td className="px-4 py-3">
                          {etapaCfg && (
                            <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', etapaCfg.badgeCls)}>
                              {item.etapa}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {badge
                            ? <span className={cn('text-xs px-2 py-0.5 rounded-full font-semibold', badge.cls)}>{badge.label}</span>
                            : <span className="text-gray-300 text-xs">—</span>
                          }
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{dias}d</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            {([
                              { action: 'mover'     as CardAction, icon: MoveRight, title: 'Mover etapa' },
                              { action: 'historico' as CardAction, icon: History,   title: 'Histórico'  },
                              { action: 'ia'        as CardAction, icon: Brain,     title: 'Ver IA'     },
                            ] as const).map(({ action, icon: Icon, title }) => (
                              <button
                                key={action}
                                onClick={() => handleAction(item, action)}
                                title={title}
                                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-[#185FA5] transition-colors"
                              >
                                <Icon size={14} />
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, listSorted.length)} de {listSorted.length}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-gray-500 px-2">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-40 transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {historicoTarget && (
        <HistoricoModal
          candidatoId={historicoTarget.candidato_id}
          vagaId={historicoTarget.vaga_id}
          candidatoNome={historicoTarget.nome}
          onClose={() => setHistoricoTarget(null)}
        />
      )}

      {moverTarget && (
        <MoverEtapaModal
          pipelineId={moverTarget.id}
          candidatoId={moverTarget.candidato_id}
          vagaId={moverTarget.vaga_id}
          etapaAtual={moverTarget.etapa}
          candidatoNome={moverTarget.nome}
          onClose={() => setMoverTarget(null)}
          onSuccess={novaEtapa => {
            setItems(prev =>
              prev.map(i => i.id === moverTarget!.id ? { ...i, etapa: novaEtapa } : i),
            )
            setMoverTarget(null)
          }}
        />
      )}
    </div>
  )
}
