'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Filter, Briefcase, Clock, Trash2, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Vaga = {
  id: string
  titulo: string
  empresa: string
  descricao: string | null
  requisitos: string | null
  diferenciais: string | null
  status: string
  created_at: string
}

type FormState = {
  titulo: string
  empresa: string
  descricao: string
  requisitos: string
  diferenciais: string
  status: string
}

const EMPTY_FORM: FormState = {
  titulo: '',
  empresa: '',
  descricao: '',
  requisitos: '',
  diferenciais: '',
  status: 'ABERTA',
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  ABERTA:       { label: 'Aberta',       cls: 'bg-green-100 text-green-700' },
  EM_ANDAMENTO: { label: 'Em andamento', cls: 'bg-blue-100 text-blue-700' },
  ENCERRADA:    { label: 'Encerrada',    cls: 'bg-gray-100 text-gray-600' },
  CANCELADA:    { label: 'Cancelada',    cls: 'bg-red-100 text-red-700' },
}

function diasDesde(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  return d === 0 ? 'Hoje' : `${d}d atrás`
}

export default function VagasPage() {
  const [vagas, setVagas]           = useState<Vaga[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)

  const fetchVagas = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase.from('vagas').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search.trim()) query = query.ilike('titulo', `%${search.trim()}%`)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setVagas(data ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchVagas() }, [fetchVagas])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('vagas').insert([form])
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    fetchVagas()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta vaga permanentemente?')) return
    await supabase.from('vagas').delete().eq('id', id)
    setVagas(prev => prev.filter(v => v.id !== id))
  }

  const vagasAtivas = vagas.filter(v => v.status !== 'ENCERRADA' && v.status !== 'CANCELADA').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vagas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? 'Carregando...' : `${vagasAtivas} vaga${vagasAtivas !== 1 ? 's' : ''} ativa${vagasAtivas !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          Nova vaga
        </button>
      </div>

      {/* Erro global */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro ao conectar com o banco: {error}
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar vagas..."
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
            <option value="ABERTA">Aberta</option>
            <option value="EM_ANDAMENTO">Em andamento</option>
            <option value="ENCERRADA">Encerrada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
          <button className="btn-secondary flex items-center gap-2 whitespace-nowrap">
            <Filter size={15} />
            Filtros
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#185FA5]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && vagas.length === 0 && !error && (
        <div className="card text-center py-16">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#e8f0f9' }}
          >
            <Briefcase size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhuma vaga encontrada</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search || statusFilter ? 'Tente ajustar os filtros.' : 'Crie sua primeira vaga agora.'}
          </p>
          {!search && !statusFilter && (
            <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} />
              Criar vaga
            </button>
          )}
        </div>
      )}

      {/* Lista */}
      {!loading && vagas.length > 0 && (
        <div className="grid gap-4">
          {vagas.map((vaga) => {
            const sc = statusConfig[vaga.status] ?? { label: vaga.status, cls: 'bg-gray-100 text-gray-600' }
            return (
              <div
                key={vaga.id}
                className="card hover:shadow-md transition-shadow border border-transparent hover:border-[#185FA5]/20"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: '#e8f0f9' }}
                      >
                        <Briefcase size={18} style={{ color: '#185FA5' }} />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-gray-900 truncate">{vaga.titulo}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">{vaga.empresa}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={12} />
                        {diasDesde(vaga.created_at)}
                      </span>
                      {vaga.descricao && (
                        <span className="text-xs text-gray-400 truncate max-w-sm">{vaga.descricao}</span>
                      )}
                    </div>

                    {(vaga.requisitos || vaga.diferenciais) && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {vaga.requisitos && (
                          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">
                            {vaga.requisitos.slice(0, 60)}{vaga.requisitos.length > 60 ? '…' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-3 flex-shrink-0">
                    <span className={`badge ${sc.cls}`}>{sc.label}</span>
                    <button
                      onClick={() => handleDelete(vaga.id)}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                      title="Excluir vaga"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal nova vaga */}
      {modalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => setModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Nova Vaga</h2>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Título da vaga <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Ex: Desenvolvedor Full Stack Sênior"
                    value={form.titulo}
                    onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Empresa <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Nome da empresa"
                    value={form.empresa}
                    onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="ABERTA">Aberta</option>
                    <option value="EM_ANDAMENTO">Em andamento</option>
                    <option value="ENCERRADA">Encerrada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
                  <textarea
                    className="input min-h-[80px] resize-none"
                    placeholder="Responsabilidades e contexto da vaga..."
                    value={form.descricao}
                    onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Requisitos</label>
                  <textarea
                    className="input min-h-[80px] resize-none"
                    placeholder="Habilidades e experiências necessárias..."
                    value={form.requisitos}
                    onChange={e => setForm(f => ({ ...f, requisitos: e.target.value }))}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Diferenciais</label>
                  <input
                    className="input"
                    placeholder="Ex: Inglês avançado, AWS, MBA..."
                    value={form.diferenciais}
                    onChange={e => setForm(f => ({ ...f, diferenciais: e.target.value }))}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving
                      ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                      : 'Criar vaga'
                    }
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
