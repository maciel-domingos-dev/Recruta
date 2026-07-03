'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Filter, Mail, Trash2, X, Loader2, Upload,
  User, Sparkles, FileText, Pencil, Phone, MapPin, BookOpen,
  Briefcase, Award, Globe, Car, ExternalLink, ChevronDown, ChevronUp, Download,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Experiencia = {
  empresa: string
  cargo: string
  periodo_inicio: string
  periodo_fim: string
  descricao: string
}

type FormacaoItem = {
  instituicao: string
  curso: string
  nivel: string
  periodo_inicio: string
  periodo_fim: string
}

type Candidato = {
  id: string
  nome: string
  email: string
  telefone: string | null
  cidade: string | null
  estado: string | null
  cargo: string | null
  status: string
  resumo: string | null
  curriculo: string | null
  experiencias: Experiencia[] | null
  formacao: FormacaoItem[] | null
  habilidades: string[] | null
  idiomas: string[] | null
  cnh: string | null
  curriculo_url: string | null
  created_at: string
}

type FormState = {
  nome: string
  email: string
  telefone: string
  cidade: string
  estado: string
  cargo: string
  status: string
  resumo: string
  curriculo: string
  experiencias: Experiencia[]
  formacao: FormacaoItem[]
  habilidades: string   // comma-separated em UI
  idiomas: string       // comma-separated em UI
  cnh: string
}

type PdfData = {
  nome: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  cargo: string | null
  resumo: string | null
  experiencias: Experiencia[]
  formacao: FormacaoItem[]
  habilidades: string[]
  idiomas: string[]
  cnh: string | null
  curriculo: string
}

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_EXP    = (): Experiencia   => ({ empresa: '', cargo: '', periodo_inicio: '', periodo_fim: '', descricao: '' })
const EMPTY_FORM_E = (): FormacaoItem  => ({ instituicao: '', curso: '', nivel: '', periodo_inicio: '', periodo_fim: '' })

const EMPTY_FORM: FormState = {
  nome: '', email: '', telefone: '', cidade: '', estado: '',
  cargo: '', status: 'DISPONIVEL', resumo: '', curriculo: '',
  experiencias: [], formacao: [], habilidades: '', idiomas: '', cnh: '',
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  DISPONIVEL:  { label: 'Disponível',  cls: 'bg-green-100 text-green-700' },
  EM_PROCESSO: { label: 'Em processo', cls: 'bg-blue-100 text-blue-700' },
  CONTRATADO:  { label: 'Contratado',  cls: 'bg-purple-100 text-purple-700' },
  ATIVO:       { label: 'Ativo',       cls: 'bg-gray-100 text-gray-600' },
  INATIVO:     { label: 'Inativo',     cls: 'bg-red-100 text-red-700' },
}

const AVATAR_COLORS = ['#185FA5', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isNovo(created_at: string) {
  return Date.now() - new Date(created_at).getTime() < 24 * 60 * 60 * 1000
}

function candidatoToForm(c: Candidato): FormState {
  return {
    nome:         c.nome,
    email:        c.email,
    telefone:     c.telefone     ?? '',
    cidade:       c.cidade       ?? '',
    estado:       c.estado       ?? '',
    cargo:        c.cargo        ?? '',
    status:       c.status,
    resumo:       c.resumo       ?? '',
    curriculo:    c.curriculo    ?? '',
    experiencias: c.experiencias ?? [],
    formacao:     c.formacao     ?? [],
    habilidades:  c.habilidades  ? c.habilidades.join(', ') : '',
    idiomas:      c.idiomas      ? c.idiomas.join(', ')     : '',
    cnh:          c.cnh          ?? '',
  }
}

function formToPayload(f: FormState) {
  return {
    nome:         f.nome,
    email:        f.email,
    telefone:     f.telefone     || null,
    cidade:       f.cidade       || null,
    estado:       f.estado       || null,
    cargo:        f.cargo        || null,
    status:       f.status,
    resumo:       f.resumo       || null,
    curriculo:    f.curriculo    || null,
    experiencias: f.experiencias.length > 0 ? f.experiencias : [],
    formacao:     f.formacao.length     > 0 ? f.formacao     : [],
    habilidades:  f.habilidades ? f.habilidades.split(',').map(s => s.trim()).filter(Boolean) : [],
    idiomas:      f.idiomas      ? f.idiomas.split(',').map(s => s.trim()).filter(Boolean)      : [],
    cnh:          f.cnh          || null,
  }
}

async function extractPdf(file: File): Promise<PdfData> {
  if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
    throw new Error('Apenas arquivos PDF são aceitos.')
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('Arquivo muito grande. Máximo: 10 MB.')
  const fd = new FormData()
  fd.append('curriculo', file)
  const res  = await fetch('/api/extrair-curriculo', { method: 'POST', body: fd })
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Erro ao extrair currículo')
  return json as PdfData
}

async function uploadPdf(file: File): Promise<string | null> {
  try {
    const fd = new FormData()
    fd.append('pdf', file)
    const res  = await fetch('/api/candidatos/upload-pdf', { method: 'POST', body: fd })
    const json = await res.json()
    return res.ok ? (json.url as string) : null
  } catch {
    return null
  }
}

function friendlyError(msg: string): string {
  if (msg.includes('duplicate') || msg.includes('23505') || msg.includes('unique')) {
    return 'Já existe um candidato cadastrado com este e-mail.'
  }
  return msg
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function AvatarCircle({ nome, large }: { nome: string; large?: boolean }) {
  const initials = nome.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  const color    = AVATAR_COLORS[nome.charCodeAt(0) % AVATAR_COLORS.length]
  const sz       = large ? 'w-14 h-14 text-lg' : 'w-10 h-10 text-sm'
  return (
    <div
      className={`${sz} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ background: color }}
    >
      {initials}
    </div>
  )
}

function SectionLabel({ label }: { label: string }) {
  return (
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-1">
      {label}
    </p>
  )
}

function TagPill({ label, variant = 'gray' }: { label: string; variant?: 'gray' | 'blue' }) {
  const cls = variant === 'blue'
    ? 'bg-[#e8f0f9] text-[#185FA5]'
    : 'bg-gray-100 text-gray-600'
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium ${cls}`}>
      {label}
    </span>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CandidatosPage() {
  // List state
  const [candidatos, setCandidatos]   = useState<Candidato[]>([])
  const [loading, setLoading]         = useState(true)
  const [listError, setListError]     = useState('')
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatus]     = useState('')

  // Form modal state (create + edit)
  const [formOpen, setFormOpen]       = useState(false)
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [form, setForm]               = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]           = useState(false)
  const [saveError, setSaveError]     = useState('')

  // PDF state inside form modal
  const [pdfFile, setPdfFile]               = useState<File | null>(null)
  const [extracting, setExtracting]         = useState(false)
  const [extractError, setExtractError]     = useState('')
  const [aiPreencheu, setAiPreencheu]       = useState(false)
  const [modalDragOver, setModalDragOver]   = useState(false)
  const pdfInputRef = useRef<HTMLInputElement>(null)

  // Import zone state (listing page)
  const [importingPdf, setImportingPdf] = useState(false)
  const [importError, setImportError]   = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const importPdfInputRef = useRef<HTMLInputElement>(null)

  // Detail view modal
  const [viewCandidato, setViewCandidato]         = useState<Candidato | null>(null)
  const [curriculoExpanded, setCurriculoExpanded] = useState(false)
  const [downloadingPdf, setDownloadingPdf]       = useState(false)

  // ─── Data fetching ─────────────────────────────────────────────────────────

  const fetchCandidatos = useCallback(async () => {
    setLoading(true)
    setListError('')
    let query = supabase.from('candidatos').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search.trim()) query = query.or(`nome.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)
    const { data, error: err } = await query
    if (err) setListError(err.message)
    else setCandidatos((data ?? []) as Candidato[])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchCandidatos() }, [fetchCandidatos])

  // ─── Form helpers ──────────────────────────────────────────────────────────

  function resetPdfState() {
    setPdfFile(null)
    setExtracting(false)
    setExtractError('')
    setAiPreencheu(false)
    setModalDragOver(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
  }

  function openNewForm() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    resetPdfState()
    setFormOpen(true)
  }

  function openEditForm(c: Candidato) {
    setViewCandidato(null)
    setEditingId(c.id)
    setForm(candidatoToForm(c))
    setSaveError('')
    resetPdfState()
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setSaveError('')
    resetPdfState()
  }

  // ─── Save (create + update) ────────────────────────────────────────────────

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')

    // Upload PDF to storage if one was selected
    let curriculo_url: string | null = null
    if (pdfFile) {
      curriculo_url = await uploadPdf(pdfFile)
    }

    const payload = {
      ...formToPayload(form),
      ...(curriculo_url ? { curriculo_url } : {}),
    }

    if (editingId) {
      const { error: err } = await supabase.from('candidatos').update(payload).eq('id', editingId)
      if (err) { setSaving(false); setSaveError(friendlyError(err.message)); return }
    } else {
      const { error: err } = await supabase.from('candidatos').insert([payload])
      if (err) { setSaving(false); setSaveError(friendlyError(err.message)); return }
    }

    setSaving(false)
    closeForm()
    fetchCandidatos()
  }

  // ─── PDF handlers (modal) ──────────────────────────────────────────────────

  async function handleModalPdfFile(file: File) {
    setPdfFile(file)
    setExtracting(true)
    setExtractError('')
    setAiPreencheu(false)
    if (pdfInputRef.current) pdfInputRef.current.value = ''
    try {
      const data = await extractPdf(file)
      setForm(f => ({
        ...f,
        nome:         data.nome         || f.nome,
        email:        data.email        || f.email,
        telefone:     data.telefone     || f.telefone,
        cidade:       data.cidade       || f.cidade,
        estado:       data.estado       || f.estado,
        cargo:        data.cargo        || f.cargo,
        resumo:       data.resumo       || f.resumo,
        curriculo:    data.curriculo    || f.curriculo,
        experiencias: data.experiencias.length > 0 ? data.experiencias : f.experiencias,
        formacao:     data.formacao.length     > 0 ? data.formacao     : f.formacao,
        habilidades:  data.habilidades.length  > 0 ? data.habilidades.join(', ')  : f.habilidades,
        idiomas:      data.idiomas.length      > 0 ? data.idiomas.join(', ')      : f.idiomas,
        cnh:          data.cnh          || f.cnh,
      }))
      setAiPreencheu(true)
    } catch (err) {
      setExtractError(err instanceof Error ? err.message : 'Erro ao processar o PDF')
    } finally {
      setExtracting(false)
    }
  }

  function handlePdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleModalPdfFile(file)
  }

  function handleModalDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!extracting) setModalDragOver(true)
  }
  function handleModalDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setModalDragOver(false)
  }
  function handleModalDrop(e: React.DragEvent) {
    e.preventDefault()
    setModalDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleModalPdfFile(file)
  }

  // ─── PDF handlers (import zone) ────────────────────────────────────────────

  async function handleImportPdfFile(file: File) {
    setImportingPdf(true)
    setImportError('')
    try {
      const data = await extractPdf(file)
      setForm({
        nome:         data.nome         ?? '',
        email:        data.email        ?? '',
        telefone:     data.telefone     ?? '',
        cidade:       data.cidade       ?? '',
        estado:       data.estado       ?? '',
        cargo:        data.cargo        ?? '',
        status:       'DISPONIVEL',
        resumo:       data.resumo       ?? '',
        curriculo:    data.curriculo,
        experiencias: data.experiencias,
        formacao:     data.formacao,
        habilidades:  data.habilidades.join(', '),
        idiomas:      data.idiomas.join(', '),
        cnh:          data.cnh          ?? '',
      })
      setPdfFile(file)
      setAiPreencheu(true)
      setSaveError('')
      setEditingId(null)
      setFormOpen(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao processar o PDF')
    } finally {
      setImportingPdf(false)
      setDragOver(false)
      if (importPdfInputRef.current) importPdfInputRef.current.value = ''
    }
  }

  function handleImportPdfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleImportPdfFile(file)
  }

  function handleImportDragOver(e: React.DragEvent) { e.preventDefault(); if (!importingPdf) setDragOver(true) }
  function handleImportDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
  }
  function handleImportDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImportPdfFile(file)
  }

  // ─── Experiências handlers ─────────────────────────────────────────────────

  function addExp() { setForm(f => ({ ...f, experiencias: [...f.experiencias, EMPTY_EXP()] })) }
  function removeExp(i: number) { setForm(f => ({ ...f, experiencias: f.experiencias.filter((_, idx) => idx !== i) })) }
  function updateExp(i: number, field: keyof Experiencia, val: string) {
    setForm(f => ({
      ...f,
      experiencias: f.experiencias.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
    }))
  }

  // ─── Formação handlers ─────────────────────────────────────────────────────

  function addFormacao() { setForm(f => ({ ...f, formacao: [...f.formacao, EMPTY_FORM_E()] })) }
  function removeFormacao(i: number) { setForm(f => ({ ...f, formacao: f.formacao.filter((_, idx) => idx !== i) })) }
  function updateFormacao(i: number, field: keyof FormacaoItem, val: string) {
    setForm(f => ({
      ...f,
      formacao: f.formacao.map((e, idx) => idx === i ? { ...e, [field]: val } : e),
    }))
  }

  // ─── Download PDF ──────────────────────────────────────────────────────────

  async function downloadPdf(url: string, nome: string) {
    setDownloadingPdf(true)
    try {
      const res  = await fetch(url)
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href     = objectUrl
      a.download = `curriculo-${nome.replace(/\s+/g, '-').toLowerCase()}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(objectUrl)
    } catch {
      // silently ignore — URL still works via "Ver PDF"
    } finally {
      setDownloadingPdf(false)
    }
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation()

    // Verifica vínculos antes de confirmar
    const [{ data: entrevistasVinc }, { data: pipelineVinc }] = await Promise.all([
      supabase.from('entrevistas').select('id').eq('candidato_id', id),
      supabase.from('pipeline').select('id').eq('candidato_id', id),
    ])

    const nEntrevistas = entrevistasVinc?.length ?? 0
    const nPipeline    = pipelineVinc?.length    ?? 0

    let msg = 'Excluir este candidato permanentemente?'
    if (nEntrevistas > 0 || nPipeline > 0) {
      const partes: string[] = []
      if (nEntrevistas > 0) partes.push(`${nEntrevistas} entrevista${nEntrevistas > 1 ? 's' : ''}`)
      if (nPipeline    > 0) partes.push(`${nPipeline} entrada${nPipeline > 1 ? 's' : ''} no pipeline`)
      msg = `Excluir este candidato permanentemente?\n\nIsso também removerá: ${partes.join(' e ')}.`
    }

    if (!confirm(msg)) return

    // Deleta entrevistas explicitamente (cascade seguro, independente de migration de FK)
    if (nEntrevistas > 0) {
      const { error: eErr } = await supabase.from('entrevistas').delete().eq('candidato_id', id)
      if (eErr) { alert(`Erro ao excluir entrevistas vinculadas: ${eErr.message}`); return }
    }

    // Pipeline já tem ON DELETE CASCADE no banco — o delete do candidato limpa automaticamente
    const { error: delErr } = await supabase.from('candidatos').delete().eq('id', id)
    if (delErr) { alert(`Erro ao excluir candidato: ${delErr.message}`); return }

    setCandidatos(prev => prev.filter(c => c.id !== id))
    if (viewCandidato?.id === id) setViewCandidato(null)
  }

  // ══════════════════════════════════════════════════════════════════════════
  // JSX
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidatos</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? '...' : `${candidatos.length} candidato${candidatos.length !== 1 ? 's' : ''} encontrado${candidatos.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={openNewForm} className="btn-primary flex items-center gap-2 self-start sm:self-auto">
          <Plus size={16} /> Novo candidato
        </button>
      </div>

      {listError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro ao conectar: {listError}
        </div>
      )}

      {/* ── Zona de importação por PDF ── */}
      <div>
        <input ref={importPdfInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleImportPdfChange} />
        <div
          onDragOver={handleImportDragOver}
          onDragLeave={handleImportDragLeave}
          onDrop={handleImportDrop}
          onClick={() => !importingPdf && importPdfInputRef.current?.click()}
          className={`card p-0 overflow-hidden transition-all duration-200 select-none
            ${importingPdf ? 'cursor-wait' : 'cursor-pointer hover:border-[#185FA5]/40'}
            ${dragOver ? 'border-2 border-[#185FA5] bg-[#e8f0f9] shadow-md' : ''}
          `}
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${dragOver ? 'bg-[#185FA5]' : importingPdf ? 'bg-blue-50' : 'bg-gray-100'}`}>
              {importingPdf
                ? <Loader2 size={18} className="animate-spin text-[#185FA5]" />
                : <Upload size={18} className={dragOver ? 'text-white' : 'text-gray-400'} />
              }
            </div>
            <div className="text-center sm:text-left min-w-0 flex-1">
              <p className={`text-sm font-semibold ${dragOver || importingPdf ? 'text-[#185FA5]' : 'text-gray-700'}`}>
                {importingPdf ? 'Analisando currículo com IA...' : dragOver ? 'Solte o PDF para analisar' : 'Importar candidato via currículo (PDF)'}
              </p>
              {!importingPdf && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {dragOver
                    ? 'Os dados serão extraídos e o formulário abrirá pronto para revisão'
                    : 'Arraste um PDF aqui ou clique para selecionar — nome, e-mail, cargo, experiências e mais são preenchidos automaticamente'
                  }
                </p>
              )}
            </div>
            {!importingPdf && !dragOver && (
              <span className="ml-auto flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-400 whitespace-nowrap">
                <Sparkles size={11} className="text-[#185FA5]" /> Powered by IA
              </span>
            )}
          </div>
          {importError && <div className="px-4 pb-3 -mt-1"><p className="text-xs text-red-600">{importError}</p></div>}
        </div>
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Buscar por nome ou e-mail..." className="input pl-9" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="input sm:w-44" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button className="btn-secondary flex items-center gap-2 whitespace-nowrap"><Filter size={15} /> Filtros</button>
        </div>
      </div>

      {loading && <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-[#185FA5]" /></div>}

      {!loading && candidatos.length === 0 && !listError && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f0f9' }}>
            <User size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhum candidato encontrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search || statusFilter ? 'Tente ajustar os filtros.' : 'Cadastre o primeiro candidato agora.'}
          </p>
          {!search && !statusFilter && (
            <button onClick={openNewForm} className="btn-primary inline-flex items-center gap-2"><Plus size={15} /> Novo candidato</button>
          )}
        </div>
      )}

      {/* ── Tabela ── */}
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
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {candidatos.map((c) => {
                  const sc = statusConfig[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr
                      key={c.id}
                      onClick={() => { setViewCandidato(c); setCurriculoExpanded(false) }}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <AvatarCircle nome={c.nome} />
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-medium text-gray-900 truncate">{c.nome}</span>
                            {isNovo(c.created_at) && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#185FA5] text-white text-[10px] font-bold leading-none flex-shrink-0">
                                <Sparkles size={9} /> NOVO
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Mail size={11} /> {c.email}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">{c.cargo ?? '—'}</td>
                      <td className="px-4 py-4"><span className={`badge ${sc.cls}`}>{sc.label}</span></td>
                      <td className="px-4 py-4 text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                      <td className="px-4 py-4">
                        <button
                          onClick={ev => handleDelete(c.id, ev)}
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

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Novo / Editar Candidato
      ══════════════════════════════════════════════════════════════════════ */}
      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={closeForm} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <h2 className="text-lg font-bold text-gray-900">{editingId ? 'Editar Candidato' : 'Novo Candidato'}</h2>
                <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-5">

                {/* ── Seção: Dados Pessoais ── */}
                <div>
                  <SectionLabel label="Dados Pessoais" />
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo <span className="text-red-500">*</span></label>
                      <input className="input" placeholder="Ex: Ana Paula Souza" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail <span className="text-red-500">*</span></label>
                        <input className="input" type="email" placeholder="candidato@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone / WhatsApp</label>
                        <input className="input" placeholder="(11) 99999-9999" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cidade</label>
                        <input className="input" placeholder="São Paulo" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                        <input className="input" placeholder="SP" maxLength={2} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Cargo pretendido</label>
                        <input className="input" placeholder="Ex: Desenvolvedor Full Stack" value={form.cargo} onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                        <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                          <option value="DISPONIVEL">Disponível</option>
                          <option value="EM_PROCESSO">Em processo seletivo</option>
                          <option value="CONTRATADO">Contratado</option>
                          <option value="INATIVO">Inativo</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Seção: Currículo ── */}
                <div className="border-t border-gray-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <SectionLabel label="Currículo" />
                    {aiPreencheu && (
                      <span className="flex items-center gap-1 text-[10px] font-semibold text-[#185FA5] bg-[#e8f0f9] px-2 py-0.5 rounded-full -mt-1">
                        <Sparkles size={9} /> Extraído pelo currículo
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col">
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5"><FileText size={11} /> Upload de PDF</p>
                      <input ref={pdfInputRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handlePdfChange} />
                      <div
                        onClick={() => !extracting && pdfInputRef.current?.click()}
                        onDragOver={handleModalDragOver}
                        onDragLeave={handleModalDragLeave}
                        onDrop={handleModalDrop}
                        className={`flex-1 min-h-[148px] flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-200
                          ${extracting ? 'border-[#185FA5]/50 bg-blue-50 cursor-wait' : modalDragOver ? 'border-[#185FA5] bg-[#e8f0f9] scale-[1.01]' : pdfFile ? 'border-[#185FA5] bg-[#e8f0f9] cursor-pointer hover:bg-blue-100/60' : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-[#185FA5]/50 hover:bg-blue-50/40'}
                        `}
                      >
                        {extracting ? (
                          <><Loader2 size={24} className="animate-spin text-[#185FA5]" /><p className="text-xs text-[#185FA5] font-medium text-center px-2">Analisando currículo com IA...</p></>
                        ) : modalDragOver ? (
                          <><div className="w-10 h-10 rounded-xl bg-[#185FA5] flex items-center justify-center"><Upload size={18} className="text-white" /></div><p className="text-xs text-[#185FA5] font-medium">Solte o PDF aqui</p></>
                        ) : pdfFile ? (
                          <><div className="w-10 h-10 rounded-xl bg-[#185FA5] flex items-center justify-center"><FileText size={18} className="text-white" /></div><p className="text-xs text-[#185FA5] font-medium text-center px-2 leading-tight break-all line-clamp-2">{pdfFile.name}</p><p className="text-[10px] text-gray-400">{(pdfFile.size / 1024).toFixed(0)} KB · clique para trocar</p></>
                        ) : (
                          <><div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center"><Upload size={18} className="text-gray-400" /></div><p className="text-xs text-gray-500 text-center leading-tight">Clique ou arraste<br />o PDF do currículo</p><p className="text-[10px] text-gray-400">Máx. 10 MB</p></>
                        )}
                      </div>
                      {extractError && <p className="mt-1.5 text-[10px] text-red-600 leading-tight">{extractError}</p>}
                    </div>
                    <div className="flex flex-col">
                      <p className="text-[11px] font-medium text-gray-500 flex items-center gap-1 mb-1.5"><Pencil size={11} /> Ou cole o texto manualmente</p>
                      <textarea
                        className="flex-1 min-h-[148px] w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs resize-none focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-all leading-relaxed"
                        placeholder={`O PDF preenche aqui automaticamente.\n\nOu cole / digite o currículo:\nExperiência, habilidades, formação...`}
                        value={form.curriculo}
                        onChange={e => { setForm(f => ({ ...f, curriculo: e.target.value })); if (aiPreencheu) setAiPreencheu(false) }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Seção: Resumo Profissional ── */}
                <div className="border-t border-gray-100 pt-5">
                  <SectionLabel label="Resumo Profissional" />
                  <textarea
                    className="input resize-none leading-relaxed"
                    rows={3}
                    placeholder="2-4 frases descrevendo o perfil profissional do candidato..."
                    value={form.resumo}
                    onChange={e => setForm(f => ({ ...f, resumo: e.target.value }))}
                  />
                </div>

                {/* ── Seção: Experiências ── */}
                <div className="border-t border-gray-100 pt-5">
                  <SectionLabel label="Experiências Profissionais" />
                  <div className="space-y-3">
                    {form.experiencias.map((exp, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 relative">
                        <button type="button" onClick={() => removeExp(i)} className="absolute top-2 right-2 p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input className="input text-xs" placeholder="Empresa" value={exp.empresa} onChange={e => updateExp(i, 'empresa', e.target.value)} />
                          <input className="input text-xs" placeholder="Cargo" value={exp.cargo} onChange={e => updateExp(i, 'cargo', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input className="input text-xs" placeholder="Início (ex: Jan/2020)" value={exp.periodo_inicio} onChange={e => updateExp(i, 'periodo_inicio', e.target.value)} />
                          <input className="input text-xs" placeholder='Fim (ou "Atual")' value={exp.periodo_fim} onChange={e => updateExp(i, 'periodo_fim', e.target.value)} />
                        </div>
                        <textarea className="input text-xs resize-none leading-relaxed" rows={2} placeholder="Principais responsabilidades e realizações..." value={exp.descricao} onChange={e => updateExp(i, 'descricao', e.target.value)} />
                      </div>
                    ))}
                    <button type="button" onClick={addExp} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5 w-full justify-center">
                      <Plus size={13} /> Adicionar experiência
                    </button>
                  </div>
                </div>

                {/* ── Seção: Formação ── */}
                <div className="border-t border-gray-100 pt-5">
                  <SectionLabel label="Formação Acadêmica" />
                  <div className="space-y-3">
                    {form.formacao.map((f_, i) => (
                      <div key={i} className="border border-gray-200 rounded-xl p-3 space-y-2 relative">
                        <button type="button" onClick={() => removeFormacao(i)} className="absolute top-2 right-2 p-0.5 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                          <X size={14} />
                        </button>
                        <div className="grid grid-cols-2 gap-2 pr-6">
                          <input className="input text-xs" placeholder="Instituição" value={f_.instituicao} onChange={e => updateFormacao(i, 'instituicao', e.target.value)} />
                          <input className="input text-xs" placeholder="Curso" value={f_.curso} onChange={e => updateFormacao(i, 'curso', e.target.value)} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <input className="input text-xs" placeholder="Nível (ex: Graduação)" value={f_.nivel} onChange={e => updateFormacao(i, 'nivel', e.target.value)} />
                          <input className="input text-xs" placeholder="Início" value={f_.periodo_inicio} onChange={e => updateFormacao(i, 'periodo_inicio', e.target.value)} />
                          <input className="input text-xs" placeholder='Fim (ou "Em andamento")' value={f_.periodo_fim} onChange={e => updateFormacao(i, 'periodo_fim', e.target.value)} />
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addFormacao} className="btn-secondary text-xs py-1.5 flex items-center gap-1.5 w-full justify-center">
                      <Plus size={13} /> Adicionar formação
                    </button>
                  </div>
                </div>

                {/* ── Seção: Habilidades & Outros ── */}
                <div className="border-t border-gray-100 pt-5">
                  <SectionLabel label="Habilidades e Outros" />
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Habilidades / Competências</label>
                      <input className="input" placeholder="React, Node.js, TypeScript, SQL... (separe por vírgula)" value={form.habilidades} onChange={e => setForm(f => ({ ...f, habilidades: e.target.value }))} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Idiomas</label>
                        <input className="input" placeholder="Inglês (Avançado), Espanhol (Básico)... (separe por vírgula)" value={form.idiomas} onChange={e => setForm(f => ({ ...f, idiomas: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">CNH (categoria)</label>
                        <input className="input" placeholder="ex: B, AB, D" value={form.cnh} onChange={e => setForm(f => ({ ...f, cnh: e.target.value.toUpperCase() }))} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Aviso IA ── */}
                {aiPreencheu && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[#e8f0f9] border border-[#185FA5]/20 text-xs text-[#185FA5]">
                    <Sparkles size={13} className="flex-shrink-0 mt-0.5" />
                    <span>Dados preenchidos automaticamente via IA — revise e corrija antes de salvar.</span>
                  </div>
                )}

                {/* ── Erro de save ── */}
                {saveError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                    {saveError}
                  </div>
                )}

                {/* ── Botões ── */}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={closeForm} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : editingId ? 'Salvar alterações' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Detalhes do Candidato
      ══════════════════════════════════════════════════════════════════════ */}
      {viewCandidato && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setViewCandidato(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

              {/* ── Header do detalhe ── */}
              <div className="flex items-start gap-4 p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <AvatarCircle nome={viewCandidato.nome} large />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="text-xl font-bold text-gray-900 leading-tight">{viewCandidato.nome}</h2>
                      {viewCandidato.cargo && <p className="text-sm text-gray-500 mt-0.5">{viewCandidato.cargo}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(() => {
                        const sc = statusConfig[viewCandidato.status] ?? { label: viewCandidato.status, cls: 'bg-gray-100 text-gray-600' }
                        return <span className={`badge ${sc.cls}`}>{sc.label}</span>
                      })()}
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Cadastrado em {new Date(viewCandidato.created_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={() => openEditForm(viewCandidato)} className="btn-secondary text-sm py-1.5 px-3 flex items-center gap-1.5">
                    <Pencil size={13} /> Editar
                  </button>
                  <button onClick={() => setViewCandidato(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                    <X size={18} className="text-gray-500" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-6">

                {/* ── Contato ── */}
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Contato</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-start gap-2">
                      <Mail size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                      <div><p className="text-[10px] text-gray-400">E-mail</p><p className="text-sm text-gray-900 break-all">{viewCandidato.email}</p></div>
                    </div>
                    {viewCandidato.telefone && (
                      <div className="flex items-start gap-2">
                        <Phone size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div><p className="text-[10px] text-gray-400">Telefone</p><p className="text-sm text-gray-900">{viewCandidato.telefone}</p></div>
                      </div>
                    )}
                    {(viewCandidato.cidade || viewCandidato.estado) && (
                      <div className="flex items-start gap-2">
                        <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div><p className="text-[10px] text-gray-400">Localização</p><p className="text-sm text-gray-900">{[viewCandidato.cidade, viewCandidato.estado].filter(Boolean).join(', ')}</p></div>
                      </div>
                    )}
                    {viewCandidato.cnh && (
                      <div className="flex items-start gap-2">
                        <Car size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div><p className="text-[10px] text-gray-400">CNH</p><p className="text-sm text-gray-900">Categoria {viewCandidato.cnh}</p></div>
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Resumo ── */}
                {viewCandidato.resumo && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Resumo Profissional</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{viewCandidato.resumo}</p>
                  </div>
                )}

                {/* ── Experiências ── */}
                {(viewCandidato.experiencias?.length ?? 0) > 0 && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      <span className="flex items-center gap-1.5"><Briefcase size={11} /> Experiências Profissionais</span>
                    </p>
                    <div className="space-y-1">
                      {viewCandidato.experiencias!.map((exp, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-[#185FA5] mt-1.5 flex-shrink-0" />
                            {i < viewCandidato.experiencias!.length - 1 && <div className="w-px flex-1 bg-gray-200 mt-1.5 mb-0" />}
                          </div>
                          <div className="pb-5 flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 text-sm">{exp.cargo}</p>
                            <p className="text-sm text-[#185FA5] font-medium">{exp.empresa}</p>
                            {(exp.periodo_inicio || exp.periodo_fim) && (
                              <p className="text-xs text-gray-400 mt-0.5">{exp.periodo_inicio}{exp.periodo_fim ? ` — ${exp.periodo_fim}` : ''}</p>
                            )}
                            {exp.descricao && <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">{exp.descricao}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Formação ── */}
                {(viewCandidato.formacao?.length ?? 0) > 0 && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">
                      <span className="flex items-center gap-1.5"><BookOpen size={11} /> Formação Acadêmica</span>
                    </p>
                    <div className="space-y-3">
                      {viewCandidato.formacao!.map((f_, i) => (
                        <div key={i} className="flex gap-3 p-3 rounded-xl bg-gray-50">
                          <Award size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{f_.curso}</p>
                            <p className="text-sm text-gray-600">{f_.instituicao}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {f_.nivel}{(f_.periodo_inicio || f_.periodo_fim) ? ` · ${[f_.periodo_inicio, f_.periodo_fim].filter(Boolean).join(' — ')}` : ''}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Habilidades ── */}
                {(viewCandidato.habilidades?.length ?? 0) > 0 && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      <span className="flex items-center gap-1.5"><Sparkles size={11} /> Habilidades</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewCandidato.habilidades!.map((h, i) => <TagPill key={i} label={h} />)}
                    </div>
                  </div>
                )}

                {/* ── Idiomas ── */}
                {(viewCandidato.idiomas?.length ?? 0) > 0 && (
                  <div className="border-t border-gray-100 pt-6">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">
                      <span className="flex items-center gap-1.5"><Globe size={11} /> Idiomas</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {viewCandidato.idiomas!.map((l, i) => <TagPill key={i} label={l} variant="blue" />)}
                    </div>
                  </div>
                )}

                {/* ── Currículo / PDF ── */}
                {(viewCandidato.curriculo || viewCandidato.curriculo_url) && (
                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><FileText size={11} /> Currículo Completo</span>
                      </p>
                      {viewCandidato.curriculo_url ? (
                        <div className="flex items-center gap-2">
                          <a
                            href={viewCandidato.curriculo_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-xs text-[#185FA5] font-medium hover:underline"
                          >
                            <ExternalLink size={12} /> Ver PDF
                          </a>
                          <button
                            onClick={e => { e.stopPropagation(); downloadPdf(viewCandidato.curriculo_url!, viewCandidato.nome) }}
                            disabled={downloadingPdf}
                            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg bg-[#185FA5] text-white hover:bg-[#145293] transition-colors disabled:opacity-60"
                          >
                            {downloadingPdf
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Download size={11} />
                            }
                            Baixar PDF
                          </button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] text-gray-400 italic">
                          <FileText size={10} /> Sem arquivo PDF anexado
                        </span>
                      )}
                    </div>
                    {viewCandidato.curriculo && (
                      <div>
                        <div className={`relative overflow-hidden transition-all duration-300 ${curriculoExpanded ? '' : 'max-h-40'}`}>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap leading-relaxed font-sans bg-gray-50 rounded-xl p-4">
                            {viewCandidato.curriculo}
                          </pre>
                          {!curriculoExpanded && (
                            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-gray-50 to-transparent" />
                          )}
                        </div>
                        <button
                          onClick={() => setCurriculoExpanded(v => !v)}
                          className="mt-2 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mx-auto"
                        >
                          {curriculoExpanded ? <><ChevronUp size={13} /> Recolher</> : <><ChevronDown size={13} /> Ver texto completo</>}
                        </button>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        </>
      )}

    </div>
  )
}
