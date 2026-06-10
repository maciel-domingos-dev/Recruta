import { NextResponse } from 'next/server'

const DEV_EMAIL = 'admin@recruta.com'
const DEV_PASSWORD = 'recruta123'

export async function POST(request: Request) {
  const { email, password } = await request.json()

  if (email === DEV_EMAIL && password === DEV_PASSWORD) {
    const res = NextResponse.json({ success: true })
    res.cookies.set('recruta-dev-session', 'admin', {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24,
      sameSite: 'lax',
    })
    return res
  }

  return NextResponse.json(
    { error: 'E-mail ou senha incorretos. Use admin@recruta.com / recruta123' },
    { status: 401 }
  )
}
