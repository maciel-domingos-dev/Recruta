import { NextResponse } from 'next/server'

/* ─────────────────────────────────────────────────────────────────────────
   GET /api/crm/buscar-cnpj?cnpj=00000000000000
   Proxies a consulta pública da Receita Federal (publica.cnpj.ws).
   Sem autenticação, gratuita, limite ~3 req/min por IP.
───────────────────────────────────────────────────────────────────────── */

function validarCnpj(cnpj: string): boolean {
  if (cnpj.length !== 14) return false
  if (/^(\d)\1+$/.test(cnpj)) return false // todos dígitos iguais

  function calc(cnpj: string, pos: number) {
    let sum = 0
    let weight = pos
    for (let i = 0; i < pos - 1; i++) {
      sum += parseInt(cnpj[i]) * weight--
      if (weight < 2) weight = 9
    }
    const rem = sum % 11
    return rem < 2 ? 0 : 11 - rem
  }

  return (
    calc(cnpj, 13) === parseInt(cnpj[12]) &&
    calc(cnpj, 14) === parseInt(cnpj[13])
  )
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const cnpjRaw = searchParams.get('cnpj') ?? ''
  const cnpj    = cnpjRaw.replace(/\D/g, '')

  if (cnpj.length !== 14) {
    return NextResponse.json({ error: 'CNPJ deve ter 14 dígitos.' }, { status: 400 })
  }
  if (!validarCnpj(cnpj)) {
    return NextResponse.json({ error: 'CNPJ inválido — verifique os dígitos.' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${cnpj}`, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'Recruta-ATS/1.0',
      },
      cache: 'no-store',
    })

    if (res.status === 404) {
      return NextResponse.json(
        { error: 'CNPJ não encontrado na Receita Federal.' },
        { status: 404 },
      )
    }
    if (res.status === 429) {
      return NextResponse.json(
        { error: 'Limite de consultas atingido. Aguarde alguns segundos e tente novamente.' },
        { status: 429 },
      )
    }
    if (!res.ok) {
      return NextResponse.json(
        { error: `Receita Federal retornou erro ${res.status}. Tente novamente.` },
        { status: 502 },
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = await res.json() as Record<string, any>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const est = (raw.estabelecimento ?? {}) as Record<string, any>

    const ddd   = (est.ddd1 as string | null)?.trim() ?? ''
    const fone  = (est.telefone1 as string | null)?.trim() ?? ''
    const telefoneFormatado = ddd && fone ? `(${ddd}) ${fone}` : null

    const partes: string[] = []
    if (est.tipo_logradouro) partes.push(est.tipo_logradouro as string)
    if (est.logradouro) partes.push(est.logradouro as string)
    if (est.numero) partes.push(est.numero as string)
    if (est.complemento) partes.push(est.complemento as string)
    if (est.bairro) partes.push(`— ${est.bairro as string}`)
    if (est.cidade?.nome) partes.push(`— ${est.cidade.nome as string}`)
    if (est.estado?.sigla) partes.push(`/${est.estado.sigla as string}`)
    if (est.cep) partes.push(`| CEP ${(est.cep as string).replace(/(\d{5})(\d{3})/, '$1-$2')}`)
    const endereco = partes.length > 0 ? partes.join(' ') : null

    const cnpjFormatado = cnpj.replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5',
    )

    return NextResponse.json({
      razao_social:  (raw.razao_social as string | null)?.trim() ?? null,
      nome_fantasia: (est.nome_fantasia as string | null)?.trim() || null,
      cnpj:          cnpjFormatado,
      situacao:      (est.situacao_cadastral as string | null)?.trim() ?? 'DESCONHECIDA',
      atividade:     (est.atividade_principal?.descricao as string | null)?.trim() ?? null,
      endereco,
      telefone:      telefoneFormatado,
      email:         (est.email as string | null)?.trim().toLowerCase() || null,
    })
  } catch (err) {
    console.error('[crm/buscar-cnpj]', err)
    return NextResponse.json(
      { error: 'Não foi possível conectar à Receita Federal. Verifique sua conexão.' },
      { status: 502 },
    )
  }
}
