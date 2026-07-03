import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const DAILY_BASE = 'https://api.daily.co/v1'

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/encerrar
   Body: { entrevistaId, salaNome?, gravacaoUrl? }
   Retorna: { success: true }
───────────────────────────────────────────── */
export async function POST(request: Request) {
  let entrevistaId: string, salaNome: string | undefined, gravacaoUrl: string | null | undefined
  try {
    ;({ entrevistaId, salaNome, gravacaoUrl } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  /* ── 1. Deletar sala no Daily.co (best-effort) ── */
  if (salaNome && process.env.DAILY_API_KEY) {
    try {
      await fetch(`${DAILY_BASE}/rooms/${salaNome}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` },
      })
    } catch (err) {
      console.warn('[entrevista-video/encerrar] Falha ao deletar sala Daily.co:', err)
    }
  }

  /* ── 2. Atualizar status no Supabase ── */
  const supabase = getSupabaseAdmin()

  // gravacaoUrl: fornecido pelo cliente após upload MediaRecorder → Supabase Storage.
  // Quando o plano Daily.co incluir cloud recording, adicionar aqui: video_status: 'PROCESSANDO'
  const update: Record<string, unknown> = { status: 'ENCERRADA' }
  if (gravacaoUrl !== undefined) {
    update.gravacao_url    = gravacaoUrl
    update.status_gravacao = gravacaoUrl ? 'disponivel' : null
  }

  const { error: dbErr } = await supabase
    .from('entrevistas')
    .update(update)
    .eq('id', entrevistaId)

  if (dbErr) {
    console.error('[entrevista-video/encerrar] Supabase update:', dbErr.message)
    return NextResponse.json({ error: dbErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
