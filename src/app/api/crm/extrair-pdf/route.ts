import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/crm/extrair-pdf
   Content-Type: multipart/form-data  —  campo: empresa (File PDF)

   Extrai dados de empresa a partir de contrato, proposta ou apresentação.

   Retorna:
   { nome_empresa, cnpj, segmento, contato_responsavel, cargo_responsavel,
     email, telefone, observacoes }
───────────────────────────────────────────────────────────────────────── */

type EmpresaData = {
  nome_empresa: string | null
  cnpj: string | null
  segmento: string | null
  contato_responsavel: string | null
  cargo_responsavel: string | null
  email: string | null
  telefone: string | null
  observacoes: string | null
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

  const pdfFile = formData.get('empresa') as File | null

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
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: `Analise este PDF (pode ser contrato, proposta comercial, apresentação ou qualquer documento de empresa)
e retorne um objeto JSON puro com os campos abaixo. Use null para campos não encontrados.

Retorne APENAS este JSON, sem markdown, sem blocos de código, sem texto antes ou depois:

{
  "nome_empresa": null,
  "cnpj": null,
  "segmento": null,
  "contato_responsavel": null,
  "cargo_responsavel": null,
  "email": null,
  "telefone": null,
  "observacoes": null
}

Instruções por campo:
- "nome_empresa": razão social ou nome fantasia principal da empresa (não do cliente/comprador, mas da empresa no documento)
- "cnpj": CNPJ formatado (XX.XXX.XXX/XXXX-XX) se mencionado, null caso contrário
- "segmento": setor ou área de atuação (ex: "Tecnologia", "Saúde", "Varejo", "Indústria")
- "contato_responsavel": nome completo do responsável/signatário/contato principal
- "cargo_responsavel": cargo ou título do responsável (ex: "CEO", "Diretor Comercial", "Gerente de RH")
- "email": endereço de e-mail do contato ou da empresa
- "telefone": telefone formatado com DDD (ex: "(11) 98765-4321")
- "observacoes": informações relevantes não capturadas nos outros campos — pode incluir
  data do contrato, valor, prazo, escopo resumido, número do documento, etc.
  Máximo 2-3 frases, apenas o que for realmente útil para um CRM.

Regras:
- Retorne APENAS o JSON puro, sem markdown nem blocos de código
- Mantenha somente fatos presentes no documento — nunca invente
- Se o documento não parecer ser de uma empresa específica, use null em "nome_empresa"`,
          } as Anthropic.TextBlockParam,
        ],
      }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

    if (!rawText) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto deste PDF.' },
        { status: 422 },
      )
    }

    let parsed: Partial<EmpresaData> | null = null
    try {
      const stripped = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : stripped) as Partial<EmpresaData>
    } catch {
      parsed = { observacoes: rawText.slice(0, 300) }
    }

    const str = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : null

    return NextResponse.json({
      nome_empresa:        str(parsed?.nome_empresa),
      cnpj:                str(parsed?.cnpj),
      segmento:            str(parsed?.segmento),
      contato_responsavel: str(parsed?.contato_responsavel),
      cargo_responsavel:   str(parsed?.cargo_responsavel),
      email:               str(parsed?.email),
      telefone:            str(parsed?.telefone),
      observacoes:         str(parsed?.observacoes),
    } satisfies EmpresaData)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao processar o PDF'
    console.error('[crm/extrair-pdf]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
