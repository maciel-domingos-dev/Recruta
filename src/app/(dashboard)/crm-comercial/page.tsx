'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Plus, Search, Building2, Mail, Trash2, X, Loader2,
  Hash, Upload, Sparkles, MapPin, Phone, AlertCircle,
  CheckCircle, FileText,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Cliente = {
  id: string
  empresa: string
  contato_nome: string | null
  contato_email: string | null
  vagas_ativas: number
  receita: number
  status: string
  created_at: string
}

type FormState = {
  empresa: string
  contato_nome: string
  contato_email: string
  vagas_ativas: string
  receita: string
  status: string
}

type CnpjInfo = {
  razao_social: string | null
  nome_fantasia: string | null
  cnpj: string
  situacao: string
  atividade: string | null
  endereco: string | null
  telefone: string | null
  email: string | null
}

type Tab = 'cnpj' | 'pdf' | 'manual'

// ─── Constants ───────────────────────────────────────────────────────────────

const EMPTY_FORM: FormState = {
  empresa: '',
  contato_nome: '',
  contato_email: '',
  vagas_ativas: '0',
  receita: '0',
  status: 'PROSPECT',
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  PROSPECT: { label: 'Prospect', cls: 'bg-amber-100 text-amber-700' },
  ATIVO:    { label: 'Ativo',    cls: 'bg-green-100 text-green-700' },
  CONTRATO: { label: 'Contrato', cls: 'bg-blue-100 text-blue-700' },
  INATIVO:  { label: 'Inativo',  cls: 'bg-gray-100 text-gray-600' },
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function formatCnpj(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 14)
  if (digits.length <= 2)  return digits
  if (digits.length <= 5)  return `${digits.slice(0,2)}.${digits.slice(2)}`
  if (digits.length <= 8)  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5)}`
  if (digits.length <= 12) return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8)}`
  return `${digits.slice(0,2)}.${digits.slice(2,5)}.${digits.slice(5,8)}/${digits.slice(8,12)}-${digits.slice(12)}`
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CrmComercialPage() {
  // List state
  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [loading, setLoading]     = useState(true)
  const [listError, setListError] = useState('')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [tab, setTab]             = useState<Tab>('cnpj')
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving]       = useState(false)
  const [saveError, setSaveError] = useState('')
  const [aiPreencheu, setAiPreencheu] = useState(false)

  // CNPJ tab state
  const [cnpjInput, setCnpjInput]   = useState('')
  const [buscandoCnpj, setBuscandoCnpj] = useState(false)
  const [cnpjError, setCnpjError]   = useState('')
  const [cnpjInfo, setCnpjInfo]     = useState<CnpjInfo | null>(null)

  // PDF tab state (modal)
  const [importingPdf, setImportingPdf] = useState(false)
  const [importError, setImportError]   = useState('')
  const [dragOver, setDragOver]         = useState(false)
  const [pdfNome, setPdfNome]           = useState<string | null>(null)
  const importPdfInputRef = useRef<HTMLInputElement>(null)

  // Outside import zone state
  const [outsideImportingPdf, setOutsideImportingPdf] = useState(false)
  const [outsideImportError, setOutsideImportError]   = useState('')
  const [outsideDragOver, setOutsideDragOver]         = useState(false)
  const outsideImportRef = useRef<HTMLInputElement>(null)

  // ─── Data fetching ──────────────────────────────────────────────────────────

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setListError('')
    let query = supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search.trim()) query = query.ilike('empresa', `%${search.trim()}%`)
    const { data, error: err } = await query
    if (err) setListError(err.message)
    else setClientes(data ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  // ─── Modal helpers ──────────────────────────────────────────────────────────

  function openModal() {
    setTab('cnpj')
    setForm(EMPTY_FORM)
    setSaveError('')
    setAiPreencheu(false)
    setCnpjInput('')
    setCnpjError('')
    setCnpjInfo(null)
    setImportError('')
    setPdfNome(null)
    setModalOpen(true)
  }

  function closeModal() {
    setModalOpen(false)
    setCnpjInfo(null)
    setPdfNome(null)
  }

  function switchTab(t: Tab) {
    setTab(t)
    setCnpjError('')
    setImportError('')
    setDragOver(false)
  }

  // ─── Save ───────────────────────────────────────────────────────────────────

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveError('')
    const payload = {
      empresa:       form.empresa,
      contato_nome:  form.contato_nome  || null,
      contato_email: form.contato_email || null,
      vagas_ativas:  parseInt(form.vagas_ativas)  || 0,
      receita:       parseFloat(form.receita) || 0,
      status:        form.status,
    }
    const { error: err } = await supabase.from('clientes').insert([payload])
    setSaving(false)
    if (err) { setSaveError(err.message); return }
    closeModal()
    fetchClientes()
  }

  // ─── CNPJ lookup ────────────────────────────────────────────────────────────

  async function handleBuscarCnpj() {
    const digits = cnpjInput.replace(/\D/g, '')
    if (digits.length !== 14) {
      setCnpjError('CNPJ incompleto — preencha os 14 dígitos.')
      return
    }
    setBuscandoCnpj(true)
    setCnpjError('')
    setCnpjInfo(null)

    try {
      const res  = await fetch(`/api/crm/buscar-cnpj?cnpj=${digits}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao consultar CNPJ')

      const info = json as CnpjInfo
      setCnpjInfo(info)

      // Preenche o formulário com os dados disponíveis
      setForm(f => ({
        ...f,
        empresa:       info.razao_social ?? info.nome_fantasia ?? f.empresa,
        contato_email: info.email ?? f.contato_email,
      }))
      setAiPreencheu(true)
    } catch (err) {
      setCnpjError(err instanceof Error ? err.message : 'Erro ao consultar CNPJ')
    } finally {
      setBuscandoCnpj(false)
    }
  }

  // ─── PDF import ─────────────────────────────────────────────────────────────

  async function handleImportPdfFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setImportError('Apenas arquivos PDF são aceitos.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setImportError('Arquivo muito grande. Máximo: 10 MB.')
      return
    }

    setImportingPdf(true)
    setImportError('')
    setPdfNome(file.name)

    try {
      const fd = new FormData()
      fd.append('empresa', file)
      const res  = await fetch('/api/crm/extrair-pdf', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao extrair dados da empresa')

      setForm(f => ({
        ...f,
        empresa:       json.nome_empresa      ?? f.empresa,
        contato_nome:  json.contato_responsavel ?? f.contato_nome,
        contato_email: json.email              ?? f.contato_email,
      }))
      setAiPreencheu(true)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Erro ao processar o PDF')
      setPdfNome(null)
    } finally {
      setImportingPdf(false)
      setDragOver(false)
      if (importPdfInputRef.current) importPdfInputRef.current.value = ''
    }
  }

  function handleImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleImportPdfFile(file)
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!importingPdf) setDragOver(true)
  }
  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(false)
  }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleImportPdfFile(file)
  }

  // ─── Outside PDF import ─────────────────────────────────────────────────────

  async function handleOutsideImportPdfFile(file: File) {
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setOutsideImportError('Apenas arquivos PDF são aceitos.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setOutsideImportError('Arquivo muito grande. Máximo: 10 MB.')
      return
    }

    setOutsideImportingPdf(true)
    setOutsideImportError('')

    try {
      const fd = new FormData()
      fd.append('empresa', file)
      const res  = await fetch('/api/crm/extrair-pdf', { method: 'POST', body: fd })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao extrair dados da empresa')

      setTab('manual')
      setSaveError('')
      setCnpjInput('')
      setCnpjError('')
      setCnpjInfo(null)
      setImportError('')
      setPdfNome(file.name)
      setForm({
        ...EMPTY_FORM,
        empresa:       json.nome_empresa        ?? '',
        contato_nome:  json.contato_responsavel ?? '',
        contato_email: json.email              ?? '',
      })
      setAiPreencheu(true)
      setModalOpen(true)
    } catch (err) {
      setOutsideImportError(err instanceof Error ? err.message : 'Erro ao processar o PDF')
    } finally {
      setOutsideImportingPdf(false)
      setOutsideDragOver(false)
      if (outsideImportRef.current) outsideImportRef.current.value = ''
    }
  }

  function handleOutsideImportChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) handleOutsideImportPdfFile(file)
  }

  function handleOutsideDragOver(e: React.DragEvent) { e.preventDefault(); if (!outsideImportingPdf) setOutsideDragOver(true) }
  function handleOutsideDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOutsideDragOver(false)
  }
  function handleOutsideDrop(e: React.DragEvent) {
    e.preventDefault()
    setOutsideDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file) handleOutsideImportPdfFile(file)
  }

  // ─── Delete ─────────────────────────────────────────────────────────────────

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  // ─── KPIs ───────────────────────────────────────────────────────────────────

  const ativos     = clientes.filter(c => c.status === 'ATIVO').length
  const prospects  = clientes.filter(c => c.status === 'PROSPECT').length
  const vagasTotal = clientes.reduce((s, c) => s + (c.vagas_ativas ?? 0), 0)
  const mrr        = clientes.filter(c => c.status === 'ATIVO' || c.status === 'CONTRATO')
                              .reduce((s, c) => s + Number(c.receita ?? 0), 0)

  // ══════════════════════════════════════════════════════════════════════════
  // JSX
  // ══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Comercial</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão de clientes e oportunidades comerciais</p>
        </div>
        <button onClick={openModal} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Novo cliente
        </button>
      </div>

      {listError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro: {listError}
        </div>
      )}

      {/* ── Zona de importação por PDF ── */}
      <div>
        <input ref={outsideImportRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleOutsideImportChange} />
        <div
          onDragOver={handleOutsideDragOver}
          onDragLeave={handleOutsideDragLeave}
          onDrop={handleOutsideDrop}
          onClick={() => !outsideImportingPdf && outsideImportRef.current?.click()}
          className={`card p-0 overflow-hidden transition-all duration-200 select-none
            ${outsideImportingPdf ? 'cursor-wait' : 'cursor-pointer hover:border-[#185FA5]/40'}
            ${outsideDragOver ? 'border-2 border-[#185FA5] bg-[#e8f0f9] shadow-md' : ''}
          `}
        >
          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 p-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${outsideDragOver ? 'bg-[#185FA5]' : outsideImportingPdf ? 'bg-blue-50' : 'bg-gray-100'}`}>
              {outsideImportingPdf
                ? <Loader2 size={18} className="animate-spin text-[#185FA5]" />
                : <Upload size={18} className={outsideDragOver ? 'text-white' : 'text-gray-400'} />
              }
            </div>
            <div className="text-center sm:text-left min-w-0 flex-1">
              <p className={`text-sm font-semibold ${outsideDragOver || outsideImportingPdf ? 'text-[#185FA5]' : 'text-gray-700'}`}>
                {outsideImportingPdf ? 'Analisando empresa com IA...' : outsideDragOver ? 'Solte o PDF para analisar' : 'Importar empresa via PDF'}
              </p>
              {!outsideImportingPdf && (
                <p className="text-xs text-gray-400 mt-0.5">
                  {outsideDragOver
                    ? 'Os dados serão extraídos e o formulário abrirá pronto para revisão'
                    : 'Arraste um contrato, proposta ou apresentação — IA extrai os dados automaticamente'
                  }
                </p>
              )}
            </div>
            {!outsideImportingPdf && !outsideDragOver && (
              <span className="ml-auto flex-shrink-0 hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-xs font-medium text-gray-400 whitespace-nowrap">
                <Sparkles size={11} className="text-[#185FA5]" /> Powered by IA
              </span>
            )}
          </div>
          {outsideImportError && (
            <div className="px-4 pb-3 -mt-1">
              <p className="text-xs text-red-600">{outsideImportError}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── KPIs ── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Clientes Ativos',    value: String(ativos),            color: '#185FA5' },
          { label: 'Prospects',          value: String(prospects),         color: '#d97706' },
          { label: 'Vagas no Pipeline',  value: String(vagasTotal),        color: '#7c3aed' },
          { label: 'Receita Total',      value: mrr > 0 ? brl(mrr) : '—', color: '#059669' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── Filtros ── */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por empresa..."
              className="input pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select className="input sm:w-40" value={statusFilter} onChange={e => setStatus(e.target.value)}>
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#185FA5]" />
        </div>
      )}

      {!loading && clientes.length === 0 && !listError && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f0f9' }}>
            <Building2 size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search || statusFilter ? 'Tente ajustar os filtros.' : 'Cadastre seu primeiro cliente.'}
          </p>
          {!search && !statusFilter && (
            <button onClick={openModal} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} /> Novo cliente
            </button>
          )}
        </div>
      )}

      {/* ── Tabela ── */}
      {!loading && clientes.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">EMPRESA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CONTATO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">VAGAS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">RECEITA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">STATUS</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientes.map((c) => {
                  const sc = statusConfig[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#e8f0f9] flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} style={{ color: '#185FA5' }} />
                          </div>
                          <span className="font-medium text-gray-900">{c.empresa}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {c.contato_nome && <p className="font-medium text-gray-700 text-sm">{c.contato_nome}</p>}
                        {c.contato_email && (
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Mail size={10} /> {c.contato_email}
                          </p>
                        )}
                        {!c.contato_nome && !c.contato_email && <span className="text-gray-300 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">
                        {c.vagas_ativas ?? 0} vaga{(c.vagas_ativas ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-800 text-sm">
                        {Number(c.receita) > 0 ? brl(Number(c.receita)) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${sc.cls}`}>{sc.label}</span>
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

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Novo Cliente
      ══════════════════════════════════════════════════════════════════════ */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={closeModal} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-gray-900">Novo Cliente</h2>
                  {aiPreencheu && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-[#185FA5] bg-[#e8f0f9] px-2 py-0.5 rounded-full">
                      <Sparkles size={9} /> Preenchido por IA
                    </span>
                  )}
                </div>
                <button onClick={closeModal} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-5">

                {/* ── Abas ── */}
                <div className="flex gap-1 p-1 bg-gray-100 rounded-xl">
                  {([
                    { id: 'cnpj',   icon: Hash,     label: 'Buscar CNPJ' },
                    { id: 'pdf',    icon: Upload,    label: 'Importar PDF' },
                    { id: 'manual', icon: FileText,  label: 'Manual' },
                  ] as const).map(({ id, icon: Icon, label }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => switchTab(id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-semibold transition-all
                        ${tab === id
                          ? 'bg-white text-[#185FA5] shadow-sm'
                          : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <Icon size={12} /> {label}
                    </button>
                  ))}
                </div>

                {/* ── Aba: CNPJ ── */}
                {tab === 'cnpj' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <Hash size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          className="input pl-9 font-mono tracking-wide"
                          placeholder="00.000.000/0000-00"
                          value={cnpjInput}
                          onChange={e => {
                            setCnpjInput(formatCnpj(e.target.value))
                            setCnpjError('')
                            setCnpjInfo(null)
                          }}
                          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleBuscarCnpj())}
                          maxLength={18}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={handleBuscarCnpj}
                        disabled={buscandoCnpj}
                        className="btn-primary px-4 flex items-center gap-2 whitespace-nowrap"
                      >
                        {buscandoCnpj
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Search size={14} />}
                        {buscandoCnpj ? 'Buscando...' : 'Buscar'}
                      </button>
                    </div>

                    {cnpjError && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                        {cnpjError}
                      </div>
                    )}

                    {/* Card de resultado do CNPJ */}
                    {cnpjInfo && (
                      <div className="rounded-xl border border-[#185FA5]/20 bg-[#e8f0f9]/40 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 bg-[#185FA5]/10 border-b border-[#185FA5]/10">
                          <div className="flex items-center gap-2">
                            <Building2 size={14} className="text-[#185FA5]" />
                            <span className="text-xs font-bold text-[#185FA5]">Receita Federal</span>
                          </div>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                            ${cnpjInfo.situacao === 'ATIVA'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'}`}
                          >
                            {cnpjInfo.situacao}
                          </span>
                        </div>
                        <div className="p-3 space-y-1.5">
                          <p className="font-semibold text-gray-900 text-sm">
                            {cnpjInfo.razao_social}
                          </p>
                          {cnpjInfo.nome_fantasia && cnpjInfo.nome_fantasia !== cnpjInfo.razao_social && (
                            <p className="text-xs text-gray-500">
                              Nome fantasia: <span className="font-medium">{cnpjInfo.nome_fantasia}</span>
                            </p>
                          )}
                          <p className="text-xs text-gray-500 font-mono">{cnpjInfo.cnpj}</p>
                          {cnpjInfo.atividade && (
                            <p className="text-xs text-gray-600 flex items-start gap-1.5">
                              <Building2 size={10} className="flex-shrink-0 mt-0.5 text-gray-400" />
                              {cnpjInfo.atividade}
                            </p>
                          )}
                          {cnpjInfo.endereco && (
                            <p className="text-xs text-gray-600 flex items-start gap-1.5">
                              <MapPin size={10} className="flex-shrink-0 mt-0.5 text-gray-400" />
                              {cnpjInfo.endereco}
                            </p>
                          )}
                          <div className="flex flex-wrap gap-3 pt-0.5">
                            {cnpjInfo.telefone && (
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <Phone size={10} className="text-gray-400" /> {cnpjInfo.telefone}
                              </span>
                            )}
                            {cnpjInfo.email && (
                              <span className="text-xs text-gray-600 flex items-center gap-1">
                                <Mail size={10} className="text-gray-400" /> {cnpjInfo.email}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 pt-1 text-[10px] text-[#185FA5]">
                            <CheckCircle size={10} />
                            Formulário preenchido com razão social{cnpjInfo.email ? ' e e-mail' : ''} — edite se necessário
                          </div>
                        </div>
                      </div>
                    )}

                    {!cnpjInfo && !cnpjError && !buscandoCnpj && (
                      <p className="text-xs text-gray-400 text-center py-2">
                        Digite o CNPJ e clique em Buscar para preencher os dados automaticamente
                      </p>
                    )}
                  </div>
                )}

                {/* ── Aba: PDF ── */}
                {tab === 'pdf' && (
                  <div>
                    <input
                      ref={importPdfInputRef}
                      type="file"
                      accept=".pdf,application/pdf"
                      className="hidden"
                      onChange={handleImportChange}
                    />
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !importingPdf && importPdfInputRef.current?.click()}
                      className={`relative flex flex-col items-center justify-center gap-3 min-h-[140px] rounded-xl border-2 border-dashed transition-all duration-200 select-none
                        ${importingPdf
                          ? 'border-[#185FA5]/50 bg-blue-50 cursor-wait'
                          : dragOver
                            ? 'border-[#185FA5] bg-[#e8f0f9] scale-[1.01] cursor-copy'
                            : pdfNome
                              ? 'border-[#185FA5] bg-[#e8f0f9] cursor-pointer'
                              : 'border-gray-200 bg-gray-50 cursor-pointer hover:border-[#185FA5]/50 hover:bg-blue-50/40'}`}
                    >
                      {importingPdf ? (
                        <>
                          <Loader2 size={28} className="animate-spin text-[#185FA5]" />
                          <p className="text-sm text-[#185FA5] font-semibold">Analisando empresa com IA...</p>
                        </>
                      ) : dragOver ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-[#185FA5] flex items-center justify-center">
                            <Upload size={18} className="text-white" />
                          </div>
                          <p className="text-sm text-[#185FA5] font-semibold">Solte o PDF aqui</p>
                        </>
                      ) : pdfNome ? (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-[#185FA5] flex items-center justify-center">
                            <FileText size={18} className="text-white" />
                          </div>
                          <p className="text-xs text-[#185FA5] font-semibold text-center px-4 break-all">{pdfNome}</p>
                          <p className="text-[10px] text-gray-400">Clique para trocar o arquivo</p>
                        </>
                      ) : (
                        <>
                          <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
                            <Upload size={18} className="text-gray-400" />
                          </div>
                          <div className="text-center px-4">
                            <p className="text-sm font-semibold text-gray-700">Importar empresa via PDF</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Arraste um contrato, proposta ou apresentação da empresa
                            </p>
                          </div>
                          <span className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white border border-gray-100 text-xs font-medium text-gray-400">
                            <Sparkles size={11} className="text-[#185FA5]" /> Powered by IA
                          </span>
                        </>
                      )}
                    </div>

                    {importError && (
                      <div className="flex items-start gap-2 mt-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                        <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
                        {importError}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Aba: Manual ── */}
                {tab === 'manual' && (
                  <p className="text-xs text-gray-400 text-center py-1">
                    Preencha os campos abaixo manualmente
                  </p>
                )}

                {/* ── Separador ── */}
                <div className="border-t border-gray-100" />

                {/* ── Aviso IA ── */}
                {aiPreencheu && (
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[#e8f0f9] border border-[#185FA5]/20 text-xs text-[#185FA5]">
                    <Sparkles size={13} className="flex-shrink-0 mt-0.5" />
                    <span>Dados preenchidos automaticamente — revise e corrija antes de salvar.</span>
                  </div>
                )}

                {/* ── Formulário ── */}
                <form id="crm-form" onSubmit={handleCreate} className="space-y-4">

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

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do contato</label>
                      <input
                        className="input"
                        placeholder="Ex: João Silva"
                        value={form.contato_nome}
                        onChange={e => setForm(f => ({ ...f, contato_nome: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail do contato</label>
                      <input
                        className="input"
                        type="email"
                        placeholder="contato@empresa.com"
                        value={form.contato_email}
                        onChange={e => setForm(f => ({ ...f, contato_email: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Vagas ativas</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.vagas_ativas}
                        onChange={e => setForm(f => ({ ...f, vagas_ativas: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Receita (R$)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="100"
                        placeholder="0"
                        value={form.receita}
                        onChange={e => setForm(f => ({ ...f, receita: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                    <select
                      className="input"
                      value={form.status}
                      onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    >
                      <option value="PROSPECT">Prospect</option>
                      <option value="ATIVO">Ativo</option>
                      <option value="CONTRATO">Contrato assinado</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>

                  {saveError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
                      {saveError}
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      {saving
                        ? <><Loader2 size={15} className="animate-spin" /> Salvando...</>
                        : 'Cadastrar cliente'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
