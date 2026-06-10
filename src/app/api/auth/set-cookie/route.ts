import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { access_token, refresh_token } = await request.json()

  if (!access_token) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
  }

  const isProd = process.env.NODE_ENV === 'production'
  const res = NextResponse.json({ success: true })

  res.cookies.set('sb-access-token', access_token, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60, // 1 hora
    sameSite: 'lax',
    secure: isProd,
  })

  if (refresh_token) {
    res.cookies.set('sb-refresh-token', refresh_token, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 dias
      sameSite: 'lax',
      secure: isProd,
    })
  }

  return res
}
