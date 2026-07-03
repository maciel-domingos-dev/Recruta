import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import Anthropic from '@anthropic-ai/sdk'

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/diagnostico-final
   Body: { entrevistaId }

   Gera diagnóstico final combinando:
     - Dados do candidato (currículo, habilidades, etc.)
     - 1º diagnóstico de currículo (pipeline.relatorio_ia)
     - Análise da entrevista (entrevistas.transcricao JSON)
     - Transcrição bruta (entrevistas.transcricao_texto)
     - Dados da vaga (descrição, requisitos)

   Salva em entrevistas.diagnostico_final e retorna JSON.
───────────────────────────────────────────── */

type RelatorioIA = {
  resumoExecutivo?: string
  pontosFortes?: string[]
  pontosAtencao?: string[]
  analiseComportamental?: string
  recomendacao?: string
  score?: number
}

type PipelineRow = {
  relatorio_ia: string | null
  score_ia: number | null
}

export async function POST(request: Request) {
  let entrevistaId: string
  try {
    ;({ entrevistaId } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'ANTHROPIC_API_KEY não configurado.' }, { status: 500 })
  }

  const supabase = getSupabaseAdmin()

  // Busca entrevista + campos de candidato e vaga diretamente via joins separados
  const { data: entRaw, error: entErr } = await supabase
    .from('entrevistas')
    .select('id, candidato_id, vaga_id, transcricao, transcricao_texto')
    .eq('id', entrevistaId)
    .single()

  if (entErr || !entRaw) {
    return NextResponse.json({ error: 'Entrevista não encontrada.' }, { status: 404 })
  }

  // Busca candidato e vaga em paralelo com pipeline
  const [{ data: candRaw }, { data: vagaRaw }, { data: pipelineRaw }] = await Promise.all([
    supabase
      .from('candidatos')
      .select('nome, cargo, resumo, habilidades, idiomas')
      .eq('id', entRaw.candidato_id)
      .single(),
    supabase
      .from('vagas')
      .select('titulo, empresa, descricao, requisitos')
      .eq('id', entRaw.vaga_id)
      .single(),
    supabase
      .from('pipeline')
      .select('relatorio_ia, score_ia')
      .eq('candidato_id', entRaw.candidato_id)
      .eq('vaga_id', entRaw.vaga_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  const pipeline = pipelineRaw as PipelineRow | null

  const nome      = (candRaw as { nome: string | null } | null)?.nome      ?? 'N/A'
  const cargo     = (candRaw as { cargo: string | null } | null)?.cargo    ?? 'N/A'
  const resumo    = (candRaw as { resumo: string | null } | null)?.resumo  ?? 'N/A'
  const habRaw    = (candRaw as { habilidades: unknown } | null)?.habilidades
  const idiRaw    = (candRaw as { idiomas: unknown } | null)?.idiomas
  const habilidades = Array.isArray(habRaw) ? (habRaw as string[]).join(', ') : 'N/A'
  const idiomas     = Array.isArray(idiRaw) ? (idiRaw as string[]).join(', ') : 'N/A'

  const vagaTitulo   = (vagaRaw as { titulo: string | null } | null)?.titulo    ?? 'N/A'
  const vagaEmpresa  = (vagaRaw as { empresa: string | null } | null)?.empresa   ?? 'N/A'
  const vagaDesc     = (vagaRaw as { descricao: string | null } | null)?.descricao  ?? 'N/A'
  const vagaReq      = (vagaRaw as { requisitos: string | null } | null)?.requisitos ?? 'N/A'

  // Monta bloco do 1º diagnóstico (pipeline.relatorio_ia)
  let bloco1Diag = 'Diagnóstico de currículo não realizado ainda.'
  if (pipeline?.relatorio_ia) {
    try {
      const p = JSON.parse(pipeline.relatorio_ia)
      const linhas: string[] = []
      if (pipeline.score_ia)         linhas.push(`Score currículo: ${pipeline.score_ia}/100`)
      if (p.recomendacao)            linhas.push(`Recomendação: ${p.recomendacao}`)
      if (p.resumo)                  linhas.push(`Resumo: ${p.resumo}`)
      if (p.pontos_fortes?.length)   linhas.push(`Pontos fortes: ${(p.pontos_fortes as string[]).join(', ')}`)
      if (p.pontos_atencao?.length)  linhas.push(`Pontos de atenção: ${(p.pontos_atencao as string[]).join(', ')}`)
      bloco1Diag = linhas.join('\n')
    } catch {
      bloco1Diag = pipeline.relatorio_ia
    }
  }

  // Monta bloco da análise da entrevista (entrevistas.transcricao JSON)
  let blocoEntrevista = 'Análise de entrevista não disponível.'
  if (entRaw.transcricao) {
    try {
      const r: RelatorioIA = JSON.parse(entRaw.transcricao)
      const linhas: string[] = []
      if (r.score !== undefined)          linhas.push(`Score entrevista: ${r.score}/100`)
      if (r.recomendacao)                 linhas.push(`Recomendação da entrevista: ${r.recomendacao}`)
      if (r.resumoExecutivo)              linhas.push(`Resumo: ${r.resumoExecutivo}`)
      if (r.pontosFortes?.length)         linhas.push(`Pontos fortes: ${r.pontosFortes.join(', ')}`)
      if (r.pontosAtencao?.length)        linhas.push(`Pontos de atenção: ${r.pontosAtencao.join(', ')}`)
      if (r.analiseComportamental)        linhas.push(`Comportamental: ${r.analiseComportamental}`)
      blocoEntrevista = linhas.join('\n')
    } catch {
      blocoEntrevista = entRaw.transcricao
    }
  }

  const transcricaoTrecho = entRaw.transcricao_texto
    ? `\n\nTrecho da transcrição:\n${entRaw.transcricao_texto.slice(0, 2000)}${entRaw.transcricao_texto.length > 2000 ? '\n[...]' : ''}`
    : ''

  const prompt = `Você é um head de recrutamento sênior fazendo a avaliação final de um candidato após todo o processo seletivo.

Analise todos os dados abaixo e gere um diagnóstico final consolidado. Retorne APENAS JSON puro, sem markdown.

## VAGA
Título: ${vagaTitulo}
Empresa: ${vagaEmpresa}
Descrição: ${vagaDesc}
Requisitos: ${vagaReq}

## CANDIDATO
Nome: ${nome}
Cargo: ${cargo}
Resumo: ${resumo}
Habilidades: ${habilidades}
Idiomas: ${idiomas}

## 1º DIAGNÓSTICO — Currículo × Vaga (gerado antes da entrevista)
${bloco1Diag}

## ANÁLISE DA ENTREVISTA
${blocoEntrevista}${transcricaoTrecho}

Retorne APENAS este JSON, sem markdown:
{
  "score_final": 85,
  "recomendacao_final": "Contratar",
  "sintese": "Síntese em 2-3 frases do processo completo.",
  "sintese_curriculo": "Avaliação do alinhamento do currículo com a vaga.",
  "sintese_entrevista": "Como foi o desempenho na entrevista.",
  "pontos_decisivos": ["Fator decisivo 1", "Fator decisivo 2", "Fator decisivo 3"],
  "proxima_etapa": "Ex: Avançar para proposta salarial.",
  "justificativa": "Justificativa completa da recomendação final cruzando todos os dados."
}

Regras obrigatórias:
- "recomendacao_final": exatamente "Contratar", "Não contratar" ou "Avaliar"
- "score_final": inteiro 0-100 (ponderando currículo 40% + entrevista 60%)
- "pontos_decisivos": 2-4 itens, frases curtas
- Retorne APENAS o JSON puro, sem texto antes ou depois`

  try {
    const anthropic = new Anthropic({ apiKey })
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    })

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text : ''
    let diagnosticoFinal: string
    try {
      const cleaned = rawText.replace(/^```(?:json)?\s*/m, '').replace(/\s*```\s*$/m, '').trim()
      const match   = cleaned.match(/\{[\s\S]*\}/)
      const parsed  = match ? match[0] : cleaned
      JSON.parse(parsed)
      diagnosticoFinal = parsed
    } catch {
      diagnosticoFinal = rawText
    }

    const { error: dbErr } = await supabase
      .from('entrevistas')
      .update({ diagnostico_final: diagnosticoFinal })
      .eq('id', entrevistaId)

    if (dbErr) console.error('[diagnostico-final] Supabase update:', dbErr.message)

    return NextResponse.json({ diagnostico_final: diagnosticoFinal })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    console.error('[diagnostico-final]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
