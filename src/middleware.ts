import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = [
  '/login',
  '/candidatar',
  '/api/auth/set-cookie',
  '/api/auth/logout',
  '/api/dev-login',
]

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas sempre públicas — passa sem verificar autenticação
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Rota raiz → deixa o server component fazer o redirect para /login
  if (pathname === '/') {
    return NextResponse.next()
  }

  // Rotas protegidas — exige cookie de sessão
  const token = request.cookies.get('sb-access-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
