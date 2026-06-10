import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey || apiKey === 'sk-ant-') {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY não configurado. Adicione sua chave no .env.local' },
      { status: 500 },
    )
  }

  const anthropic = new Anthropic({ apiKey })
  const { vaga, candidatos } = await request.json()

  type CandidatoInput = { nome: string; cargo: string | null; curriculo: string | null }

  // Bug corrigido: curriculo agora aparece em bloco próprio e destacado no prompt,
  // garantindo que o Claude use o perfil real do candidato na análise.
  const candidatosText = (candidatos as CandidatoInput[])
    .map(c => {
      const curriculoBloco = c.curriculo
        ? c.curriculo.trim()
        : 'Sem currículo disponível — avalie apenas com base no nome e cargo informados.'

      return `=== CANDIDATO: ${c.nome} ===
Cargo / Função: ${c.cargo ?? 'Não informado'}

CURRÍCULO / PERFIL PROFISSIONAL:
${curriculoBloco}`
    })
    .join('\n\n' + '─'.repeat(60) + '\n\n')

  const prompt = `Você é um especialista em recrutamento e seleção com 15 anos de experiência.
Analise cada candidato abaixo comparando seu perfil real (currículo) com os requisitos da vaga.
Baseie a pontuação (score) e recomendação PRINCIPALMENTE no currículo fornecido.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VAGA: ${vaga.titulo}
REQUISITOS: ${vaga.requisitos || 'Não especificados'}
DIFERENCIAIS DESEJADOS: ${vaga.diferenciais || 'Não especificados'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CANDIDATOS PARA ANÁLISE:
${candidatosText}

Retorne EXATAMENTE este JSON válido (sem markdown, sem texto antes ou depois):
{
  "analises": [
    {
      "nome": "nome exato do candidato",
      "score": 85,
      "recomendacao": "APROVADO",
      "pontos_fortes": ["ponto 1 baseado no currículo", "ponto 2", "ponto 3"],
      "pontos_atencao": ["lacuna ou risco identificado no perfil"],
      "resumo": "2-3 frases objetivas comparando o perfil do candidato com os requisitos da vaga."
    }
  ]
}

Regras obrigatórias:
- score: 0–100 (baseado na aderência currículo × requisitos da vaga)
- recomendacao: "APROVADO", "EM_ANÁLISE" ou "REPROVADO"
- Se o candidato não tem currículo, score máximo 40 e mencione a ausência no resumo
- Analise cada candidato individualmente com base no seu perfil real`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : '{}'

    try {
      return NextResponse.json(JSON.parse(text))
    } catch {
      const match = text.match(/\{[\s\S]*\}/)
      if (match) return NextResponse.json(JSON.parse(match[0]))
      return NextResponse.json({ error: 'Resposta da IA em formato inesperado', raw: text }, { status: 500 })
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
