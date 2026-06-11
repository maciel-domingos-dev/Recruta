'use client'

import { useState } from 'react'
import { Eye, EyeOff, Loader2, Users, Brain, BarChart3, CheckCircle } from 'lucide-react'

const features = [
  { icon: Users,       text: 'Gestão completa de candidatos' },
  { icon: Brain,       text: 'Análise de currículos com IA' },
  { icon: BarChart3,   text: 'Relatórios e ranking em tempo real' },
  { icon: CheckCircle, text: 'Pipeline visual de seleção' },
]

export default function LoginPage() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/token?grant_type=password`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        },
        body: JSON.stringify({ email, password }),
      }
    )

    const data = await res.json()

    if (data.access_token) {
      document.cookie = `sb-access-token=${data.access_token}; path=/; max-age=3600`
      window.location.href = '/dashboard'
    } else {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ─── Painel esquerdo – brand ──────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #185FA5 0%, #0d4070 100%)' }}
      >
        <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-10 -left-16 w-56 h-56 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/2 right-0  w-32 h-32 rounded-full opacity-5  bg-white" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur">
              <span className="text-white font-black text-lg">R</span>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Recruta</span>
          </div>
        </div>

        {/* Texto central */}
        <div className="relative z-10">
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            O ATS mais inteligente<br />
            para o RH brasileiro
          </h1>
          <p className="text-blue-200 text-lg mb-10">
            Automatize seu processo seletivo com inteligência artificial e contrate os melhores talentos mais rápido.
          </p>

          <div className="space-y-4">
            {features.map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={16} className="text-white" />
                </div>
                <span className="text-blue-100 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-blue-300 text-sm">© 2026 ATS Recruta. Todos os direitos reservados.</p>
        </div>
      </div>

      {/* ─── Painel direito – formulário ─────────────────────────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          {/* Logo mobile */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#185FA5' }}
            >
              <span className="text-white font-black text-lg">R</span>
            </div>
            <span className="font-bold text-2xl text-gray-900">Recruta</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Bem-vindo de volta</h2>
            <p className="text-gray-500 text-sm">Entre na sua conta para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold leading-none">!</span>
                </div>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-6">
            Não tem uma conta?{' '}
            <a href="#" className="font-medium hover:underline" style={{ color: '#185FA5' }}>
              Fale com nossa equipe
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
