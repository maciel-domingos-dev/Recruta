'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Video,
  Plus,
  Copy,
  Check,
  X,
  Loader2,
  PhoneOff,
  Brain,
  Calendar,
  Clock,
  User,
  Briefcase,
  ExternalLink,
  Trash2,
  AlertCircle,
  Maximize2,
  Minimize2,
  Mic,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle,
  AlertTriangle,
  Award,
  Wand2,
  Sparkles,
  Star,
  Play,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

/* ─── Tipos de relatório ─── */
type RelatorioIA = {
  resumoExecutivo: string
  pontosFortes: string[]
  pontosAtencao: string[]
  analiseComportamental: string
  recomendacao: 'Contratar' | 'Não contratar' | 'Avaliar'
  score: number
}

type DiagnosticoFinal = {
  score_final: number
  recomendacao_final: 'Contratar' | 'Não contratar' | 'Avaliar'
  sintese: string
  sintese_curriculo: string
  sintese_entrevista: string
  pontos_decisivos: string[]
  proxima_etapa: string
  justificativa: string
}

function parseRelatorio(texto: string): RelatorioIA | null {
  try {
    const parsed = JSON.parse(texto)
    if (typeof parsed.resumoExecutivo === 'string') return parsed as RelatorioIA
    return null
  } catch {
    return null
  }
}

function parseDiagnostico(texto: string): DiagnosticoFinal | null {
  try {
    const parsed = JSON.parse(texto)
    if (typeof parsed.score_final === 'number') return parsed as DiagnosticoFinal
    return null
  } catch {
    return null
  }
}

/* ─── Configurações de recomendação ─── */
const recCfg: Record<string, { bg: string; text: string; border: string }> = {
  'Contratar':     { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
  'Não contratar': { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'   },
  'Avaliar':       { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200' },
}

/* ─── Círculo de score ─── */
function ScoreCircle({ score, size = 56 }: { score: number; size?: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 50 ? '#f59e0b' : '#dc2626'
  const r = size * 0.39, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ
  return (
    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} stroke="#e8f0f9" strokeWidth="5" fill="none" />
          <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="5" fill="none"
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-bold"
          style={{ color, fontSize: size * 0.22 }}>
          {score}
        </span>
      </div>
      <span className="text-[10px] text-gray-400 font-medium">score</span>
    </div>
  )
}

/* ─── Card: Relatório de entrevista ─── */
function CardRelatorio({ relatorio }: { relatorio: RelatorioIA }) {
  const rec = recCfg[relatorio.recomendacao] ?? recCfg['Avaliar']
  return (
    <div className="space-y-2.5 mt-2.5">
      <div className="flex gap-3 items-start">
        <div className="flex-1 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-[#185FA5] mb-1">Resumo Executivo</p>
          <p className="text-xs text-blue-900 leading-relaxed">{relatorio.resumoExecutivo}</p>
        </div>
        {relatorio.score > 0 && <ScoreCircle score={relatorio.score} />}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-green-50 border border-green-100">
          <p className="text-xs font-semibold text-green-700 mb-1.5 flex items-center gap-1">
            <CheckCircle size={11} /> Pontos Fortes
          </p>
          <ul className="space-y-0.5">
            {relatorio.pontosFortes.map((item, i) => (
              <li key={i} className="text-xs text-green-800 flex items-start gap-1">
                <span className="mt-0.5 flex-shrink-0 text-green-400">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="p-3 rounded-xl bg-red-50 border border-red-100">
          <p className="text-xs font-semibold text-red-700 mb-1.5 flex items-center gap-1">
            <AlertTriangle size={11} /> Pontos de Atenção
          </p>
          <ul className="space-y-0.5">
            {relatorio.pontosAtencao.map((item, i) => (
              <li key={i} className="text-xs text-red-800 flex items-start gap-1">
                <span className="mt-0.5 flex-shrink-0 text-red-400">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {relatorio.analiseComportamental && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-1">Análise Comportamental</p>
          <p className="text-xs text-gray-700 leading-relaxed">{relatorio.analiseComportamental}</p>
        </div>
      )}

      <div className={`p-3 rounded-xl border flex items-center gap-2 ${rec.bg} ${rec.border}`}>
        <Award size={14} className={rec.text} />
        <div>
          <p className={`text-xs font-semibold ${rec.text}`}>Recomendação da Entrevista</p>
          <p className={`text-xs font-bold ${rec.text}`}>{relatorio.recomendacao}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Card: Diagnóstico Final ─── */
function CardDiagnosticoFinal({ diag }: { diag: DiagnosticoFinal }) {
  const rec = recCfg[diag.recomendacao_final] ?? recCfg['Avaliar']
  return (
    <div className="space-y-2.5 mt-2.5">
      {/* Cabeçalho do diagnóstico final */}
      <div className="flex items-center gap-2 p-2.5 rounded-xl bg-gradient-to-r from-[#185FA5]/10 to-purple-50 border border-[#185FA5]/20">
        <Sparkles size={14} className="text-[#185FA5] flex-shrink-0" />
        <p className="text-xs font-bold text-[#185FA5]">Diagnóstico Final — Avaliação Completa</p>
      </div>

      <div className="flex gap-3 items-start">
        <div className="flex-1 p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-[#185FA5] mb-1">Síntese do Processo</p>
          <p className="text-xs text-blue-900 leading-relaxed">{diag.sintese}</p>
        </div>
        <ScoreCircle score={diag.score_final} />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
          <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
            <FileText size={11} /> Análise do Currículo
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">{diag.sintese_curriculo}</p>
        </div>
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
          <p className="text-xs font-semibold text-purple-700 mb-1 flex items-center gap-1">
            <Mic size={11} /> Desempenho na Entrevista
          </p>
          <p className="text-xs text-purple-800 leading-relaxed">{diag.sintese_entrevista}</p>
        </div>
      </div>

      {diag.pontos_decisivos?.length > 0 && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1">
            <Star size={11} /> Fatores Decisivos
          </p>
          <ul className="space-y-0.5">
            {diag.pontos_decisivos.map((item, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                <span className="mt-0.5 flex-shrink-0 text-[#185FA5]">•</span> {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      {diag.proxima_etapa && (
        <div className="p-3 rounded-xl bg-teal-50 border border-teal-100">
          <p className="text-xs font-semibold text-teal-700 mb-0.5">Próxima Etapa Recomendada</p>
          <p className="text-xs text-teal-800 font-medium">{diag.proxima_etapa}</p>
        </div>
      )}

      {diag.justificativa && (
        <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
          <p className="text-xs font-semibold text-gray-600 mb-1">Justificativa Completa</p>
          <p className="text-xs text-gray-700 leading-relaxed">{diag.justificativa}</p>
        </div>
      )}

      <div className={`p-3 rounded-xl border flex items-center gap-2 ${rec.bg} ${rec.border}`}>
        <Sparkles size={14} className={rec.text} />
        <div>
          <p className={`text-xs font-semibold ${rec.text}`}>Decisão Final</p>
          <p className={`text-xs font-bold ${rec.text}`}>{diag.recomendacao_final}</p>
        </div>
      </div>
    </div>
  )
}

/* ─── Entrevista type ─── */
type Entrevista = {
  id: string
  candidato_id: string
  vaga_id: string
  data: string
  status: string
  sala_url: string | null
  sala_nome: string | null
  transcricao: string | null
  video_url: string | null
  video_status: string | null
  assembly_job_id: string | null
  transcricao_texto: string | null
  diagnostico_final: string | null
  gravacao_url: string | null
  status_gravacao: string | null
  created_at: string
  candidatos: { id: string; nome: string; email: string } | null
  vagas: { id: string; titulo: string; empresa: string } | null
}

type CandidatoOpt = { id: string; nome: string }
type VagaOpt      = { id: string; titulo: string; empresa: string }

type VideoCall = {
  entrevistaId: string
  hostUrl: string
  guestUrl: string
  salaNome: string
}

type ModalForm = {
  candidato_id: string
  vaga_id: string
  data: string
  hora: string
}

const EMPTY_FORM: ModalForm = { candidato_id: '', vaga_id: '', data: '', hora: '' }

/* ─── Status ─── */
const statusCfg: Record<string, { label: string; cls: string; dot: string }> = {
  AGENDADA:     { label: 'Agendada',     cls: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500' },
  EM_ANDAMENTO: { label: 'Em andamento', cls: 'bg-green-100 text-green-700', dot: 'bg-green-500 animate-pulse' },
  ENCERRADA:    { label: 'Encerrada',    cls: 'bg-gray-100 text-gray-500',   dot: 'bg-gray-400' },
}

function fmtData(iso: string) {
  const d = new Date(iso)
  return {
    data: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    hora: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/* ─── Componente principal ─── */
export default function EntrevistasPage() {
  const router = useRouter()

  const [entrevistas, setEntrevistas]     = useState<Entrevista[]>([])
  const [candidatos, setCandidatos]       = useState<CandidatoOpt[]>([])
  const [vagas, setVagas]                 = useState<VagaOpt[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState('')

  // Modal agendamento
  const [modalOpen, setModalOpen]         = useState(false)
  const [saving, setSaving]               = useState(false)
  const [form, setForm]                   = useState<ModalForm>(EMPTY_FORM)
  const [formError, setFormError]         = useState('')

  // Videoconferência
  const [videoCall, setVideoCall]         = useState<VideoCall | null>(null)
  const [startingVideo, setStartingVideo] = useState<string | null>(null)
  const [endingVideo, setEndingVideo]     = useState<string | null>(null)
  const [encerrandoDireto, setEncerrandoDireto] = useState<string | null>(null)
  const [iframeExpanded, setIframeExpanded]     = useState(false)
  const iframeRef = useRef<HTMLDivElement>(null)

  // Gravação de áudio via MediaRecorder
  const mediaRecorderRef     = useRef<MediaRecorder | null>(null)
  const mediaRecorderMimeRef = useRef<string>('audio/webm')
  const chunksRef            = useRef<Blob[]>([])
  const [isRecording, setIsRecording]             = useState(false)
  const [uploadingGravacao, setUploadingGravacao] = useState<string | null>(null)

  // Copiar link
  const [copied, setCopied] = useState(false)

  // Transcrição manual
  const [transcricaoModalEnt, setTranscricaoModalEnt]     = useState<Entrevista | null>(null)
  const [textoManual, setTextoManual]                     = useState('')
  const [fetchingGravacao, setFetchingGravacao]           = useState<string | null>(null)
  const [processingTranscricao, setProcessingTranscricao] = useState(false)
  const [transcricaoAberta, setTranscricaoAberta]         = useState<string | null>(null)
  const [modalHasRecording, setModalHasRecording]         = useState(false)

  // Transcrição automática (AssemblyAI)
  const [transcrevendo, setTranscrevendo]  = useState<string | null>(null)
  const [analisandoIds, setAnalisandoIds]  = useState<Set<string>>(new Set())

  // Diagnóstico final
  const [gerandoDiagIds, setGerandoDiagIds]     = useState<Set<string>>(new Set())
  const [diagAberto, setDiagAberto]             = useState<string | null>(null)

  // Ref para polling sem recriar o intervalo
  const entrevistasRef = useRef<Entrevista[]>([])
  useEffect(() => { entrevistasRef.current = entrevistas }, [entrevistas])

  /* ── Polling: verifica transcrição AssemblyAI (TRANSCREVENDO) ── */
  // Daily.co cloud recording polling removido — gravação agora é via MediaRecorder no navegador.
  // Para reativar: adicionar loop de polling do video_status=PROCESSANDO aqui e em encerrar/route.ts.
  useEffect(() => {
    const interval = setInterval(async () => {
      const transcrev = entrevistasRef.current.filter(
        e => e.video_status === 'TRANSCREVENDO' && e.assembly_job_id,
      )

      for (const ent of transcrev) {
        try {
          const res  = await fetch('/api/entrevista-video/transcrever', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ entrevistaId: ent.id, jobId: ent.assembly_job_id }),
          })
          const json = await res.json()
          if (json.status === 'completed') {
            setEntrevistas(prev => prev.map(e =>
              e.id === ent.id
                ? { ...e, video_status: 'TRANSCRITO', transcricao_texto: json.transcricao_texto, assembly_job_id: null }
                : e,
            ))
          } else if (json.status === 'error') {
            setEntrevistas(prev => prev.map(e =>
              e.id === ent.id ? { ...e, video_status: 'ERRO' } : e,
            ))
          }
        } catch { /* best-effort */ }
      }
    }, 20000)

    return () => clearInterval(interval)
  }, [])

  /* ── Carregar dados ── */
  const fetchAll = useCallback(async () => {
    setLoading(true)
    setError('')
    const [{ data: ents, error: e1 }, { data: cands }, { data: vs }] = await Promise.all([
      supabase
        .from('entrevistas')
        .select('*, candidatos(id, nome, email), vagas(id, titulo, empresa)')
        .order('data', { ascending: false }),
      supabase.from('candidatos').select('id, nome').order('nome'),
      supabase.from('vagas').select('id, titulo, empresa').eq('status', 'ABERTA').order('titulo'),
    ])
    if (e1) setError(e1.message)
    else setEntrevistas((ents as Entrevista[]) ?? [])
    setCandidatos((cands as CandidatoOpt[]) ?? [])
    setVagas((vs as VagaOpt[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  /* ── Agendar ── */
  async function handleAgendar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.candidato_id || !form.vaga_id || !form.data || !form.hora) {
      setFormError('Preencha todos os campos.')
      return
    }
    setSaving(true)
    setFormError('')
    const dataHora = new Date(`${form.data}T${form.hora}:00`).toISOString()
    const { error: err } = await supabase.from('entrevistas').insert([
      { candidato_id: form.candidato_id, vaga_id: form.vaga_id, data: dataHora, status: 'AGENDADA' },
    ])
    setSaving(false)
    if (err) { setFormError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    fetchAll()
  }

  /* ── Iniciar vídeo ── */
  async function handleIniciarVideo(ent: Entrevista) {
    setStartingVideo(ent.id)
    try {
      const res  = await fetch('/api/entrevista-video/criar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId: ent.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar sala')
      setVideoCall({ entrevistaId: ent.id, hostUrl: json.host_url, guestUrl: json.guest_url, salaNome: json.sala_nome })
      setEntrevistas(prev =>
        prev.map(e => e.id === ent.id
          ? { ...e, status: 'EM_ANDAMENTO', sala_url: json.sala_url, sala_nome: json.sala_nome }
          : e),
      )
      setTimeout(() => iframeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
      void startGravacao()
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao iniciar videoconferência')
    } finally {
      setStartingVideo(null)
    }
  }

  /* ── Encerrar vídeo (do iframe ativo) ── */
  async function handleEncerrar() {
    if (!videoCall) return
    const { entrevistaId, salaNome } = videoCall
    setEndingVideo(entrevistaId)
    try {
      // 1. Para gravação e faz upload (pode levar alguns segundos)
      const gravacaoUrl = await stopGravacaoEUpload(entrevistaId)

      // 2. Encerra no servidor
      const res = await fetch('/api/entrevista-video/encerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId, salaNome, gravacaoUrl }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? 'Erro ao encerrar entrevista')
      }
      setEntrevistas(prev =>
        prev.map(e => e.id === entrevistaId
          ? { ...e, status: 'ENCERRADA', gravacao_url: gravacaoUrl, status_gravacao: gravacaoUrl ? 'disponivel' : null }
          : e),
      )
      setVideoCall(null)
      setIframeExpanded(false)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao encerrar')
    } finally {
      setEndingVideo(null)
    }
  }

  /* ── Retomar videoconferência ── */
  function handleRetomar(ent: Entrevista) {
    if (!ent.sala_url || !ent.sala_nome) return
    setVideoCall({ entrevistaId: ent.id, hostUrl: ent.sala_url, guestUrl: ent.sala_url, salaNome: ent.sala_nome })
    setTimeout(() => iframeRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
  }

  /* ── Encerrar direto (sem entrar na sala) ── */
  async function handleEncerrarDireto(ent: Entrevista) {
    setEncerrandoDireto(ent.id)
    try {
      const res = await fetch('/api/entrevista-video/encerrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId: ent.id, salaNome: ent.sala_nome }),
      })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error((json as { error?: string }).error ?? 'Erro ao encerrar entrevista')
      }
      setEntrevistas(prev =>
        prev.map(e => e.id === ent.id ? { ...e, status: 'ENCERRADA' } : e),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao encerrar')
    } finally {
      setEncerrandoDireto(null)
    }
  }

  /* ── Gravar áudio via MediaRecorder (microfone do entrevistador) ── */
  async function startGravacao() {
    if (mediaRecorderRef.current) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType =
        MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' :
        MediaRecorder.isTypeSupported('audio/webm')             ? 'audio/webm' :
        MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')  ? 'audio/ogg;codecs=opus' :
        'audio/ogg'
      mediaRecorderMimeRef.current = mimeType
      chunksRef.current = []
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.start(5000)
      mediaRecorderRef.current = recorder
      setIsRecording(true)
    } catch {
      console.warn('[startGravacao] Microfone não disponível — entrevista sem gravação.')
    }
  }

  /* ── Parar gravação e fazer upload ao Supabase Storage via URL pré-assinada ── */
  async function stopGravacaoEUpload(entrevistaId: string): Promise<string | null> {
    const recorder = mediaRecorderRef.current
    if (!recorder) return null
    setUploadingGravacao(entrevistaId)
    const mime = mediaRecorderMimeRef.current
    try {
      const blob = await new Promise<Blob>((resolve) => {
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
        recorder.onstop = () => {
          recorder.stream.getTracks().forEach(t => t.stop())
          resolve(new Blob(chunksRef.current, { type: mime }))
          chunksRef.current = []
        }
        if (recorder.state !== 'inactive') recorder.stop()
        else {
          recorder.stream.getTracks().forEach(t => t.stop())
          resolve(new Blob(chunksRef.current, { type: mime }))
          chunksRef.current = []
        }
      })
      mediaRecorderRef.current = null
      setIsRecording(false)
      if (blob.size < 1000) return null

      const presignRes = await fetch('/api/entrevista-video/presign-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId }),
      })
      if (!presignRes.ok) throw new Error('Erro ao preparar upload da gravação')
      const { token, path, publicUrl } = await presignRes.json() as {
        token: string; path: string; publicUrl: string
      }

      const { error: uploadErr } = await supabase.storage
        .from('entrevistas-audio')
        .uploadToSignedUrl(path, token, blob, { contentType: mime, upsert: true })
      if (uploadErr) throw new Error(uploadErr.message)

      return publicUrl
    } catch (err) {
      console.error('[stopGravacaoEUpload]', err)
      return null
    } finally {
      setUploadingGravacao(null)
    }
  }

  /* ── Copiar link candidato ── */
  async function handleCopiarLink() {
    if (!videoCall) return
    await navigator.clipboard.writeText(videoCall.guestUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  /* ── Excluir ── */
  async function handleExcluir(id: string) {
    if (!confirm('Excluir esta entrevista?')) return
    await supabase.from('entrevistas').delete().eq('id', id)
    setEntrevistas(prev => prev.filter(e => e.id !== id))
  }

  /* ── Ir para IA & Análise ── */
  function handleIrParaIA(ent: Entrevista) {
    if (ent.candidatos?.id) {
      sessionStorage.setItem('ia_candidato_id', ent.candidatos.id)
      sessionStorage.setItem('ia_candidato_nome', ent.candidatos.nome ?? '')
    }
    if (ent.transcricao) {
      sessionStorage.setItem('ia_transcricao', ent.transcricao)
    }
    router.push('/ia-analise')
  }

  /* ── Abrir modal de transcrição manual ── */
  async function handleAbrirTranscricaoModal(ent: Entrevista) {
    setFetchingGravacao(ent.id)
    setTextoManual('')
    setModalHasRecording(false)
    try {
      const res  = await fetch('/api/entrevista-video/transcricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId: ent.id, salaNome: ent.sala_nome }),
      })
      const json = await res.json()
      setModalHasRecording(json.has_recording ?? false)
    } catch {
      setModalHasRecording(false)
    } finally {
      setFetchingGravacao(null)
      setTranscricaoModalEnt(ent)
    }
  }

  /* ── Processar transcrição manual com IA ── */
  async function handleProcessarTranscricao() {
    if (!transcricaoModalEnt || !textoManual.trim()) return
    setProcessingTranscricao(true)
    try {
      const res  = await fetch('/api/entrevista-video/transcricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entrevistaId: transcricaoModalEnt.id,
          salaNome:     transcricaoModalEnt.sala_nome,
          texto:        textoManual,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao processar')
      setEntrevistas(prev =>
        prev.map(e => e.id === transcricaoModalEnt!.id
          ? { ...e, transcricao: json.transcricao, transcricao_texto: textoManual }
          : e),
      )
      setTranscricaoModalEnt(null)
      setTextoManual('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao processar transcrição')
    } finally {
      setProcessingTranscricao(false)
    }
  }

  /* ── Transcrever automaticamente (AssemblyAI) ── */
  async function handleTranscreverAuto(ent: Entrevista) {
    if (!ent.gravacao_url) {
      alert('Gravação não disponível. Use "Gerar transcrição" para colar manualmente.')
      return
    }
    setTranscrevendo(ent.id)
    try {
      const res  = await fetch('/api/entrevista-video/transcrever', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId: ent.id, videoUrl: ent.gravacao_url }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao iniciar transcrição')
      // Polling começa automaticamente pelo useEffect
      setEntrevistas(prev =>
        prev.map(e => e.id === ent.id
          ? { ...e, video_status: 'TRANSCREVENDO', assembly_job_id: json.job_id }
          : e),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao transcrever')
    } finally {
      setTranscrevendo(null)
    }
  }

  /* ── Analisar transcrição automática com IA ── */
  async function handleAnalisarTranscricao(ent: Entrevista) {
    if (!ent.transcricao_texto?.trim()) return
    setAnalisandoIds(prev => { const s = new Set(prev); s.add(ent.id); return s })
    try {
      const res  = await fetch('/api/entrevista-video/transcricao', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId: ent.id, salaNome: ent.sala_nome, texto: ent.transcricao_texto }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao analisar')
      setEntrevistas(prev =>
        prev.map(e => e.id === ent.id
          ? { ...e, transcricao: json.transcricao }
          : e),
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao analisar transcrição')
    } finally {
      setAnalisandoIds(prev => { const s = new Set(prev); s.delete(ent.id); return s })
    }
  }

  /* ── Gerar Diagnóstico Final ── */
  async function handleGerarDiagnostico(entId: string) {
    setGerandoDiagIds(prev => { const s = new Set(prev); s.add(entId); return s })
    try {
      const res  = await fetch('/api/entrevista-video/diagnostico-final', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entrevistaId: entId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar diagnóstico')
      setEntrevistas(prev =>
        prev.map(e => e.id === entId ? { ...e, diagnostico_final: json.diagnostico_final } : e),
      )
      setDiagAberto(entId)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Erro ao gerar diagnóstico final')
    } finally {
      setGerandoDiagIds(prev => { const s = new Set(prev); s.delete(entId); return s })
    }
  }

  /* ── Render ── */
  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Entrevistas</h1>
          <p className="text-gray-500 text-sm mt-1">
            {loading ? '...' : `${entrevistas.length} entrevista${entrevistas.length !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={() => { setModalOpen(true); setFormError('') }}
          className="btn-primary flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          Agendar entrevista
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* ─── Iframe da videoconferência ─── */}
      {videoCall && (
        <div ref={iframeRef} className="card p-0 overflow-hidden border-2 border-[#185FA5]/30">
          <div className="flex items-center justify-between px-4 py-3 bg-[#185FA5] text-white">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-sm font-semibold">Videoconferência em andamento</span>
              {isRecording && !uploadingGravacao && (
                <span className="flex items-center gap-1 text-xs text-red-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  Gravando
                </span>
              )}
              {uploadingGravacao === videoCall?.entrevistaId && (
                <span className="flex items-center gap-1 text-xs text-white/70">
                  <Loader2 size={11} className="animate-spin" /> Enviando gravação...
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopiarLink}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-xs font-medium transition-colors"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado!' : 'Link do candidato'}
              </button>
              <a
                href={videoCall.hostUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                title="Abrir em nova aba"
              >
                <ExternalLink size={14} />
              </a>
              <button
                onClick={() => setIframeExpanded(v => !v)}
                className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              >
                {iframeExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              </button>
              <button
                onClick={handleEncerrar}
                disabled={!!endingVideo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500 hover:bg-red-600 text-xs font-semibold transition-colors disabled:opacity-60"
              >
                {endingVideo ? <Loader2 size={13} className="animate-spin" /> : <PhoneOff size={13} />}
                Encerrar
              </button>
            </div>
          </div>
          <iframe
            src={videoCall.hostUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            className={`w-full border-0 transition-all duration-300 ${iframeExpanded ? 'h-[80vh]' : 'h-[520px]'}`}
            title="Videoconferência Daily.co"
          />
        </div>
      )}

      {/* ─── Loading ─── */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#185FA5]" />
        </div>
      )}

      {/* ─── Empty state ─── */}
      {!loading && entrevistas.length === 0 && !error && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f0f9' }}>
            <Video size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhuma entrevista agendada</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">Agende a primeira entrevista por videoconferência.</p>
          <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
            <Plus size={15} /> Agendar entrevista
          </button>
        </div>
      )}

      {/* ─── Lista ─── */}
      {!loading && entrevistas.length > 0 && (
        <div className="grid gap-4">
          {entrevistas.map(ent => {
            const cfg      = statusCfg[ent.status] ?? statusCfg.AGENDADA
            const { data: d, hora: h } = fmtData(ent.data)
            const isActive = videoCall?.entrevistaId === ent.id
            const relatorio   = ent.transcricao    ? parseRelatorio(ent.transcricao)       : null
            const diagFinal   = ent.diagnostico_final ? parseDiagnostico(ent.diagnostico_final) : null
            const isAnalisando  = analisandoIds.has(ent.id)
            const isGerandoDiag = gerandoDiagIds.has(ent.id)

            return (
              <div
                key={ent.id}
                className={`card hover:shadow-md transition-all ${isActive ? 'border-2 border-[#185FA5]/40 shadow-md' : 'border border-transparent'}`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

                  {/* ── Info ── */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className={`badge flex items-center gap-1.5 ${cfg.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                        {cfg.label}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Calendar size={11} /> {d}
                      </span>
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={11} /> {h}
                      </span>

                      {/* Indicadores de transcrição */}
                      {ent.video_status === 'TRANSCREVENDO' && (
                        <span className="flex items-center gap-1 text-[11px] text-violet-600 font-medium bg-violet-50 px-2 py-0.5 rounded-full border border-violet-200">
                          <Loader2 size={10} className="animate-spin" /> Transcrevendo com IA...
                        </span>
                      )}
                      {ent.video_status === 'ERRO' && (
                        <span className="flex items-center gap-1 text-[11px] text-red-600 font-medium bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                          <AlertCircle size={10} /> Erro na transcrição
                        </span>
                      )}
                      {ent.status === 'ENCERRADA' && ent.video_status === 'NAO_ENCONTRADA' && (
                        <span className="flex items-center gap-1 text-[11px] text-gray-500 font-medium bg-gray-50 px-2 py-0.5 rounded-full border border-gray-200">
                          <AlertCircle size={10} /> Gravação não encontrada
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#e8f0f9] flex items-center justify-center flex-shrink-0">
                          <User size={15} style={{ color: '#185FA5' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {ent.candidatos?.nome ?? 'Candidato removido'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {ent.candidatos?.email ?? '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#e8f0f9] flex items-center justify-center flex-shrink-0">
                          <Briefcase size={15} style={{ color: '#185FA5' }} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {ent.vagas?.titulo ?? 'Vaga removida'}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {ent.vagas?.empresa ?? '—'}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Seção colapsável: relatório de entrevista */}
                    {ent.transcricao && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => setTranscricaoAberta(v => v === ent.id ? null : ent.id)}
                          className="flex items-center gap-1.5 text-xs text-[#185FA5] hover:text-[#104880] font-medium transition-colors"
                        >
                          <FileText size={12} />
                          {relatorio ? 'Análise da entrevista' : 'Transcrição disponível'}
                          {transcricaoAberta === ent.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {transcricaoAberta === ent.id && (
                          relatorio
                            ? <CardRelatorio relatorio={relatorio} />
                            : (
                              <div className="mt-2 p-3 bg-gray-50 rounded-xl text-xs text-gray-700 max-h-52 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                                {ent.transcricao}
                              </div>
                            )
                        )}
                      </div>
                    )}

                    {/* Seção colapsável: diagnóstico final */}
                    {ent.diagnostico_final && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <button
                          onClick={() => setDiagAberto(v => v === ent.id ? null : ent.id)}
                          className="flex items-center gap-1.5 text-xs text-purple-700 hover:text-purple-900 font-medium transition-colors"
                        >
                          <Sparkles size={12} />
                          Diagnóstico Final disponível
                          {diagAberto === ent.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                        </button>
                        {diagAberto === ent.id && diagFinal && (
                          <CardDiagnosticoFinal diag={diagFinal} />
                        )}
                      </div>
                    )}
                  </div>

                  {/* ── Ações ── */}
                  <div className="flex flex-wrap items-center gap-2 flex-shrink-0">

                    {/* Ações: AGENDADA */}
                    {ent.status === 'AGENDADA' && (
                      <>
                        <button
                          onClick={() => handleIniciarVideo(ent)}
                          disabled={startingVideo === ent.id || !!videoCall}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#185FA5] hover:bg-[#104880] text-white text-sm font-semibold transition-colors disabled:opacity-50"
                        >
                          {startingVideo === ent.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : <Video size={14} />}
                          {startingVideo === ent.id ? 'Iniciando...' : 'Iniciar vídeo'}
                        </button>
                        <button
                          onClick={() => handleExcluir(ent.id)}
                          className="p-2 rounded-xl text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    )}

                    {/* Ações: EM_ANDAMENTO */}
                    {ent.status === 'EM_ANDAMENTO' && (
                      isActive ? (
                        <span className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-100 text-green-700 text-sm font-medium">
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                          Em andamento acima
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleRetomar(ent)}
                            disabled={!!videoCall}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            <Video size={14} /> Retomar vídeo
                          </button>
                          <button
                            onClick={() => handleEncerrarDireto(ent)}
                            disabled={encerrandoDireto === ent.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {encerrandoDireto === ent.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <PhoneOff size={14} />}
                            {encerrandoDireto === ent.id ? 'Encerrando...' : 'Encerrar entrevista'}
                          </button>
                        </>
                      )
                    )}

                    {/* Ações: ENCERRADA */}
                    {ent.status === 'ENCERRADA' && (
                      <>
                        {/* Ouvir gravação */}
                        {ent.gravacao_url && (
                          <a
                            href={ent.gravacao_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 border border-teal-200 text-teal-700 text-sm font-semibold transition-colors"
                          >
                            <Play size={14} /> Ouvir gravação
                          </a>
                        )}

                        {/* Transcrever automaticamente via AssemblyAI */}
                        {ent.gravacao_url && !ent.transcricao && ent.video_status !== 'TRANSCREVENDO' && ent.video_status !== 'TRANSCRITO' && (
                          <button
                            onClick={() => handleTranscreverAuto(ent)}
                            disabled={transcrevendo === ent.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {transcrevendo === ent.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Wand2 size={14} />}
                            {transcrevendo === ent.id ? 'Enviando...' : 'Transcrever auto'}
                          </button>
                        )}

                        {/* Analisar transcrição com IA (quando AssemblyAI concluiu) */}
                        {ent.video_status === 'TRANSCRITO' && !ent.transcricao && (
                          <button
                            onClick={() => handleAnalisarTranscricao(ent)}
                            disabled={isAnalisando}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {isAnalisando
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Brain size={14} />}
                            {isAnalisando ? 'Analisando...' : 'Analisar com IA'}
                          </button>
                        )}

                        {/* Gerar transcrição manual */}
                        {!ent.transcricao && ent.video_status !== 'TRANSCREVENDO' && ent.video_status !== 'TRANSCRITO' && (
                          <button
                            onClick={() => handleAbrirTranscricaoModal(ent)}
                            disabled={fetchingGravacao === ent.id}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                          >
                            {fetchingGravacao === ent.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Mic size={14} />}
                            {fetchingGravacao === ent.id ? 'Verificando...' : 'Gerar transcrição'}
                          </button>
                        )}

                        {/* Diagnóstico Final */}
                        {ent.transcricao && !ent.diagnostico_final && (
                          <button
                            onClick={() => handleGerarDiagnostico(ent.id)}
                            disabled={isGerandoDiag}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-[#185FA5] to-purple-600 hover:opacity-90 text-white text-sm font-semibold transition-all disabled:opacity-50"
                          >
                            {isGerandoDiag
                              ? <Loader2 size={14} className="animate-spin" />
                              : <Sparkles size={14} />}
                            {isGerandoDiag ? 'Gerando...' : 'Diagnóstico Final'}
                          </button>
                        )}

                        {/* IA & Análise */}
                        <button
                          onClick={() => handleIrParaIA(ent)}
                          className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#185FA5] text-[#185FA5] hover:bg-[#e8f0f9] text-sm font-semibold transition-colors"
                        >
                          <Brain size={14} /> IA & Análise
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ─── Modal: Agendar entrevista ─── */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">

              <div
                className="flex items-center justify-between p-6 rounded-t-2xl"
                style={{ background: 'linear-gradient(135deg, #185FA5, #2d7dd2)' }}
              >
                <div>
                  <h2 className="text-lg font-bold text-white">Agendar Entrevista</h2>
                  <p className="text-blue-200 text-xs mt-0.5">Videoconferência via Daily.co</p>
                </div>
                <button
                  onClick={() => setModalOpen(false)}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              <form onSubmit={handleAgendar} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Candidato <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input"
                    value={form.candidato_id}
                    onChange={e => setForm(f => ({ ...f, candidato_id: e.target.value }))}
                    required
                  >
                    <option value="">Selecione o candidato</option>
                    {candidatos.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Vaga <span className="text-red-500">*</span>
                  </label>
                  <select
                    className="input"
                    value={form.vaga_id}
                    onChange={e => setForm(f => ({ ...f, vaga_id: e.target.value }))}
                    required
                  >
                    <option value="">Selecione a vaga</option>
                    {vagas.map(v => (
                      <option key={v.id} value={v.id}>{v.titulo} — {v.empresa}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Data <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      className="input"
                      value={form.data}
                      min={new Date().toISOString().split('T')[0]}
                      onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Horário <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      className="input"
                      value={form.hora}
                      onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                {formError && (
                  <p className="text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle size={12} /> {formError}
                  </p>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Agendando...</> : 'Agendar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ─── Modal: Transcrição manual com IA ─── */}
      {transcricaoModalEnt && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
            onClick={() => { if (!processingTranscricao) setTranscricaoModalEnt(null) }}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

              <div
                className="flex items-center justify-between p-6 rounded-t-2xl flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #185FA5, #2d7dd2)' }}
              >
                <div>
                  <h2 className="text-lg font-bold text-white">Transcrição com IA</h2>
                  <p className="text-blue-200 text-xs mt-0.5">
                    {transcricaoModalEnt.candidatos?.nome ?? 'Candidato'} · {fmtData(transcricaoModalEnt.data).data}
                  </p>
                </div>
                <button
                  onClick={() => { if (!processingTranscricao) setTranscricaoModalEnt(null) }}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
                  disabled={processingTranscricao}
                >
                  <X size={16} className="text-white" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                {modalHasRecording ? (
                  <div className="flex items-start gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800">
                    <Check size={14} className="flex-shrink-0 mt-0.5 text-green-600" />
                    <span>
                      Gravação encontrada no Daily.co. Para transcrição automática, feche este modal e use
                      o botão <strong>Transcrever auto</strong>. Ou cole o texto manualmente abaixo.
                    </span>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800">
                    <Mic size={14} className="flex-shrink-0 mt-0.5 text-blue-600" />
                    <span>
                      Cole abaixo a transcrição da entrevista. A IA irá organizar o texto, identificar pontos
                      fortes, pontos de atenção e gerar uma recomendação de contratação.
                    </span>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Transcrição <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    className="input min-h-[220px] resize-y text-xs leading-relaxed"
                    value={textoManual}
                    onChange={e => setTextoManual(e.target.value)}
                    placeholder="Cole aqui o texto da transcrição da entrevista..."
                    disabled={processingTranscricao}
                  />
                  <p className="text-xs text-gray-400 mt-1">{textoManual.length} caracteres</p>
                </div>
              </div>

              <div className="flex gap-3 p-6 pt-0 flex-shrink-0 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setTranscricaoModalEnt(null)}
                  className="btn-secondary flex-1"
                  disabled={processingTranscricao}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleProcessarTranscricao}
                  disabled={textoManual.trim().length < 10 || processingTranscricao}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {processingTranscricao
                    ? <><Loader2 size={15} className="animate-spin" /> Processando com IA...</>
                    : <><Brain size={15} /> Processar com IA</>}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
