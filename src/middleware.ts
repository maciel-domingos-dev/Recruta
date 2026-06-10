import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('sb-access-token')?.value

  // Usuário autenticado acessando páginas públicas → redireciona para dashboard
  if (token && (pathname === '/' || pathname.startsWith('/login'))) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Rotas de API são sempre públicas
  if (pathname.startsWith('/api/')) {
    return NextResponse.next()
  }

  // Página pública de candidatura
  if (pathname.startsWith('/candidatar')) {
    return NextResponse.next()
  }

  // Demais rotas exigem autenticação
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
