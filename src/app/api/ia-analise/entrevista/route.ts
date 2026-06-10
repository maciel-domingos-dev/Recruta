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
  const { candidato, vaga, transcricao } = await request.json()

  const prompt = `Você é um psicólogo organizacional especializado em avaliação de candidatos. Analise a transcrição da entrevista abaixo e produza um relatório detalhado.

CANDIDATO: ${candidato.nome}${candidato.cargo ? ` — ${candidato.cargo}` : ''}
VAGA: ${vaga || 'Não especificada'}

TRANSCRIÇÃO DA ENTREVISTA:
${transcricao}

Retorne EXATAMENTE este JSON válido (sem markdown, sem texto antes ou depois):
{
  "score": 80,
  "recomendacao": "APROVADO",
  "analise_comportamental": "Análise de 3-4 frases sobre comportamento, postura, comunicação e fit cultural observados.",
  "pontos_fortes": ["ponto forte 1", "ponto forte 2", "ponto forte 3"],
  "pontos_atencao": ["ponto de atenção 1", "ponto de atenção 2"],
  "resumo": "Resumo executivo em 2-3 frases destacando a principal conclusão e recomendação."
}

Regras: score 0–100. recomendacao: "APROVADO", "EM_ANÁLISE" ou "REPROVADO".`

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
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
