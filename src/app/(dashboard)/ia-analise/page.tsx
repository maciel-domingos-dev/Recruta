'use client'

import { useState, useEffect } from 'react'
import {
  Brain,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Users,
  FileText,
  MessageSquare,
  Award,
  RotateCcw,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  PenLine,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type CandidatoDB = {
  id: string
  nome: string
  cargo: string | null
  curriculo: string | null
}

type AnaliseResult = {
  nome: string
  score: number
  recomendacao: string
  pontos_fortes: string[]
  pontos_atencao: string[]
  resumo: string
}

type RelatorioResult = {
  score: number
  recomendacao: string
  analise_comportamental: string
  pontos_fortes: string[]
  pontos_atencao: string[]
  resumo: string
}

const STEPS = ['Análise de Currículos', 'Transcrição da Entrevista', 'Relatório Final']

function scoreColor(s: number) {
  if (s >= 80) return '#059669'
  if (s >= 60) return '#185FA5'
  return '#d97706'
}

function recBadge(r: string) {
  if (r === 'APROVADO')  return { cls: 'bg-green-100 text-green-700',  label: 'Aprovado' }
  if (r === 'REPROVADO') return { cls: 'bg-red-100 text-red-700',      label: 'Reprovado' }
  return                        { cls: 'bg-amber-100 text-amber-700',  label: 'Em análise' }
}

/* ─── Card de candidato com preview do currículo e edição manual ─── */
function CandidatoCard({
  c,
  selected,
  onToggle,
  curriculoOverride,
  onOverrideChange,
}: {
  c: CandidatoDB
  selected: boolean
  onToggle: () => void
  curriculoOverride: string
  onOverrideChange: (v: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  // Texto a exibir: override manual tem prioridade sobre DB
  const textoFinal = curriculoOverride || c.curriculo || ''
  const temCurriculo = Boolean(textoFinal)

  return (
    <div
      className={`rounded-xl border transition-colors ${
        selected ? 'border-[#185FA5] bg-[#e8f0f9]' : 'border-gray-100 bg-white hover:bg-gray-50'
      }`}
    >
      {/* Linha principal: checkbox + nome + badges */}
      <label className="flex items-center gap-3 p-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          className="w-4 h-4 accent-[#185FA5] flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{c.nome}</p>
          <p className="text-xs text-gray-400 truncate">{c.cargo ?? 'Cargo não informado'}</p>
        </div>

        {/* Badge de currículo */}
        {temCurriculo ? (
          <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full flex-shrink-0 border border-green-100">
            Com currículo
          </span>
        ) : (
          <span className="text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full flex-shrink-0 border border-amber-100">
            Sem currículo
          </span>
        )}

        {/* Botão expandir */}
        <button
          type="button"
          onClick={e => { e.preventDefault(); setExpanded(v => !v) }}
          className="flex-shrink-0 p-1 rounded-md hover:bg-gray-200 transition-colors"
          title={expanded ? 'Recolher' : 'Ver currículo'}
        >
          {expanded
            ? <ChevronUp size={14} className="text-gray-500" />
            : <ChevronDown size={14} className="text-gray-500" />
          }
        </button>
      </label>

      {/* Área expandida: preview do currículo ou textarea manual */}
      {expanded && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100 mt-0">
          {c.curriculo ? (
            /* Candidato já tem currículo extraído pela IA — mostra preview */
            <div className="mt-2 space-y-2">
              <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                <FileText size={11} /> Currículo extraído pela IA
              </p>
              <p className="text-xs text-gray-600 leading-relaxed line-clamp-6 whitespace-pre-wrap">
                {c.curriculo}
              </p>
              {/* Permite sobrescrever manualmente se necessário */}
              <details className="mt-2">
                <summary className="text-xs text-[#185FA5] cursor-pointer flex items-center gap-1 select-none">
                  <PenLine size={10} /> Substituir manualmente
                </summary>
                <textarea
                  className="mt-1.5 w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#185FA5] min-h-[80px]"
                  placeholder="Cole aqui um texto alternativo para esta análise..."
                  value={curriculoOverride}
                  onChange={e => onOverrideChange(e.target.value)}
                />
              </details>
            </div>
          ) : (
            /* Sem currículo — campo manual obrigatório para uma boa análise */
            <div className="mt-2 space-y-1.5">
              <p className="text-xs font-medium text-amber-600 flex items-center gap-1">
                <PenLine size={11} /> Cole o currículo ou descreva o perfil deste candidato
              </p>
              <textarea
                className="w-full text-xs border border-amber-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-[#185FA5] min-h-[100px] bg-white"
                placeholder={`Ex: Desenvolvedor com 5 anos de experiência em React e Node.js.\nFormação: Ciência da Computação – USP 2018.\nÚltima empresa: Startup X (2021–2024), atuou como Tech Lead...`}
                value={curriculoOverride}
                onChange={e => onOverrideChange(e.target.value)}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

/* ─── Página principal ─── */
export default function IAAnalisePage() {
  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1
  const [candidatosDB, setCandidatosDB]     = useState<CandidatoDB[]>([])
  const [selectedIds, setSelectedIds]       = useState<Set<string>>(new Set())
  // Override manual do currículo por candidato (ID → texto)
  const [curriculoOverrides, setCurriculoOverrides] = useState<Record<string, string>>({})
  const [vagaForm, setVagaForm]             = useState({ titulo: '', requisitos: '', diferenciais: '' })
  const [analyzing, setAnalyzing]           = useState(false)
  const [analises, setAnalises]             = useState<AnaliseResult[]>([])
  const [step1Error, setStep1Error]         = useState('')

  // Step 2
  const [candidatoNome, setCandidatoNome]   = useState('')
  const [transcricao, setTranscricao]       = useState('')
  const [generating, setGenerating]         = useState(false)
  const [step2Error, setStep2Error]         = useState('')

  // Step 3
  const [relatorio, setRelatorio] = useState<RelatorioResult | null>(null)

  useEffect(() => {
    supabase
      .from('candidatos')
      .select('id, nome, cargo, curriculo')
      .order('nome')
      .then(({ data }) => setCandidatosDB(data ?? []))
  }, [])

  function toggleCandidate(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function setOverride(id: string, value: string) {
    setCurriculoOverrides(prev => ({ ...prev, [id]: value }))
  }

  async function handleAnalyze() {
    if (selectedIds.size === 0 || !vagaForm.titulo) return
    setAnalyzing(true)
    setStep1Error('')

    // Bug corrigido: mescla currículo do DB com overrides manuais antes de enviar
    const selecionados = candidatosDB
      .filter(c => selectedIds.has(c.id))
      .map(c => ({
        id:        c.id,
        nome:      c.nome,
        cargo:     c.cargo,
        // Override tem prioridade; se não houver override usa o valor do DB
        curriculo: curriculoOverrides[c.id]?.trim() || c.curriculo || null,
      }))

    try {
      const res = await fetch('/api/ia-analise/curriculos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vaga: vagaForm, candidatos: selecionados }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setAnalises(data.analises ?? [])
    } catch (err: unknown) {
      setStep1Error(err instanceof Error ? err.message : 'Erro ao analisar currículos')
    }
    setAnalyzing(false)
  }

  async function handleGenerateReport() {
    if (!transcricao.trim() || !candidatoNome) return
    setGenerating(true)
    setStep2Error('')
    try {
      const candidato = candidatosDB.find(c => c.nome === candidatoNome)
      const res = await fetch('/api/ia-analise/entrevista', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidato: { nome: candidatoNome, cargo: candidato?.cargo ?? null },
          vaga: vagaForm.titulo,
          transcricao,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro desconhecido')
      setRelatorio(data)
      setStep(3)
    } catch (err: unknown) {
      setStep2Error(err instanceof Error ? err.message : 'Erro ao gerar relatório')
    }
    setGenerating(false)
  }

  function handleReset() {
    setStep(1)
    setAnalises([])
    setRelatorio(null)
    setTranscricao('')
    setStep1Error('')
    setStep2Error('')
    setCurriculoOverrides({})
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">IA & Análise</h1>
        <p className="text-gray-500 text-sm mt-1">
          Análise inteligente de currículos e entrevistas com Claude AI
        </p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => {
          const n = (i + 1) as 1 | 2 | 3
          const active = step === n
          const done   = step > n
          return (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? 'bg-[#185FA5] text-white'
                  : done  ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-400'
                }`}
              >
                {done ? <CheckCircle size={14} /> : <span className="w-4 text-center">{n}</span>}
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              )}
            </div>
          )
        })}
      </div>

      {/* ── STEP 1: Análise de Currículos ── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Vaga form */}
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <FileText size={18} style={{ color: '#185FA5' }} />
              <h2 className="font-semibold text-gray-900">Dados da Vaga</h2>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Título da vaga <span className="text-red-500">*</span>
              </label>
              <input
                className="input"
                placeholder="Ex: Desenvolvedor Full Stack Sênior"
                value={vagaForm.titulo}
                onChange={e => setVagaForm(f => ({ ...f, titulo: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Requisitos</label>
              <textarea
                className="input min-h-[80px] resize-none"
                placeholder="Liste os requisitos técnicos e comportamentais da vaga..."
                value={vagaForm.requisitos}
                onChange={e => setVagaForm(f => ({ ...f, requisitos: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Diferenciais</label>
              <input
                className="input"
                placeholder="Ex: Inglês avançado, certificação AWS, MBA..."
                value={vagaForm.diferenciais}
                onChange={e => setVagaForm(f => ({ ...f, diferenciais: e.target.value }))}
              />
            </div>
          </div>

          {/* Candidate selection */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} style={{ color: '#185FA5' }} />
              <h2 className="font-semibold text-gray-900">Selecionar Candidatos</h2>
              <p className="text-xs text-gray-400 ml-1">
                — clique em ∨ para ver e editar o currículo
              </p>
              {selectedIds.size > 0 && (
                <span
                  className="ml-auto text-xs font-semibold px-2.5 py-0.5 rounded-full text-white"
                  style={{ background: '#185FA5' }}
                >
                  {selectedIds.size} selecionado{selectedIds.size !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {candidatosDB.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-gray-400">Nenhum candidato cadastrado.</p>
                <a
                  href="/candidatos"
                  className="text-sm font-medium mt-1 inline-block"
                  style={{ color: '#185FA5' }}
                >
                  Cadastrar candidatos →
                </a>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {candidatosDB.map(c => (
                  <CandidatoCard
                    key={c.id}
                    c={c}
                    selected={selectedIds.has(c.id)}
                    onToggle={() => toggleCandidate(c.id)}
                    curriculoOverride={curriculoOverrides[c.id] ?? ''}
                    onOverrideChange={v => setOverride(c.id, v)}
                  />
                ))}
              </div>
            )}
          </div>

          {step1Error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {step1Error}
            </div>
          )}

          <button
            onClick={handleAnalyze}
            disabled={analyzing || selectedIds.size === 0 || !vagaForm.titulo}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
          >
            {analyzing ? (
              <><Loader2 size={16} className="animate-spin" /> Analisando com IA...</>
            ) : (
              <><Brain size={16} /> Analisar com IA ({selectedIds.size} candidato{selectedIds.size !== 1 ? 's' : ''})</>
            )}
          </button>

          {/* Results */}
          {analises.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-gray-900">
                Resultados da Análise — {analises.length} candidato{analises.length !== 1 ? 's' : ''}
              </h2>

              {[...analises].sort((a, b) => b.score - a.score).map((a) => {
                const rc = recBadge(a.recomendacao)
                const color = scoreColor(a.score)
                return (
                  <div key={a.nome} className="card hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-4">
                      <div
                        className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0 border-4"
                        style={{ borderColor: color, background: `${color}18` }}
                      >
                        <span className="text-xl font-bold" style={{ color }}>{a.score}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{a.nome}</h3>
                          <span className={`badge ${rc.cls}`}>{rc.label}</span>
                        </div>
                        <p className="text-sm text-gray-600 leading-relaxed mb-3">{a.resumo}</p>
                        <div className="flex flex-wrap gap-4">
                          <div>
                            <p className="text-xs font-medium text-green-700 flex items-center gap-1 mb-1.5">
                              <CheckCircle size={11} /> Pontos fortes
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {a.pontos_fortes.map(p => (
                                <span key={p} className="badge bg-green-100 text-green-700">{p}</span>
                              ))}
                            </div>
                          </div>
                          {a.pontos_atencao.length > 0 && (
                            <div>
                              <p className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1.5">
                                <AlertTriangle size={11} /> Atenção
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {a.pontos_atencao.map(p => (
                                  <span key={p} className="badge bg-amber-100 text-amber-700">{p}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}

              <button
                onClick={() => {
                  const best = [...analises].sort((a, b) => b.score - a.score)[0]
                  if (best) setCandidatoNome(best.nome)
                  setStep(2)
                }}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Prosseguir para Entrevista <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEP 2: Transcrição da Entrevista ── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="card space-y-4">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} style={{ color: '#185FA5' }} />
              <h2 className="font-semibold text-gray-900">Transcrição da Entrevista</h2>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Candidato <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={candidatoNome}
                onChange={e => setCandidatoNome(e.target.value)}
              >
                <option value="">Selecione o candidato</option>
                {(analises.length > 0 ? analises : candidatosDB).map(c => (
                  <option key={c.nome} value={c.nome}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Transcrição da entrevista{' '}
                <span className="text-xs font-normal text-gray-400">
                  — cole o texto completo ou descreva o que foi observado
                </span>
              </label>
              <textarea
                className="input min-h-[240px] resize-none font-mono text-xs leading-relaxed"
                placeholder={`Entrevistador: Pode me contar sobre sua experiência com React?\nCandidato: Claro! Trabalho com React há 4 anos, já desenvolvi...`}
                value={transcricao}
                onChange={e => setTranscricao(e.target.value)}
              />
            </div>

            {step2Error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {step2Error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="btn-secondary flex items-center gap-2"
              >
                <ChevronLeft size={15} /> Voltar
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={generating || !transcricao.trim() || !candidatoNome}
                className="btn-primary flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {generating ? (
                  <><Loader2 size={16} className="animate-spin" /> Gerando relatório...</>
                ) : (
                  <><Brain size={16} /> Gerar Relatório com IA</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 3: Relatório Final ── */}
      {step === 3 && relatorio && (
        <div className="space-y-5">
          <div className="card">
            {/* Report header */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6 pb-6 border-b border-gray-100">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#e8f0f9' }}
              >
                <Award size={22} style={{ color: '#185FA5' }} />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-gray-900">{candidatoNome}</h2>
                <p className="text-sm text-gray-400">{vagaForm.titulo || 'Análise de entrevista'}</p>
              </div>
              <div className="flex items-center gap-3">
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center border-4"
                  style={{
                    borderColor: scoreColor(relatorio.score),
                    background: `${scoreColor(relatorio.score)}18`,
                  }}
                >
                  <span
                    className="text-2xl font-bold"
                    style={{ color: scoreColor(relatorio.score) }}
                  >
                    {relatorio.score}
                  </span>
                </div>
                <span className={`badge text-sm px-3 py-1 ${recBadge(relatorio.recomendacao).cls}`}>
                  {recBadge(relatorio.recomendacao).label}
                </span>
              </div>
            </div>

            {/* Resumo executivo */}
            <div className="p-4 rounded-xl mb-5 border-l-4 border-[#185FA5]" style={{ background: '#e8f0f9' }}>
              <p className="text-xs font-semibold text-[#185FA5] mb-1">Resumo Executivo</p>
              <p className="text-sm text-gray-700 leading-relaxed">{relatorio.resumo}</p>
            </div>

            {/* Análise comportamental */}
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Análise Comportamental</h3>
              <p className="text-sm text-gray-600 leading-relaxed">{relatorio.analise_comportamental}</p>
            </div>

            {/* Pontos fortes e atenção */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs font-semibold text-green-700 flex items-center gap-1 mb-3">
                  <CheckCircle size={12} /> PONTOS FORTES
                </p>
                <ul className="space-y-2">
                  {relatorio.pontos_fortes.map(p => (
                    <li key={p} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs font-semibold text-amber-700 flex items-center gap-1 mb-3">
                  <AlertTriangle size={12} /> PONTOS DE ATENÇÃO
                </p>
                <ul className="space-y-2">
                  {relatorio.pontos_atencao.map(p => (
                    <li key={p} className="text-sm text-gray-700 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={handleReset} className="btn-secondary flex items-center gap-2">
                <RotateCcw size={15} /> Nova análise
              </button>
              <button onClick={() => setStep(2)} className="btn-secondary flex items-center gap-2">
                <ChevronLeft size={15} /> Voltar à entrevista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
