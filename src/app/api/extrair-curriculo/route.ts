import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/* ─────────────────────────────────────────────
   POST /api/extrair-curriculo
   Content-Type: multipart/form-data
   Campo: curriculo (File PDF)
   Retorna: { curriculo: string }
───────────────────────────────────────────── */
export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurado no .env.local' },
      { status: 500 },
    )
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida — envie multipart/form-data.' }, { status: 400 })
  }

  const pdfFile = formData.get('curriculo') as File | null

  if (!pdfFile || pdfFile.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }
  if (pdfFile.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo permitido: 5 MB.' }, { status: 400 })
  }

  try {
    const anthropic = new Anthropic({ apiKey })
    const arrayBuffer = await pdfFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

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
      text: `Extraia e formate o conteúdo completo deste currículo em texto corrido, em português.

Organize em seções com os seguintes títulos (use apenas os que existirem no PDF):

RESUMO PROFISSIONAL
[texto]

EXPERIÊNCIAS PROFISSIONAIS
[empresa, cargo, período e principais realizações]

FORMAÇÃO ACADÊMICA
[curso, instituição, ano]

HABILIDADES TÉCNICAS
[lista de tecnologias, ferramentas, idiomas]

CERTIFICAÇÕES E CURSOS
[nome, instituição, ano]

Regras:
- Seja completo e detalhado — este texto será usado por IA para avaliar o candidato
- Mantenha fatos reais do currículo, não invente informações
- Retorne APENAS o texto formatado, sem introduções ou comentários adicionais`,
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{ role: 'user', content: [docBlock, txtBlock] }],
    })

    const texto = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    if (!texto) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto deste PDF. Verifique se o arquivo não está protegido ou corrompido.' },
        { status: 422 },
      )
    }

    return NextResponse.json({ curriculo: texto })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao processar o PDF'
    console.error('[extrair-curriculo]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
