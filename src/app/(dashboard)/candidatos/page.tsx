'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Plus, Search, Filter, Mail, Trash2, X, Loader2, Upload, User, Sparkles, FileText, Pencil } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Candidato = {
  id: string
  nome: string
  email: string
  cargo: string | null
  curriculo: string | null
  status: string
  created_at: string
}

type FormState = {
  nome: string
  email: string
  cargo: string
  status: string
  curriculo: string
}

const EMPTY_FORM: FormState = { nome: '', email: '', cargo: '', status: 'DISPONIVEL', curriculo: '' }

const statusConfig: Record<string, { label: string; cls: string }> = {
  DISPONIVEL:  { label: 'Disponível',  cls: 'bg-green-100 text-green-700' },
  EM_PROCESSO: { label: 'Em processo', cls: 'bg-blue-100 text-blue-700' },
  CONTRATADO:  { label: 'Contratado',  cls: 'bg-purple-100 text-purple-700' },
  ATIVO:       { label: 'Ativo',       cls: 'bg-gray-100 text-gray-600' },
  INATIVO:     { label: 'Inativo',     cls: 'bg-red-100 text-red-700' },
}

const AVATAR_COLORS = ['#185FA5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

/** Retorna true se o candidato foi cadastrado nas últimas 24 horas */
function isNovo(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000
}

function AvatarCircle({ nome }: { nome: string }) {
  const initials = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const color = AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length]
  return (
    <div
      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

export default function CandidatosPage() {
  const [candidatos, setCandidatos] = useState<Candidato[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [search, setSearch]         = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [modalOpen, setModalOpen]   = useState(false)
  const [saving, setSaving]         = useState(false)
  const [form, setForm]             = useState<FormState>(EMPTY_FORM)

  // Estado do upload de PDF no modal
  const [pdfFile, setPdfFile]       = useState<File | null>(null)
  const [extracting, setExtracting] = useState(false)
  const [extractError, setExtractError] = useState('')
  const [aiPreencheu, setAiPreencheu]   = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  const fetchCandidatos = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase.from('candidatos').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search.trim()) query = query.or(`nome.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setCandidatos(data ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchCandidatos() }, [fetchCandidatos])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { error: err } = await supabase.from('candidatos').insert([form])
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    resetPdfState()
    fetchCandidatos()
  }

  function resetPdfState() {
    setPdfFile(null)
    setExtracting(false)
    setExtractError('')
    setAiPreencheu(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  function handleModalClose() {
    setModalOpen(false)
    setForm(EMPTY_FORM)
    resetPdfState()
  }

  async function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setExtractError('Arquivo muito grande. Máximo: 5 MB.')
      return
    }

    setPdfFile(file)
    setExtracting(true)
    setExtractError('')
    setAiPreencheu(false)

    try {
      const fd = new FormData()
      fd.append('curriculo', file)
      const res  = await fetch('/api/extrair-curriculo', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Erro ao extrair currículo')
      setForm(f => ({ ...f, curriculo: json.curriculo }))
      setAiPreencheu(true)
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Erro ao processar o PDF')
    } finally {
      setExtracting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este candidato permanentemente?')) return
    await supabase.from('candidatos').delete().eq('id', id)
    setCandidatos(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidatos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? '...' : `${candidatos.length} candidato${candidatos.length !== 1 ? 's' : ''} encontrado${candidatos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button className="btn-secondary flex items-center gap-2">
            <Upload size={15} />
            Importar
          </button>
          <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Novo candidato
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro ao conectar: {error}
        </div>
      )}

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou e-mail..."
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
      {!loading && candidatos.length === 0 && !error && (
        <div className="card text-center py-16">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: '#e8f0f9' }}
          >
            <User size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhum candidato encontrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search || statusFilter ? 'Tente ajustar os filtros.' : 'Cadastre o primeiro candidato agora.'}
          </p>
          {!search && !statusFilter && (
            <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} />
              Novo candidato
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      {!loading && candidatos.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">CANDIDATO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">E-MAIL</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CARGO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">STATUS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CADASTRO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {candidatos.map((c) => {
                  const sc = statusConfig[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarCircle nome={c.nome} />
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-gray-900 truncate">{c.nome}</span>
                              {isNovo(c.created_at) && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#185FA5] text-white text-[10px] font-bold leading-none flex-shrink-0">
                                  <Sparkles size={9} />
                                  NOVO
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail size={11} />
                          {c.email}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">{c.cargo ?? '—'}</td>
                      <td className="px-4 py-4">
                        <span className={`badge ${sc.cls}`}>{sc.label}</span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-400">
                        {new Date(c.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal novo candidato */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={handleModalClose} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Novo Candidato</h2>
                <button
                  onClick={handleModalClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Nome completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    placeholder="Ex: Ana Paula Souza"
                    value={form.nome}
                    onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    E-mail <span className="text-red-500">*</span>
                  </label>
                  <input
                    className="input"
                    type="email"
                    placeholder="candidato@email.com"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Cargo pretendido</label>
                  <input
                    className="input"
                    placeholder="Ex: Desenvolvedor Full Stack"
                    value={form.cargo}
                    onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select
                    className="input"
                    value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  >
                    <option value="DISPONIVEL">Disponível</option>
                    <option value="EM_PROCESSO">Em processo seletivo</option>
                    <option value="CONTRATADO">Contratado</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
                {/* ── Currículo: Upload PDF + Textarea lado a lado ── */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-gray-700">
                      Currículo / Experiências
                    </label>
                    {aiPreencheu && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#185FA5] bg-[#e8f0f9] px-2 py-0.5 rounded-full">
                        <Sparkles size={9} /> Preenchido pela IA
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* ── Coluna esquerda: Upload de PDF ── */}
                    <div className="flex flex-col">
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5">
                        <FileText size={11} />
                        Upload de PDF
                      </p>

                      {/* Input oculto */}
                      <input
                        ref={pdfInputRef}
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={handlePdfChange}
                      />

                      {/* Zona de upload */}
                      <div
                        onClick={() => !extracting && pdfInputRef.current?.click()}
                        className={`
                          flex-1 min-h-[148px] flex flex-col items-center justify-center gap-2
                          rounded-xl border-2 border-dashed transition-all duration-200
                          ${extracting
                            ? 'border-[#185FA5]/50 bg-blue-50 cursor-wait'
                            : pdfFile
                            ? 'border-[#185FA5] bg-[#e8f0f9] cursor-pointer hover:bg-blue-100/60'
                            : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-[#185FA5]/50 hover:bg-blue-50/40'
                          }
                        `}
                      >
                        {extracting ? (
                          <>
                            <Loader2 size={24} className="animate-spin text-[#185FA5]" />
                            <p className="text-xs text-[#185FA5] font-medium">Extraindo com IA...</p>
                          </>
                        ) : pdfFile ? (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-[#185FA5] flex items-center justify-center">
                              <FileText size={18} className="text-white" />
                            </div>
                            <p className="text-xs text-[#185FA5] font-medium text-center px-2 leading-tight break-all line-clamp-2">
                              {pdfFile.name}
                            </p>
                            <p className="text-[10px] text-gray-400">
                              {(pdfFile.size / 1024).toFixed(0)} KB · clique para trocar
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                              <Upload size={18} className="text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-500 text-center leading-tight">
                              Clique para enviar<br />o PDF do currículo
                            </p>
                            <p className="text-[10px] text-gray-400">Máx. 5 MB</p>
                          </>
                        )}
                      </div>

                      {extractError && (
                        <p className="mt-1.5 text-[10px] text-red-600 leading-tight">{extractError}</p>
                      )}
                    </div>

                    {/* ── Coluna direita: Textarea manual ── */}
                    <div className="flex flex-col">
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5">
                        <Pencil size={11} />
                        Ou cole o texto manualmente
                      </p>
                      <textarea
                        className="flex-1 min-h-[148px] w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-all leading-relaxed"
                        placeholder={`O PDF preenche aqui automaticamente.\n\nOu cole / digite o currículo:\nExperiência, habilidades, formação...`}
                        value={form.curriculo}
                        onChange={e => {
                          setForm(f => ({ ...f, curriculo: e.target.value }))
                          if (aiPreencheu) setAiPreencheu(false)
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={handleModalClose} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Cadastrar'}
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
