import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/vagas/extrair-pdf
   Content-Type: multipart/form-data  —  campo: vaga (File PDF)

   Extrai dados de uma vaga/job description via IA.

   Retorna:
   { titulo, empresa, descricao, requisitos, diferenciais }
   (qualquer campo pode ser null quando não encontrado no PDF)
───────────────────────────────────────────────────────────────────────── */

type VagaData = {
  titulo: string | null
  empresa: string | null
  descricao: string | null
  requisitos: string | null
  diferenciais: string | null
}

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

  const pdfFile = formData.get('vaga') as File | null

  if (!pdfFile || pdfFile.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }
  if (!pdfFile.name.toLowerCase().endsWith('.pdf') && pdfFile.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Apenas arquivos PDF são aceitos.' }, { status: 400 })
  }
  if (pdfFile.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'Arquivo muito grande. Máximo permitido: 10 MB.' }, { status: 400 })
  }

  try {
    const anthropic = new Anthropic({ apiKey })
    const arrayBuffer = await pdfFile.arrayBuffer()
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: `Analise este PDF de descrição de vaga e retorne um objeto JSON puro com os campos abaixo.
Use null para campos não encontrados.

Retorne APENAS este JSON, sem markdown, sem blocos de código, sem texto antes ou depois:

{
  "titulo": null,
  "empresa": null,
  "descricao": null,
  "requisitos": null,
  "diferenciais": null
}

Instruções por campo:
- "titulo": título exato da vaga (ex: "Desenvolvedor Full Stack Sênior", "Analista de Marketing Pleno")
- "empresa": nome da empresa contratante (null se não mencionado)
- "descricao": descrição completa da vaga em texto corrido — inclua: contexto da empresa, responsabilidades,
  modalidade (Remoto/Híbrido/Presencial), localização, tipo de contrato (CLT/PJ/Freelance), faixa salarial se
  mencionada, nível exigido (Júnior/Pleno/Sênior) e qualquer informação relevante sobre a posição.
  Seja detalhado — este texto é usado pelo sistema para triagem de candidatos.
- "requisitos": requisitos obrigatórios como texto, um por linha, com bullet "•" no início de cada item.
  Exemplo: "• 3 anos de experiência em React\\n• Inglês intermediário\\n• Graduação em TI ou áreas afins"
- "diferenciais": requisitos desejáveis, benefícios e diferenciais, um por linha com bullet "•".
  Inclua benefícios (VR, plano de saúde, home office, etc.) junto com os diferenciais técnicos.
  Exemplo: "• Experiência com AWS\\n• MBA ou especialização\\n• Vale-refeição R$ 50/dia\\n• Plano de saúde Amil"

Regras obrigatórias:
- Retorne APENAS o JSON puro, sem markdown nem blocos de código
- Mantenha somente fatos reais presentes no documento — nunca invente informações
- Se o PDF não parecer ser uma descrição de vaga, retorne null nos demais campos e em "descricao"
  coloque uma nota explicando que o conteúdo não parece ser uma vaga de emprego`,
          } as Anthropic.TextBlockParam,
        ],
      }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    if (!rawText) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto deste PDF. Verifique se o arquivo não está protegido ou corrompido.' },
        { status: 422 },
      )
    }

    let parsed: Partial<VagaData> | null = null
    try {
      const stripped = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : stripped) as Partial<VagaData>
    } catch {
      parsed = { descricao: rawText }
    }

    const str = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : null

    const result: VagaData = {
      titulo:       str(parsed?.titulo),
      empresa:      str(parsed?.empresa),
      descricao:    str(parsed?.descricao),
      requisitos:   str(parsed?.requisitos),
      diferenciais: str(parsed?.diferenciais),
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao processar o PDF'
    console.error('[vagas/extrair-pdf]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
