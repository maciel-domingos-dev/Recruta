import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

const DAILY_BASE = 'https://api.daily.co/v1'

type DailyRecording = { id: string; duration?: number; status?: string }

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/transcricao
   Body: { entrevistaId, salaNome?, texto? }
   • sem texto → verifica gravações no Daily.co, retorna { needs_manual, has_recording }
   • com texto → processa com Claude, salva no Supabase, retorna { transcricao }
───────────────────────────────────────────── */
export async function POST(request: Request) {
  let entrevistaId: string, salaNome: string | undefined, texto: string | undefined
  try {
    ;({ entrevistaId, salaNome, texto } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  if (texto?.trim()) {
    return processarComIA(entrevistaId, texto.trim())
  }

  // Verificar gravações no Daily.co (best-effort)
  let recordings: DailyRecording[] = []
  if (salaNome && process.env.DAILY_API_KEY) {
    try {
      const res = await fetch(
        `${DAILY_BASE}/recordings?room_name=${encodeURIComponent(salaNome)}`,
        { headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}` } },
      )
      if (res.ok) {
        const data = await res.json()
        recordings = (data.data ?? []).map((r: DailyRecording) => ({
          id: r.id,
          duration: r.duration,
          status: r.status,
        }))
      }
    } catch {
      // Daily.co indisponível
    }
  }

  return NextResponse.json({
    needs_manual: true,
    has_recording: recordings.length > 0,
    recordings,
  })
}

async function processarComIA(entrevistaId: string, texto: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurado.' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey })

  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Você é um assistente de RH especialista em análise de entrevistas de emprego.

Analise a transcrição abaixo e retorne APENAS um objeto JSON válido com esta estrutura exata, sem markdown e sem texto adicional:

{
  "resumoExecutivo": "Texto descritivo com 3 a 5 pontos objetivos sobre o perfil e desempenho do candidato",
  "pontosFortes": ["Competência ou qualidade 1", "Competência ou qualidade 2", "..."],
  "pontosAtencao": ["Aspecto que merece atenção 1", "Aspecto que merece atenção 2"],
  "analiseComportamental": "Análise do comportamento, comunicação, postura e soft skills demonstrados",
  "recomendacao": "Contratar",
  "score": 85
}

Regras obrigatórias:
- "recomendacao" deve ser exatamente uma destas três opções: "Contratar", "Não contratar" ou "Avaliar"
- "score" deve ser um número inteiro de 0 a 100 representando a adequação do candidato
- "pontosFortes" e "pontosAtencao" devem ser arrays de strings curtas (máximo 15 palavras cada item)
- Retorne APENAS o JSON puro, sem blocos markdown, sem texto antes ou depois

Transcrição:
${texto}`,
        },
      ],
    })

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text : texto
    // Extrair JSON removendo possíveis blocos markdown do Claude
    let transcricao: string
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      JSON.parse(cleaned) // valida
      transcricao = cleaned
    } catch {
      transcricao = rawText
    }

    const supabase = getSupabaseAdmin()
    const { error: dbErr } = await supabase
      .from('entrevistas')
      .update({ transcricao, transcricao_texto: texto })
      .eq('id', entrevistaId)

    if (dbErr) {
      console.error('[transcricao] Supabase update:', dbErr.message)
    }

    return NextResponse.json({ transcricao })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[transcricao] Claude error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
