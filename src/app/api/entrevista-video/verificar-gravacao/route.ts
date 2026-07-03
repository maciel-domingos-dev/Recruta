import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const DAILY_BASE = 'https://api.daily.co/v1'

type DailyRecording = { id: string; status?: string }

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/verificar-gravacao
   Body: { entrevistaId, salaNome }

   Consulta o Daily.co por gravações prontas da sala.
   Se encontrar, obtém o link de download e salva no banco.
   Retorna: { video_status, video_url? }
───────────────────────────────────────────── */
export async function POST(request: Request) {
  let entrevistaId: string, salaNome: string | undefined
  try {
    ;({ entrevistaId, salaNome } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  const apiKey = process.env.DAILY_API_KEY
  if (!apiKey || !salaNome) {
    return NextResponse.json({ video_status: 'PROCESSANDO' })
  }

  try {
    const res = await fetch(
      `${DAILY_BASE}/recordings?room_name=${encodeURIComponent(salaNome)}`,
      { headers: { Authorization: `Bearer ${apiKey}` } },
    )

    if (!res.ok) return NextResponse.json({ video_status: 'PROCESSANDO' })

    const data = await res.json()
    const recordings: DailyRecording[] = data.data ?? []

    // Qualquer gravação presente (status finished ou sem status) está pronta
    const finished = recordings.find(r => !r.status || r.status === 'finished')
    if (!finished) return NextResponse.json({ video_status: 'PROCESSANDO' })

    // Busca link de download (GCS signed URL — acessível sem auth adicional)
    let videoUrl: string | null = null
    try {
      const linkRes = await fetch(`${DAILY_BASE}/recordings/${finished.id}/access-link`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      })
      if (linkRes.ok) {
        const linkData = await linkRes.json()
        videoUrl = linkData.download_link ?? null
      }
    } catch {
      // Se falhar, ainda marcamos como PRONTO sem URL
    }

    const supabase = getSupabaseAdmin()
    await supabase
      .from('entrevistas')
      .update({ video_url: videoUrl, video_status: 'PRONTO' })
      .eq('id', entrevistaId)

    return NextResponse.json({ video_status: 'PRONTO', video_url: videoUrl })
  } catch (err) {
    console.error('[verificar-gravacao]', err)
    return NextResponse.json({ video_status: 'PROCESSANDO' })
  }
}
