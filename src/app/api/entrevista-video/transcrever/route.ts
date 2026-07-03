import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const ASSEMBLY_BASE = 'https://api.assemblyai.com/v2'

function asmHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: process.env.ASSEMBLYAI_API_KEY ?? '',
  }
}

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/transcrever

   Modo submissão (videoUrl fornecida):
     Body: { entrevistaId, videoUrl }
     Submete job ao AssemblyAI, retorna { job_id }

   Modo polling (jobId fornecido):
     Body: { entrevistaId, jobId }
     Verifica status; se concluído salva transcricao_texto e retorna texto

   Requer ASSEMBLYAI_API_KEY no .env.local
───────────────────────────────────────────── */
export async function POST(request: Request) {
  let entrevistaId: string, videoUrl: string | undefined, jobId: string | undefined
  try {
    ;({ entrevistaId, videoUrl, jobId } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ASSEMBLYAI_API_KEY não configurado. Adicione ao .env.local para usar transcrição automática.' },
      { status: 500 },
    )
  }

  if (jobId) return verificarJob(entrevistaId, jobId)
  if (videoUrl) return submeterJob(entrevistaId, videoUrl)

  return NextResponse.json({ error: 'videoUrl ou jobId é obrigatório.' }, { status: 400 })
}

async function submeterJob(entrevistaId: string, videoUrl: string) {
  try {
    const res = await fetch(`${ASSEMBLY_BASE}/transcript`, {
      method: 'POST',
      headers: asmHeaders(),
      body: JSON.stringify({
        audio_url: videoUrl,
        language_code: 'pt',
        punctuate: true,
        format_text: true,
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json(
        { error: err.error ?? 'Erro ao submeter para AssemblyAI' },
        { status: 502 },
      )
    }

    const data = await res.json()

    const supabase = getSupabaseAdmin()
    await supabase
      .from('entrevistas')
      .update({ video_status: 'TRANSCREVENDO', assembly_job_id: data.id })
      .eq('id', entrevistaId)

    return NextResponse.json({ job_id: data.id, status: 'processing' })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[transcrever/submeter]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

async function verificarJob(entrevistaId: string, jobId: string) {
  try {
    const res = await fetch(`${ASSEMBLY_BASE}/transcript/${jobId}`, {
      headers: asmHeaders(),
    })

    if (!res.ok) {
      return NextResponse.json({ status: 'processing' })
    }

    const data = await res.json()

    if (data.status === 'error') {
      const supabase = getSupabaseAdmin()
      await supabase
        .from('entrevistas')
        .update({ video_status: 'ERRO' })
        .eq('id', entrevistaId)
      return NextResponse.json({ status: 'error', error: data.error ?? 'Erro na transcrição' })
    }

    if (data.status !== 'completed') {
      return NextResponse.json({ status: 'processing' })
    }

    // Concluído — salva texto bruto
    const transcricaoTexto: string = data.text ?? ''
    const supabase = getSupabaseAdmin()
    await supabase
      .from('entrevistas')
      .update({ transcricao_texto: transcricaoTexto, video_status: 'TRANSCRITO', assembly_job_id: null })
      .eq('id', entrevistaId)

    return NextResponse.json({ status: 'completed', transcricao_texto: transcricaoTexto })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[transcrever/verificar]', err)
    return NextResponse.json({ status: 'error', error: msg }, { status: 500 })
  }
}
