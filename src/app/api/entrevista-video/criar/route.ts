import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const DAILY_BASE   = 'https://api.daily.co/v1'
const DAILY_DOMAIN = process.env.DAILY_DOMAIN ?? 'recruta'

function dailyHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DAILY_API_KEY}`,
  }
}

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/criar
   Body: { entrevistaId: string }
   Retorna: { host_url, guest_url, sala_url, sala_nome }
───────────────────────────────────────────── */
export async function POST(request: Request) {
  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'DAILY_API_KEY não configurado.' }, { status: 500 })
  }

  let entrevistaId: string
  try {
    ;({ entrevistaId } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  // Nome único da sala
  const salaNome = `recruta-${entrevistaId.slice(0, 8)}-${Date.now()}`
  // Sala expira em 3 horas
  const exp = Math.floor(Date.now() / 1000) + 3 * 60 * 60

  try {
    /* ── 1. Criar sala no Daily.co ── */
    const roomRes = await fetch(`${DAILY_BASE}/rooms`, {
      method: 'POST',
      headers: dailyHeaders(),
      body: JSON.stringify({
        name: salaNome,
        properties: {
          exp,
          enable_screenshare: true,
          start_video_off: false,
          start_audio_off: false,
          // enable_recording removido: gravação é feita via MediaRecorder no navegador
        },
      }),
    })

    const room = await roomRes.json()
    console.log('[criar-sala] Daily.co room response:', JSON.stringify(room))

    if (!roomRes.ok) {
      return NextResponse.json(
        { error: room.error ?? 'Erro ao criar sala no Daily.co' },
        { status: 502 },
      )
    }

    // Usa a URL retornada pelo próprio Daily.co (garante domínio correto)
    const salaUrl = (room.url as string) ?? `https://${DAILY_DOMAIN}.daily.co/${salaNome}`

    /* ── 2. Token do entrevistador (is_owner = true) ── */
    const hostTokenRes = await fetch(`${DAILY_BASE}/meeting-tokens`, {
      method: 'POST',
      headers: dailyHeaders(),
      body: JSON.stringify({
        properties: { room_name: salaNome, is_owner: true, exp },
      }),
    })
    const hostToken = await hostTokenRes.json()
    console.log('[criar-sala] Host token response:', JSON.stringify(hostToken))

    if (!hostTokenRes.ok || !hostToken.token) {
      return NextResponse.json(
        { error: hostToken.error ?? 'Erro ao gerar token do entrevistador' },
        { status: 502 },
      )
    }

    /* ── 3. Token do candidato (is_owner = false) ── */
    const guestTokenRes = await fetch(`${DAILY_BASE}/meeting-tokens`, {
      method: 'POST',
      headers: dailyHeaders(),
      body: JSON.stringify({
        properties: { room_name: salaNome, is_owner: false, exp },
      }),
    })
    const guestToken = await guestTokenRes.json()
    console.log('[criar-sala] Guest token response:', JSON.stringify(guestToken))

    if (!guestTokenRes.ok || !guestToken.token) {
      return NextResponse.json(
        { error: guestToken.error ?? 'Erro ao gerar token do candidato' },
        { status: 502 },
      )
    }

    const hostUrl  = `${salaUrl}?t=${hostToken.token}`
    const guestUrl = `${salaUrl}?t=${guestToken.token}`
    console.log('[criar-sala] URLs geradas — sala:', salaUrl, '| host:', hostUrl.slice(0, 80) + '...')

    /* ── 4. Atualizar entrevista no Supabase ── */
    const supabase = getSupabaseAdmin()
    const { error: dbErr } = await supabase
      .from('entrevistas')
      .update({ sala_url: salaUrl, sala_nome: salaNome, status: 'EM_ANDAMENTO' })
      .eq('id', entrevistaId)

    if (dbErr) {
      console.error('[entrevista-video/criar] Supabase update:', dbErr.message)
      // Sala já foi criada — retornamos mesmo assim
    }

    return NextResponse.json({ host_url: hostUrl, guest_url: guestUrl, sala_url: salaUrl, sala_nome: salaNome })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[entrevista-video/criar]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
