'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, CheckCircle, Clock, AlertCircle,
  Loader2, X, Trash2, CreditCard,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Cobranca = {
  id: string
  descricao: string
  valor: number
  status: string
  vencimento: string | null
  created_at: string
}

type FormState = {
  descricao: string
  valor: string
  status: string
  vencimento: string
}

const EMPTY_FORM: FormState = { descricao: '', valor: '', status: 'PENDENTE', vencimento: '' }

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  PAGO:     { label: 'Pago',     cls: 'bg-green-100 text-green-700', icon: <CheckCircle size={12} /> },
  PENDENTE: { label: 'Pendente', cls: 'bg-amber-100 text-amber-700', icon: <Clock size={12} /> },
  VENCIDO:  { label: 'Vencido',  cls: 'bg-red-100 text-red-700',    icon: <AlertCircle size={12} /> },
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

export default function CobrancasPage() {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [statusFilter, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)

  const fetchCobrancas = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase.from('cobrancas').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setCobrancas(data ?? [])
    setLoading(false)
  }, [statusFilter])

  useEffect(() => { fetchCobrancas() }, [fetchCobrancas])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      descricao: form.descricao,
      valor: parseFloat(form.valor),
      status: form.status,
      vencimento: form.vencimento || null,
    }
    const { error: err } = await supabase.from('cobrancas').insert([payload])
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    fetchCobrancas()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta cobrança?')) return
    await supabase.from('cobrancas').delete().eq('id', id)
    setCobrancas(prev => prev.filter(c => c.id !== id))
  }

  // KPIs
  const totalPago     = cobrancas.filter(c => c.status === 'PAGO').reduce((s, c) => s + Number(c.valor), 0)
  const totalPendente = cobrancas.filter(c => c.status === 'PENDENTE').reduce((s, c) => s + Number(c.valor), 0)
  const totalVencido  = cobrancas.filter(c => c.status === 'VENCIDO').reduce((s, c) => s + Number(c.valor), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cobranças</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão financeira e faturas</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nova cobrança
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro: {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: '#059669' }}>
            {totalPago > 0 ? brl(totalPago) : 'R$ 0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Recebido</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: '#d97706' }}>
            {totalPendente > 0 ? brl(totalPendente) : 'R$ 0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Pendente</p>
        </div>
        <div className="card text-center">
          <p className="text-2xl font-bold" style={{ color: '#dc2626' }}>
            {totalVencido > 0 ? brl(totalVencido) : 'R$ 0'}
          </p>
          <p className="text-xs text-gray-500 mt-1">Vencido</p>
        </div>
      </div>

      {/* Filtro de status */}
      <div className="card p-4">
        <div className="flex gap-3">
          <select
            className="input sm:w-44"
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PAGO">Pago</option>
            <option value="VENCIDO">Vencido</option>
          </select>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <Loader2 size={28} className="animate-spin text-[#185FA5]" />
        </div>
      )}

      {/* Empty state */}
      {!loading && cobrancas.length === 0 && !error && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f0f9' }}>
            <CreditCard size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhuma cobrança encontrada</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {statusFilter ? 'Tente remover o filtro de status.' : 'Crie a primeira cobrança agora.'}
          </p>
          {!statusFilter && (
            <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} />
              Nova cobrança
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      {!loading && cobrancas.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">Nº</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">DESCRIÇÃO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">VALOR</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">VENCIMENTO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">STATUS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cobrancas.map((c, idx) => {
                  const sc = statusConfig[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600', icon: null }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-gray-400">
                        #{String(idx + 1).padStart(3, '0')}
                      </td>
                      <td className="px-4 py-4 font-medium text-gray-900">{c.descricao}</td>
                      <td className="px-4 py-4 font-bold text-gray-800">{brl(Number(c.valor))}</td>
                      <td className="px-4 py-4 text-gray-500">{fmtDate(c.vencimento)}</td>
                      <td className="px-4 py-4">
                        <span className={`badge flex items-center gap-1 w-fit ${sc.cls}`}>
                          {sc.icon} {sc.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal nova cobrança */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Nova Cobrança</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Descrição <span className="text-red-500">*</span>
                  </label>
                  <input className="input" placeholder="Ex: Serviço de recrutamento – TechCorp" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Valor (R$) <span className="text-red-500">*</span>
                    </label>
                    <input className="input" type="number" min="0" step="0.01" placeholder="0,00" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vencimento</label>
                    <input className="input" type="date" value={form.vencimento} onChange={e => setForm(f => ({ ...f, vencimento: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="PENDENTE">Pendente</option>
                    <option value="PAGO">Pago</option>
                    <option value="VENCIDO">Vencido</option>
                  </select>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Criar cobrança'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
