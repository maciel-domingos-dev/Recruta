import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login', '/candidatar']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const res = NextResponse.next()

  // Rotas públicas e raiz — passa sem verificar sessão
  if (
    pathname === '/' ||
    pathname.startsWith('/api/') ||
    PUBLIC_PATHS.some(p => pathname.startsWith(p))
  ) {
    return res
  }

  // Verifica sessão via Supabase Auth (lê/atualiza cookies automaticamente)
  const supabase = createMiddlewareClient({ req: request, res })
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return res
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
