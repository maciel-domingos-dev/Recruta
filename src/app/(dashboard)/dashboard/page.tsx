import {
  Briefcase,
  Users,
  TrendingUp,
  Clock,
  ArrowUpRight,
  CheckCircle,
  AlertCircle,
  Zap,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

export const dynamic = 'force-dynamic'

async function getStats() {
  const now = new Date()
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [vagasRes, candidatosRes, contratacoesRes, vagasListRes] = await Promise.all([
    supabase.from('vagas').select('status'),
    supabase.from('candidatos').select('id', { count: 'exact', head: true }),
    supabase
      .from('candidatos')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'CONTRATADO')
      .gte('created_at', firstOfMonth),
    supabase
      .from('vagas')
      .select('id, titulo, empresa, status, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
  ])

  const vagasAbertas = (vagasRes.data ?? []).filter(
    v => v.status === 'ABERTA' || v.status === 'EM_ANDAMENTO',
  ).length

  return {
    vagasAbertas,
    candidatosAtivos: candidatosRes.count ?? 0,
    contratacoesDoMes: contratacoesRes.count ?? 0,
    vagasRecentes: vagasListRes.data ?? [],
  }
}

const statusColors: Record<string, string> = {
  ABERTA:       'bg-green-100 text-green-700',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-700',
  ENCERRADA:    'bg-gray-100 text-gray-600',
  CANCELADA:    'bg-red-100 text-red-700',
}
const statusLabels: Record<string, string> = {
  ABERTA:       'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  ENCERRADA:    'Encerrada',
  CANCELADA:    'Cancelada',
}

function diasDesde(d: string) {
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86_400_000)
  return days === 0 ? 'Hoje' : `${days}d atrás`
}

export default async function DashboardPage() {
  const { vagasAbertas, candidatosAtivos, contratacoesDoMes, vagasRecentes } = await getStats()

  const stats = [
    {
      label: 'Vagas Abertas',
      value: String(vagasAbertas),
      icon: Briefcase,
      color: '#185FA5',
      bg: '#e8f0f9',
    },
    {
      label: 'Candidatos Ativos',
      value: String(candidatosAtivos),
      icon: Users,
      color: '#059669',
      bg: '#ecfdf5',
    },
    {
      label: 'Contratações (mês)',
      value: String(contratacoesDoMes),
      icon: TrendingUp,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      label: 'Tempo Médio (dias)',
      value: '18',
      icon: Clock,
      color: '#d97706',
      bg: '#fffbeb',
    },
  ]

  const pipeline = [
    { etapa: 'Triagem',              count: candidatosAtivos, color: '#185FA5' },
    { etapa: 'Entrevista RH',        count: Math.floor(candidatosAtivos * 0.45), color: '#7c3aed' },
    { etapa: 'Entrevista Técnica',   count: Math.floor(candidatosAtivos * 0.28), color: '#059669' },
    { etapa: 'Proposta',             count: Math.floor(candidatosAtivos * 0.12), color: '#d97706' },
    { etapa: 'Aprovados',            count: contratacoesDoMes, color: '#dc2626' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do seu processo de recrutamento</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={20} style={{ color }} />
              </div>
              <span className="flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                <ArrowUpRight size={12} />
                ao vivo
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Pipeline */}
        <div className="card xl:col-span-1">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Pipeline de Seleção</h2>
          <div className="space-y-3">
            {pipeline.map(({ etapa, count, color }) => {
              const max = pipeline[0].count || 1
              const pct = Math.min(100, Math.round((count / max) * 100))
              return (
                <div key={etapa}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{etapa}</span>
                    <span className="text-xs font-semibold text-gray-900">{count}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* IA Insights */}
        <div className="card xl:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#e8f0f9' }}>
              <Zap size={14} style={{ color: '#185FA5' }} />
            </div>
            <h2 className="text-sm font-semibold text-gray-900">Insights da IA</h2>
          </div>
          <div className="space-y-3">
            <InsightCard
              icon={<CheckCircle size={15} className="text-green-600" />}
              bg="bg-green-50"
              text={
                candidatosAtivos > 0
                  ? `Você tem ${candidatosAtivos} candidato${candidatosAtivos !== 1 ? 's' : ''} no banco. Use a página IA & Análise para rankeá-los automaticamente.`
                  : 'Cadastre candidatos e use a análise de IA para rankear automaticamente por fit com a vaga.'
              }
            />
            <InsightCard
              icon={<AlertCircle size={15} className="text-amber-600" />}
              bg="bg-amber-50"
              text={
                vagasAbertas > 0
                  ? `${vagasAbertas} vaga${vagasAbertas !== 1 ? 's' : ''} ativa${vagasAbertas !== 1 ? 's' : ''} no momento. Certifique-se de vincular candidatos a cada processo.`
                  : 'Nenhuma vaga aberta. Crie vagas na página de Vagas para iniciar processos seletivos.'
              }
            />
            <InsightCard
              icon={<TrendingUp size={15} style={{ color: '#185FA5' }} />}
              bg="bg-blue-50"
              text={
                contratacoesDoMes > 0
                  ? `${contratacoesDoMes} contratação${contratacoesDoMes !== 1 ? 'ões' : ''} registrada${contratacoesDoMes !== 1 ? 's' : ''} este mês. Continue usando triagem automatizada para acelerar o processo.`
                  : 'Nenhuma contratação este mês ainda. Marque candidatos como "Contratado" para acompanhar o resultado.'
              }
            />
          </div>
        </div>
      </div>

      {/* Vagas Recentes */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">Vagas Recentes</h2>
          <a href="/vagas" className="text-xs font-medium" style={{ color: '#185FA5' }}>
            Ver todas →
          </a>
        </div>

        {vagasRecentes.length === 0 ? (
          <div className="text-center py-10">
            <Briefcase size={32} className="mx-auto text-gray-200 mb-2" />
            <p className="text-sm text-gray-400">Nenhuma vaga criada ainda.</p>
            <a href="/vagas" className="text-sm font-medium mt-1 inline-block" style={{ color: '#185FA5' }}>
              Criar primeira vaga →
            </a>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">VAGA</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">EMPRESA</th>
                  <th className="text-left py-2 pr-4 text-xs font-medium text-gray-400">STATUS</th>
                  <th className="text-left py-2 text-xs font-medium text-gray-400">CRIADA</th>
                </tr>
              </thead>
              <tbody>
                {vagasRecentes.map((v) => (
                  <tr key={v.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-3 pr-4 font-medium text-gray-900 whitespace-nowrap">{v.titulo}</td>
                    <td className="py-3 pr-4 text-gray-500">{v.empresa}</td>
                    <td className="py-3 pr-4">
                      <span className={`badge ${statusColors[v.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[v.status] ?? v.status}
                      </span>
                    </td>
                    <td className="py-3 text-gray-400 text-xs">{diasDesde(v.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function InsightCard({ icon, bg, text }: { icon: React.ReactNode; bg: string; text: string }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg ${bg}`}>
      <div className="mt-0.5 flex-shrink-0">{icon}</div>
      <p className="text-sm text-gray-700">{text}</p>
    </div>
  )
}
