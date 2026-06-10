'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Search, Building2, Mail, Trash2, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Cliente = {
  id: string
  empresa: string
  contato_nome: string | null
  contato_email: string | null
  vagas_ativas: number
  receita: number
  status: string
  created_at: string
}

type FormState = {
  empresa: string
  contato_nome: string
  contato_email: string
  vagas_ativas: string
  receita: string
  status: string
}

const EMPTY_FORM: FormState = {
  empresa: '',
  contato_nome: '',
  contato_email: '',
  vagas_ativas: '0',
  receita: '0',
  status: 'PROSPECT',
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  PROSPECT: { label: 'Prospect', cls: 'bg-amber-100 text-amber-700' },
  ATIVO:    { label: 'Ativo',    cls: 'bg-green-100 text-green-700' },
  CONTRATO: { label: 'Contrato', cls: 'bg-blue-100 text-blue-700' },
  INATIVO:  { label: 'Inativo',  cls: 'bg-gray-100 text-gray-600' },
}

function brl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
}

export default function CrmComercialPage() {
  const [clientes, setClientes]   = useState<Cliente[]>([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')
  const [search, setSearch]       = useState('')
  const [statusFilter, setStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [form, setForm]           = useState<FormState>(EMPTY_FORM)

  const fetchClientes = useCallback(async () => {
    setLoading(true)
    setError('')
    let query = supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (statusFilter) query = query.eq('status', statusFilter)
    if (search.trim()) query = query.ilike('empresa', `%${search.trim()}%`)
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setClientes(data ?? [])
    setLoading(false)
  }, [search, statusFilter])

  useEffect(() => { fetchClientes() }, [fetchClientes])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      empresa: form.empresa,
      contato_nome: form.contato_nome || null,
      contato_email: form.contato_email || null,
      vagas_ativas: parseInt(form.vagas_ativas) || 0,
      receita: parseFloat(form.receita) || 0,
      status: form.status,
    }
    const { error: err } = await supabase.from('clientes').insert([payload])
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    fetchClientes()
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id', id)
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  // KPIs
  const ativos    = clientes.filter(c => c.status === 'ATIVO').length
  const prospects = clientes.filter(c => c.status === 'PROSPECT').length
  const vagasTotal = clientes.reduce((s, c) => s + (c.vagas_ativas ?? 0), 0)
  const mrr       = clientes.filter(c => c.status === 'ATIVO' || c.status === 'CONTRATO')
                             .reduce((s, c) => s + Number(c.receita ?? 0), 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Comercial</h1>
          <p className="text-gray-500 text-sm mt-1">Gestão de clientes e oportunidades comerciais</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Novo cliente
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Erro: {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: 'Clientes Ativos',    value: String(ativos),            color: '#185FA5' },
          { label: 'Prospects',         value: String(prospects),         color: '#d97706' },
          { label: 'Vagas no Pipeline', value: String(vagasTotal),        color: '#7c3aed' },
          { label: 'Receita Total',     value: mrr > 0 ? brl(mrr) : '—', color: '#059669' },
        ].map(({ label, value, color }) => (
          <div key={label} className="card text-center">
            <p className="text-2xl font-bold" style={{ color }}>{value}</p>
            <p className="text-xs text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por empresa..."
              className="input pl-9"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          <select
            className="input sm:w-40"
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
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
      {!loading && clientes.length === 0 && !error && (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#e8f0f9' }}>
            <Building2 size={26} style={{ color: '#185FA5' }} />
          </div>
          <p className="font-semibold text-gray-900">Nenhum cliente encontrado</p>
          <p className="text-sm text-gray-400 mt-1 mb-5">
            {search || statusFilter ? 'Tente ajustar os filtros.' : 'Cadastre seu primeiro cliente.'}
          </p>
          {!search && !statusFilter && (
            <button onClick={() => setModalOpen(true)} className="btn-primary inline-flex items-center gap-2">
              <Plus size={15} />
              Novo cliente
            </button>
          )}
        </div>
      )}

      {/* Tabela */}
      {!loading && clientes.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-medium text-gray-400">EMPRESA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">CONTATO</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">VAGAS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">RECEITA</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400">STATUS</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-400"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientes.map((c) => {
                  const sc = statusConfig[c.status] ?? { label: c.status, cls: 'bg-gray-100 text-gray-600' }
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-[#e8f0f9] flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} style={{ color: '#185FA5' }} />
                          </div>
                          <span className="font-medium text-gray-900">{c.empresa}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        {c.contato_nome && (
                          <p className="font-medium text-gray-700 text-sm">{c.contato_nome}</p>
                        )}
                        {c.contato_email && (
                          <p className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                            <Mail size={10} />
                            {c.contato_email}
                          </p>
                        )}
                        {!c.contato_nome && !c.contato_email && (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-gray-600 text-sm">
                        {c.vagas_ativas ?? 0} vaga{(c.vagas_ativas ?? 0) !== 1 ? 's' : ''}
                      </td>
                      <td className="px-4 py-4 font-semibold text-gray-800 text-sm">
                        {Number(c.receita) > 0 ? brl(Number(c.receita)) : '—'}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge ${sc.cls}`}>{sc.label}</span>
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

      {/* Modal novo cliente */}
      {modalOpen && (
        <>
          <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => setModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Novo Cliente</h2>
                <button onClick={() => setModalOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Empresa <span className="text-red-500">*</span>
                  </label>
                  <input className="input" placeholder="Nome da empresa" value={form.empresa} onChange={e => setForm(f => ({ ...f, empresa: e.target.value }))} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do contato</label>
                    <input className="input" placeholder="Ex: João Silva" value={form.contato_nome} onChange={e => setForm(f => ({ ...f, contato_nome: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail do contato</label>
                    <input className="input" type="email" placeholder="contato@empresa.com" value={form.contato_email} onChange={e => setForm(f => ({ ...f, contato_email: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Vagas ativas</label>
                    <input className="input" type="number" min="0" placeholder="0" value={form.vagas_ativas} onChange={e => setForm(f => ({ ...f, vagas_ativas: e.target.value }))} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Receita (R$)</label>
                    <input className="input" type="number" min="0" step="100" placeholder="0" value={form.receita} onChange={e => setForm(f => ({ ...f, receita: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Status</label>
                  <select className="input" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="PROSPECT">Prospect</option>
                    <option value="ATIVO">Ativo</option>
                    <option value="CONTRATO">Contrato assinado</option>
                    <option value="INATIVO">Inativo</option>
                  </select>
                </div>
                {error && <p className="text-sm text-red-600">{error}</p>}
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    {saving ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : 'Cadastrar cliente'}
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
