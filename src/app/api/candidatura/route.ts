import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getSupabaseAdmin } from '@/lib/supabase'

/* ─────────────────────────────────────────────
   POST /api/candidatura
   Content-Type: multipart/form-data
   Campos: nome, email, telefone, cargo, vaga_id, curriculo (PDF)
───────────────────────────────────────────── */
export async function POST(request: Request) {
  try {
    const formData = await request.formData()

    const nome  = (formData.get('nome')  as string) || ''
    const email = (formData.get('email') as string) || ''
    const cargo = (formData.get('cargo') as string) || ''
    // telefone coletado no portal mas não há coluna na tabela candidatos ainda
    void formData.get('telefone')
    const vagaId   = (formData.get('vaga_id')  as string) || ''
    const pdfFile  = formData.get('curriculo') as File | null

    if (!nome.trim() || !email.trim()) {
      return NextResponse.json(
        { error: 'Nome e e-mail são obrigatórios.' },
        { status: 400 },
      )
    }

    /* ── 1. Extração completa do PDF com IA ── */
    type AiData = {
      nome?: string
      email?: string
      cargo?: string
      habilidades?: string[]
      anos_experiencia?: number
      perfil?: string   // ← perfil rico extraído do PDF, usado como curriculo
    }
    let aiData: AiData = {}
    let aiExtracted = false

    if (pdfFile && pdfFile.size > 0) {
      const apiKey = process.env.ANTHROPIC_API_KEY
      if (apiKey) {
        try {
          const anthropic = new Anthropic({ apiKey })
          const arrayBuffer = await pdfFile.arrayBuffer()
          const base64 = Buffer.from(arrayBuffer).toString('base64')

          // Blocos de conteúdo tipados explicitamente para evitar erro de overload
          const docBlock: Anthropic.DocumentBlockParam = {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: base64,
            },
          }
          const txtBlock: Anthropic.TextBlockParam = {
            type: 'text',
            text: `Analise este currículo em PDF e extraia todas as informações do candidato.
Retorne SOMENTE o JSON abaixo (sem markdown, sem texto antes ou depois):
{
  "nome": "nome completo do candidato",
  "email": "email@exemplo.com",
  "cargo": "último cargo ou cargo mais recente",
  "habilidades": ["habilidade1", "habilidade2", "habilidade3"],
  "anos_experiencia": 5,
  "perfil": "Perfil profissional completo extraído do currículo. Inclua: resumo de carreira, todas as experiências profissionais com empresas e períodos, formação acadêmica, certificações, idiomas e conquistas relevantes. Escreva em português, de forma detalhada (mínimo 200 palavras), pois este texto será usado pela IA para avaliar o candidato em processos seletivos."
}

Se algum campo não estiver disponível no currículo, use null.`,
          }

          const message = await anthropic.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 2048,
            messages: [{ role: 'user', content: [docBlock, txtBlock] }],
          })

          const rawText = message.content[0].type === 'text' ? message.content[0].text : '{}'
          try {
            aiData = JSON.parse(rawText)
            aiExtracted = true
          } catch {
            const match = rawText.match(/\{[\s\S]*\}/)
            if (match) {
              aiData = JSON.parse(match[0])
              aiExtracted = true
            }
          }
        } catch (aiErr) {
          console.error('[candidatura] AI extraction error:', aiErr)
          // Continua sem dados da IA — graceful degradation
        }
      }
    }

    /* ── 2. Montar o campo curriculo com perfil completo ── */
    // Bug corrigido: antes salvava só 2-3 frases. Agora salva o perfil detalhado
    // que a rota /api/ia-analise/curriculos usa para comparar com os requisitos da vaga.
    const habilidadesStr =
      Array.isArray(aiData.habilidades) && aiData.habilidades.length > 0
        ? aiData.habilidades.join(', ')
        : null

    let curriculoTexto: string | null = null

    if (aiData.perfil) {
      // Perfil rico extraído da IA — inclui experiências, formação, etc.
      const partes = [
        aiData.perfil,
        habilidadesStr         ? `\nHabilidades: ${habilidadesStr}`                    : null,
        aiData.anos_experiencia ? `Experiência total: ${aiData.anos_experiencia} ano(s)` : null,
      ].filter(Boolean)
      curriculoTexto = partes.join('\n')
    } else if (habilidadesStr) {
      // Fallback: pelo menos salva as habilidades
      curriculoTexto = `Habilidades: ${habilidadesStr}`
      if (aiData.anos_experiencia) {
        curriculoTexto += `\nExperiência total: ${aiData.anos_experiencia} ano(s)`
      }
    }

    /* ── 3. Inserir na tabela candidatos ── */
    const supabase = getSupabaseAdmin()

    const candidatoPayload: Record<string, unknown> = {
      nome:      aiData.nome  || nome,
      email:     aiData.email || email,
      cargo:     aiData.cargo || cargo || null,
      curriculo: curriculoTexto,   // ← agora contém o perfil completo
      status:    'DISPONIVEL',
    }

    const { data: candidato, error: candidatoError } = await supabase
      .from('candidatos')
      .insert([candidatoPayload])
      .select()
      .single()

    if (candidatoError) {
      console.error('[candidatura] Supabase insert candidato:', candidatoError)
      return NextResponse.json({ error: candidatoError.message }, { status: 500 })
    }

    /* ── 4. Inserir no pipeline ── */
    if (vagaId && candidato?.id) {
      const { error: pipelineError } = await supabase.from('pipeline').insert([
        {
          candidato_id: candidato.id,
          vaga_id:      vagaId,
          etapa:        'TRIAGEM',
        },
      ])
      if (pipelineError) {
        console.warn('[candidatura] Pipeline insert skipped:', pipelineError.message)
      }
    }

    return NextResponse.json({
      success:      true,
      candidato_id: candidato?.id,
      ai_extracted: aiExtracted,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno do servidor'
    console.error('[candidatura] Unhandled error:', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
