import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/candidatar', '/api/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Raiz e rotas públicas — passa sem verificar sessão
  if (pathname === '/' || PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Rotas protegidas — exige cookie de sessão definido pelo /api/auth/set-cookie
  const token = request.cookies.get('sb-access-token')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
