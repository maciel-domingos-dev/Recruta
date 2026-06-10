'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Briefcase,
  Clock,
  Search,
  Upload,
  X,
  CheckCircle2,
  Loader2,
  Building2,
  ChevronRight,
  FileText,
  Phone,
  Mail,
  User,
  Sparkles,
  ArrowRight,
  AlertCircle,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* ─── Tipos ─── */
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

type FormData = {
  nome: string
  email: string
  telefone: string
  cargo: string
}

type Stage = 'list' | 'form' | 'success' | 'error'

const EMPTY_FORM: FormData = { nome: '', email: '', telefone: '', cargo: '' }

/* ─── Utilitários ─── */
function diasDesde(dateStr: string) {
  const d = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000)
  if (d === 0) return 'Publicada hoje'
  if (d === 1) return 'Publicada ontem'
  return `Publicada há ${d} dias`
}

function parseTags(text: string | null): string[] {
  if (!text) return []
  return text
    .split(/[,;\n]/)
    .map(s => s.trim())
    .filter(Boolean)
    .slice(0, 5)
}

/* ─── Subcomponentes ─── */
function JobCard({
  vaga,
  onApply,
}: {
  vaga: Vaga
  onApply: (v: Vaga) => void
}) {
  const tags = parseTags(vaga.requisitos)

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-[#185FA5]/30 transition-all duration-200 overflow-hidden group">
      {/* Barra colorida no topo */}
      <div className="h-1 bg-gradient-to-r from-[#185FA5] to-[#2d7dd2]" />

      <div className="p-6">
        {/* Empresa */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-[#e8f0f9] flex items-center justify-center flex-shrink-0">
            <Building2 size={15} className="text-[#185FA5]" />
          </div>
          <span className="text-sm text-gray-500 font-medium">{vaga.empresa}</span>
        </div>

        {/* Título */}
        <h3 className="font-bold text-gray-900 text-lg mb-2 leading-tight group-hover:text-[#185FA5] transition-colors">
          {vaga.titulo}
        </h3>

        {/* Descrição */}
        {vaga.descricao && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2 leading-relaxed">
            {vaga.descricao}
          </p>
        )}

        {/* Tags de requisitos */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-5">
            {tags.map((tag, i) => (
              <span
                key={i}
                className="px-2.5 py-0.5 bg-[#e8f0f9] text-[#185FA5] text-xs font-medium rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-50">
          <span className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={12} />
            {diasDesde(vaga.created_at)}
          </span>
          <button
            onClick={() => onApply(vaga)}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#185FA5] hover:bg-[#104880] text-white text-sm font-semibold rounded-xl transition-colors duration-200 group/btn"
          >
            Candidatar-se
            <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── Upload Zone ─── */
function UploadZone({
  file,
  onChange,
  error,
}: {
  file: File | null
  onChange: (f: File | null) => void
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  function handleFile(f: File) {
    if (f.type !== 'application/pdf') {
      alert('Por favor envie apenas arquivos PDF.')
      return
    }
    if (f.size > 5 * 1024 * 1024) {
      alert('O arquivo deve ter no máximo 5 MB.')
      return
    }
    onChange(f)
  }

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={e => {
        e.preventDefault()
        setDragging(false)
        const f = e.dataTransfer.files[0]
        if (f) handleFile(f)
      }}
      className={`
        relative cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all duration-200
        ${file
          ? 'border-[#185FA5] bg-[#e8f0f9]'
          : dragging
          ? 'border-[#185FA5] bg-blue-50 scale-[1.01]'
          : error
          ? 'border-red-300 bg-red-50'
          : 'border-gray-200 bg-gray-50 hover:border-[#185FA5]/60 hover:bg-blue-50/40'
        }
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0]
          if (f) handleFile(f)
        }}
      />

      {file ? (
        <div className="flex flex-col items-center gap-2">
          <div className="w-12 h-12 rounded-xl bg-[#185FA5] flex items-center justify-center">
            <FileText size={22} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#185FA5] truncate max-w-[240px]">
              {file.name}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {(file.size / 1024).toFixed(0)} KB · clique para trocar
            </p>
          </div>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onChange(null) }}
            className="mt-1 text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
          >
            <X size={12} /> Remover
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${error ? 'bg-red-100' : 'bg-gray-100'}`}>
            <Upload size={22} className={error ? 'text-red-400' : 'text-gray-400'} />
          </div>
          <div>
            <p className={`text-sm font-medium ${error ? 'text-red-600' : 'text-gray-700'}`}>
              Arraste o currículo em PDF aqui
            </p>
            <p className="text-xs text-gray-400 mt-0.5">ou clique para selecionar · máx. 5 MB</p>
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Modal de Candidatura ─── */
function ApplicationModal({
  vaga,
  onClose,
  onSuccess,
}: {
  vaga: Vaga
  onClose: () => void
  onSuccess: () => void
}) {
  const [form, setForm]           = useState<FormData>(EMPTY_FORM)
  const [pdfFile, setPdfFile]     = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData | 'curriculo', string>>>({})

  function validate() {
    const errors: typeof fieldErrors = {}
    if (!form.nome.trim())  errors.nome  = 'Informe seu nome completo.'
    if (!form.email.trim()) errors.email = 'Informe um e-mail válido.'
    if (!pdfFile)           errors.curriculo = 'Anexe seu currículo em PDF.'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('nome',     form.nome)
      fd.append('email',    form.email)
      fd.append('telefone', form.telefone)
      fd.append('cargo',    form.cargo || vaga.titulo)
      fd.append('vaga_id',  vaga.id)
      if (pdfFile) fd.append('curriculo', pdfFile)

      const res = await fetch('/api/candidatura', { method: 'POST', body: fd })
      const json = await res.json()

      if (!res.ok) throw new Error(json.error || 'Erro ao enviar candidatura.')
      onSuccess()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro inesperado.')
    } finally {
      setSubmitting(false)
    }
  }

  // Fechar com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
          {/* Header */}
          <div
            className="flex items-start justify-between p-6 border-b border-gray-100"
            style={{ background: 'linear-gradient(135deg, #185FA5 0%, #2d7dd2 100%)' }}
          >
            <div>
              <p className="text-blue-200 text-xs font-medium uppercase tracking-wider mb-1">
                Candidatura
              </p>
              <h2 className="text-white font-bold text-lg leading-tight">
                {vaga.titulo}
              </h2>
              <p className="text-blue-200 text-sm mt-0.5 flex items-center gap-1.5">
                <Building2 size={12} />
                {vaga.empresa}
              </p>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors ml-4"
            >
              <X size={16} className="text-white" />
            </button>
          </div>

          {/* IA Notice */}
          <div className="mx-6 mt-4 flex items-start gap-2.5 p-3 bg-[#e8f0f9] rounded-xl">
            <Sparkles size={15} className="text-[#185FA5] flex-shrink-0 mt-0.5" />
            <p className="text-xs text-[#185FA5] leading-relaxed">
              Seu currículo será analisado automaticamente por IA para extrair suas
              habilidades e experiências.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <User size={13} className="text-gray-400" />
                  Nome completo <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="text"
                placeholder="Ex: Ana Paula Souza"
                value={form.nome}
                onChange={e => { setForm(f => ({ ...f, nome: e.target.value })); setFieldErrors(fe => ({ ...fe, nome: '' })) }}
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-all ${fieldErrors.nome ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {fieldErrors.nome && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={11} /> {fieldErrors.nome}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Mail size={13} className="text-gray-400" />
                  E-mail <span className="text-red-500">*</span>
                </span>
              </label>
              <input
                type="email"
                placeholder="seunome@email.com"
                value={form.email}
                onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setFieldErrors(fe => ({ ...fe, email: '' })) }}
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-all ${fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
              />
              {fieldErrors.email && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={11} /> {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Telefone + Cargo (lado a lado) */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Phone size={13} className="text-gray-400" />
                    Telefone
                  </span>
                </label>
                <input
                  type="tel"
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Briefcase size={13} className="text-gray-400" />
                    Cargo desejado
                  </span>
                </label>
                <input
                  type="text"
                  placeholder={vaga.titulo}
                  value={form.cargo}
                  onChange={e => setForm(f => ({ ...f, cargo: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                <span className="flex items-center gap-1.5">
                  <FileText size={13} className="text-gray-400" />
                  Currículo em PDF <span className="text-red-500">*</span>
                </span>
              </label>
              <UploadZone
                file={pdfFile}
                onChange={f => { setPdfFile(f); setFieldErrors(fe => ({ ...fe, curriculo: '' })) }}
                error={fieldErrors.curriculo}
              />
              {fieldErrors.curriculo && (
                <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                  <AlertCircle size={11} /> {fieldErrors.curriculo}
                </p>
              )}
            </div>

            {/* Botões */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-[#185FA5] hover:bg-[#104880] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
              >
                {submitting ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar candidatura
                    <ArrowRight size={15} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

/* ─── Página principal ─── */
export default function PortalCandidatosPage() {
  const [vagas, setVagas]         = useState<Vaga[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [vagaSelecionada, setVagaSelecionada] = useState<Vaga | null>(null)
  const [stage, setStage]         = useState<Stage>('list')

  const fetchVagas = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase
      .from('vagas')
      .select('id,titulo,empresa,descricao,requisitos,diferenciais,status,created_at')
      .eq('status', 'ABERTA')
      .order('created_at', { ascending: false })

    if (search.trim()) {
      query = query.ilike('titulo', `%${search.trim()}%`)
    }

    const { data, error: err } = await query
    if (err) setError(err.message)
    else setVagas(data ?? [])
    setLoading(false)
  }, [search])

  useEffect(() => { fetchVagas() }, [fetchVagas])

  function handleApply(vaga: Vaga) {
    setVagaSelecionada(vaga)
    setStage('form')
  }

  function handleSuccess() {
    setStage('success')
  }

  function handleReset() {
    setVagaSelecionada(null)
    setStage('list')
  }

  return (
    <div className="min-h-screen" style={{ background: '#f4f6fb' }}>

      {/* ─── Header ─── */}
      <header style={{ background: 'linear-gradient(135deg, #104880 0%, #185FA5 50%, #2d7dd2 100%)' }}>
        <div className="max-w-5xl mx-auto px-6 py-8 md:py-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-black text-lg">R</span>
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Recruta</span>
          </div>

          {/* Hero text */}
          <div className="max-w-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-3">
              Encontre seu próximo<br />
              <span className="text-blue-200">desafio profissional</span>
            </h1>
            <p className="text-blue-200/90 text-base mb-8">
              Veja as vagas abertas e candidate-se em menos de 2 minutos.
              Nossa IA analisa seu currículo automaticamente.
            </p>

            {/* Busca */}
            <div className="relative max-w-xl">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar vagas por título..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white shadow-lg text-gray-800 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Wave */}
        <div className="overflow-hidden">
          <svg viewBox="0 0 1440 48" className="w-full" style={{ display: 'block', fill: '#f4f6fb' }}>
            <path d="M0,48 C360,0 1080,0 1440,48 L1440,48 L0,48 Z" />
          </svg>
        </div>
      </header>

      {/* ─── Conteúdo ─── */}
      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Sucesso */}
        {stage === 'success' && (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-lg p-8 text-center border border-green-100">
            <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Candidatura enviada! 🎉
            </h2>
            <p className="text-gray-500 text-sm leading-relaxed mb-6">
              Recebemos seu currículo e nossa IA já está analisando seu perfil.
              Em breve nossa equipe entrará em contato pelo e-mail informado.
            </p>
            <button
              onClick={handleReset}
              className="w-full py-3 rounded-xl bg-[#185FA5] hover:bg-[#104880] text-white font-semibold text-sm transition-colors"
            >
              Ver outras vagas
            </button>
          </div>
        )}

        {/* Lista de vagas */}
        {stage !== 'success' && (
          <>
            {/* Stats bar */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {loading
                    ? 'Carregando vagas...'
                    : `${vagas.length} vaga${vagas.length !== 1 ? 's' : ''} aberta${vagas.length !== 1 ? 's' : ''}`
                  }
                </h2>
                {!loading && vagas.length > 0 && (
                  <p className="text-sm text-gray-400 mt-0.5">Atualizadas em tempo real</p>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 rounded-full">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-medium text-green-700">Online</span>
              </div>
            </div>

            {/* Erro de conexão */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-sm text-red-700 flex items-start gap-2">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                Não foi possível carregar as vagas. Verifique sua conexão e tente novamente.
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex flex-col items-center justify-center py-24 gap-3">
                <Loader2 size={32} className="animate-spin text-[#185FA5]" />
                <p className="text-gray-400 text-sm">Buscando vagas abertas...</p>
              </div>
            )}

            {/* Empty state */}
            {!loading && vagas.length === 0 && !error && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm py-20 text-center">
                <div className="w-16 h-16 rounded-2xl bg-[#e8f0f9] flex items-center justify-center mx-auto mb-4">
                  <Briefcase size={28} className="text-[#185FA5]" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">
                  {search ? 'Nenhuma vaga encontrada' : 'Não há vagas abertas no momento'}
                </h3>
                <p className="text-gray-400 text-sm max-w-xs mx-auto">
                  {search
                    ? 'Tente buscar por outro termo ou limpe o filtro.'
                    : 'Volte em breve — novas oportunidades são adicionadas frequentemente.'
                  }
                </p>
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="mt-5 px-5 py-2.5 rounded-xl bg-[#185FA5] hover:bg-[#104880] text-white text-sm font-semibold transition-colors"
                  >
                    Limpar busca
                  </button>
                )}
              </div>
            )}

            {/* Grid de vagas */}
            {!loading && vagas.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                {vagas.map(vaga => (
                  <JobCard key={vaga.id} vaga={vaga} onApply={handleApply} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* ─── Footer ─── */}
      <footer className="mt-16 py-8 text-center border-t border-gray-200">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Recruta · Plataforma de Recrutamento Inteligente
        </p>
      </footer>

      {/* ─── Modal de candidatura ─── */}
      {stage === 'form' && vagaSelecionada && (
        <ApplicationModal
          vaga={vagaSelecionada}
          onClose={handleReset}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  )
}
