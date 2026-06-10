'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, CalendarDays, Clock, Video,
  Loader2, X, Trash2, Users, PhoneCall,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Evento = {
  id: string
  titulo: string
  descricao: string | null
  data: string
  tipo: string
  created_at: string
}

type FormState = {
  titulo: string
  descricao: string
  data: string
  tipo: string
}

const EMPTY_FORM: FormState = { titulo: '', descricao: '', data: '', tipo: 'REUNIAO' }

const tipoConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  ENTREVISTA: { label: 'Entrevista',  color: '#185FA5', icon: <Users size={12} /> },
  REUNIAO:    { label: 'Reunião',     color: '#059669', icon: <Video size={12} /> },
  FEEDBACK:   { label: 'Feedback',    color: '#d97706', icon: <PhoneCall size={12} /> },
  OUTRO:      { label: 'Outro',       color: '#7c3aed', icon: <CalendarDays size={12} /> },
}

function formatarData(iso: string) {
  const d = new Date(iso)
  return {
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    data: d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' }),
  }
}

function isHoje(iso: string) {
  const d = new Date(iso)
  const h = new Date()
  return d.getFullYear() === h.getFullYear() && d.getMonth() === h.getMonth() && d.getDate() === h.getDate()
}

export default function AgendaPage() {
  const [eventos, setEventos]     = useState<Evento[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [tipoFilter, setTipo]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const fetchEventos = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase.from('eventos').select('*').order('data', { ascending: true })
    if (tipoFilter) query = query.eq('tipo', tipoFilter)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setEventos(data ?? [])
    setLoading(false)
  }, [tipoFilter])

  useEffect(() => { fetchEventos() }, [fetchEventos])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('eventos').insert([{
      titulo: form.titulo,
      descricao: form.descricao || null,
      data: new Date(form.data).toISOString(),
      tipo: form.tipo,
    }])
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    fetchEventos()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este evento?')) return
    await supabase.from('eventos').delete().eq('id', id)
    setEventos(prev => prev.filter(e => e.id !== id))
  }

  const eventosHoje    = eventos.filter(e => isHoje(e.data))
  const eventosFuturos = eventos.filter(e => !isHoje(e.data) && new Date(e.data) > new Date())
  const eventoPassados = eventos.filter(e => new Date(e.data) < new Date() && !isHoje(e.data))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="text-gray-500 text-sm mt-1 capitalize">{hoje}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Novo evento
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro: {error}
        </div>
      )}

      {/* Filtro */}
      <div className="card p-4">
        <div className="flex gap-3">
          <select className="input sm:w-44" value={tipoFilter} onChange={e => setTipo(e.target.value)}>
            <option value="">Todos os tipos</option>
            {Object.entries(tipoConfig).map(([k, v]) => (
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
      {!loading && eventos.length === 0 && !error && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f0f9' }}>
            <CalendarDays size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhum evento agendado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Crie entrevistas, reuniões e feedbacks aqui.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={15} />
            Novo evento
          </button>
        </div>
      )}

      {/* Conteúdo */}
      {!loading && eventos.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Timeline */}
          <div className="xl:col-span-2 space-y-6">
            {/* Hoje */}
            {eventosHoje.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: '#185FA5' }}
                  />
                  Hoje · {eventosHoje.length} evento{eventosHoje.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-3">
                  {eventosHoje.map(e => <EventoCard key={e.id} evento={e} onDelete={handleDelete} />)}
                </div>
              </div>
            )}

            {/* Próximos */}
            {eventosFuturos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  Próximos · {eventosFuturos.length} evento{eventosFuturos.length !== 1 ? 's' : ''}
                </h2>
                <div className="space-y-3">
                  {eventosFuturos.map(e => <EventoCard key={e.id} evento={e} onDelete={handleDelete} />)}
                </div>
              </div>
            )}

            {/* Passados */}
            {eventoPassados.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                  Passados
                </h2>
                <div className="space-y-3 opacity-60">
                  {eventoPassados.slice(0, 3).map(e => <EventoCard key={e.id} evento={e} onDelete={handleDelete} />)}
                </div>
              </div>
            )}
          </div>

          {/* Mini resumo lateral */}
          <div className="card h-fit">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays size={16} style={{ color: '#185FA5' }} />
              <h2 className="text-sm font-semibold text-gray-900">Resumo</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: 'Hoje',    count: eventosHoje.length,    color: '#185FA5' },
                { label: 'Futuros', count: eventosFuturos.length, color: '#059669' },
                { label: 'Total',   count: eventos.length,        color: '#7c3aed' },
              ].map(({ label, count, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{label}</span>
                  <span className="text-sm font-bold" style={{ color }}>{count}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Por tipo</p>
              {Object.entries(tipoConfig).map(([tipo, cfg]) => {
                const c = eventos.filter(e => e.tipo === tipo).length
                if (c === 0) return null
                return (
                  <div key={tipo} className="flex items-center justify-between py-1">
                    <span className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      {cfg.label}
                    </span>
                    <span className="text-xs font-semibold text-gray-700">{c}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal novo evento */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Novo Evento</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Título <span className="text-red-500">*</span>
                  </label>
                  <input className="input" placeholder="Ex: Entrevista – Ana Paula Souza" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Data e hora <span className="text-red-500">*</span>
                    </label>
                    <input className="input" type="datetime-local" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo</label>
                    <select className="input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                      {Object.entries(tipoConfig).map(([k, v]) => (
                        <option key={k} value={k}>{v.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                  <textarea className="input min-h-[70px] resize-none" placeholder="Observações sobre o evento..." value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Criar evento'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function EventoCard({ evento, onDelete }: { evento: Evento; onDelete: (id: string) => void }) {
  const tc = tipoConfig[evento.tipo] ?? { label: evento.tipo, color: '#6b7280', icon: null }
  const { hora, data } = formatarData(evento.data)

  return (
    <div className="card flex gap-4 hover:shadow-md transition-shadow group">
      <div className="text-center w-16 flex-shrink-0">
        <p className="text-sm font-bold text-gray-900">{hora}</p>
        <p className="text-xs text-gray-400 capitalize">{data}</p>
      </div>
      <div className="w-1 rounded-full flex-shrink-0" style={{ background: tc.color }} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate">{evento.titulo}</p>
        {evento.descricao && (
          <p className="text-sm text-gray-400 mt-0.5 truncate">{evento.descricao}</p>
        )}
        <div className="flex items-center gap-3 mt-2">
          <span
            className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: tc.color + '20', color: tc.color }}
          >
            {tc.icon}
            {tc.label}
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />
            {hora}
          </span>
        </div>
      </div>
      <button
        onClick={() => onDelete(evento.id)}
        className="p-1.5 rounded-lg text-gray-200 hover:text-red-500 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 self-start"
        title="Excluir"
      >
        <Trash2 size={14} />
      </button>
    </div>
  )
}
