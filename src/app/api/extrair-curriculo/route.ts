import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/extrair-curriculo
   Content-Type: multipart/form-data  —  campo: curriculo (File PDF)

   Retorna:
   {
     nome, email, telefone, cidade, estado, cargo, resumo,
     experiencias: [{empresa, cargo, periodo_inicio, periodo_fim, descricao}],
     formacao:     [{instituicao, curso, nivel, periodo_inicio, periodo_fim}],
     habilidades:  string[],
     idiomas:      string[],
     cnh:          string | null,
     curriculo:    string   ← texto formatado completo para indexação/IA
   }
   (qualquer campo pode ser null / [] quando não encontrado no PDF)
───────────────────────────────────────────────────────────────────────── */

type Experiencia = {
  empresa: string
  cargo: string
  periodo_inicio: string
  periodo_fim: string
  descricao: string
}

type FormacaoItem = {
  instituicao: string
  curso: string
  nivel: string
  periodo_inicio: string
  periodo_fim: string
}

type PdfData = {
  nome: string | null
  email: string | null
  telefone: string | null
  cidade: string | null
  estado: string | null
  cargo: string | null
  resumo: string | null
  experiencias: Experiencia[]
  formacao: FormacaoItem[]
  habilidades: string[]
  idiomas: string[]
  cnh: string | null
  curriculo: string
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

  const pdfFile = formData.get('curriculo') as File | null

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
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: `Analise este currículo em PDF e retorne um objeto JSON puro com todos os campos abaixo.
Use null para campos não encontrados e arrays vazios [] para listas sem informação.

Retorne APENAS este JSON, sem markdown, sem blocos de código, sem texto antes ou depois:

{
  "nome": null,
  "email": null,
  "telefone": null,
  "cidade": null,
  "estado": null,
  "cargo": null,
  "resumo": null,
  "experiencias": [],
  "formacao": [],
  "habilidades": [],
  "idiomas": [],
  "cnh": null,
  "curriculo": ""
}

Instruções por campo:
- "nome": nome completo do candidato
- "email": endereço de e-mail
- "telefone": número com DDD (ex: "(11) 99999-9999")
- "cidade": cidade de residência
- "estado": sigla do estado (ex: SP, RJ, MG)
- "cargo": cargo pretendido ou último cargo exercido
- "resumo": 2 a 4 frases descrevendo o perfil profissional
- "experiencias": array de objetos com:
    "empresa" (nome da empresa),
    "cargo" (cargo exercido),
    "periodo_inicio" (ex: "Jan/2020" ou "2020"),
    "periodo_fim" (ex: "Mar/2023" ou "Atual"),
    "descricao" (2-4 frases com responsabilidades e realizações)
- "formacao": array de objetos com:
    "instituicao" (nome da instituição),
    "curso" (nome do curso),
    "nivel" (ex: Graduação, Pós-graduação, Técnico, MBA, Doutorado),
    "periodo_inicio" (ano),
    "periodo_fim" (ano ou "Em andamento")
- "habilidades": array de strings — tecnologias, ferramentas, competências técnicas e soft skills
- "idiomas": array de strings (ex: "Inglês (Avançado)", "Espanhol (Básico)")
- "cnh": categoria da CNH se mencionada (ex: "B", "AB", "D") — null se não mencionado
- "curriculo": texto completo e formatado do currículo inteiro, organizado nas seções abaixo
  (inclua apenas as que existirem no PDF; seja detalhado pois este campo é usado pela IA para triagem):

RESUMO PROFISSIONAL
[texto]

EXPERIÊNCIAS PROFISSIONAIS
[para cada empresa: cargo, período, principais atividades e realizações]

FORMAÇÃO ACADÊMICA
[instituição, curso, nível, período]

HABILIDADES TÉCNICAS
[lista de habilidades]

CERTIFICAÇÕES E CURSOS
[nome, instituição, ano — se houver]

Regras obrigatórias:
- Retorne APENAS o JSON puro, sem markdown nem blocos de código
- Mantenha somente fatos reais presentes no documento — nunca invente informações`,
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

    // Parse JSON com segurança — remove fences de markdown e extrai o objeto {}
    let parsed: Partial<PdfData> | null = null
    try {
      const stripped = rawText
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/i, '')
        .trim()
      const match = stripped.match(/\{[\s\S]*\}/)
      parsed = JSON.parse(match ? match[0] : stripped) as Partial<PdfData>
    } catch {
      parsed = { curriculo: rawText }
    }

    const curriculo = parsed?.curriculo?.trim() ?? ''
    if (!curriculo) {
      return NextResponse.json(
        { error: 'Não foi possível extrair texto deste PDF. Verifique se o arquivo não está protegido ou corrompido.' },
        { status: 422 },
      )
    }

    const str = (v: unknown) =>
      typeof v === 'string' && v.trim() ? v.trim() : null

    const strArr = (v: unknown): string[] =>
      Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim().length > 0) : []

    const expArr = (v: unknown): Experiencia[] => {
      if (!Array.isArray(v)) return []
      return v.filter(Boolean).map((item) => {
        const e = item as Record<string, unknown>
        return {
          empresa:        str(e.empresa)        ?? '',
          cargo:          str(e.cargo)           ?? '',
          periodo_inicio: str(e.periodo_inicio)  ?? '',
          periodo_fim:    str(e.periodo_fim)     ?? '',
          descricao:      str(e.descricao)       ?? '',
        }
      })
    }

    const formArr = (v: unknown): FormacaoItem[] => {
      if (!Array.isArray(v)) return []
      return v.filter(Boolean).map((item) => {
        const f = item as Record<string, unknown>
        return {
          instituicao:    str(f.instituicao)    ?? '',
          curso:          str(f.curso)          ?? '',
          nivel:          str(f.nivel)          ?? '',
          periodo_inicio: str(f.periodo_inicio) ?? '',
          periodo_fim:    str(f.periodo_fim)    ?? '',
        }
      })
    }

    const result: PdfData = {
      nome:         str(parsed?.nome),
      email:        str(parsed?.email),
      telefone:     str(parsed?.telefone),
      cidade:       str(parsed?.cidade),
      estado:       str(parsed?.estado),
      cargo:        str(parsed?.cargo),
      resumo:       str(parsed?.resumo),
      experiencias: expArr(parsed?.experiencias),
      formacao:     formArr(parsed?.formacao),
      habilidades:  strArr(parsed?.habilidades),
      idiomas:      strArr(parsed?.idiomas),
      cnh:          str(parsed?.cnh),
      curriculo,
    }

    return NextResponse.json(result)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno ao processar o PDF'
    console.error('[extrair-curriculo]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
