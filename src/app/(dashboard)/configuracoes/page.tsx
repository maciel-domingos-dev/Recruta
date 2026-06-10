'use client'

import { useState } from 'react'
import { Settings, Building2, Bell, Lock, Users, Palette, Save } from 'lucide-react'

const tabs = [
  { id: 'empresa',        label: 'Empresa',        icon: Building2 },
  { id: 'notificacoes',   label: 'Notificações',   icon: Bell },
  { id: 'seguranca',      label: 'Segurança',      icon: Lock },
  { id: 'equipe',         label: 'Equipe',         icon: Users },
  { id: 'personalizacao', label: 'Personalização', icon: Palette },
]

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('empresa')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerencie as preferências da sua conta</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar de tabs */}
        <div className="md:w-52 flex-shrink-0">
          <nav className="space-y-0.5">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left ${
                  activeTab === id
                    ? 'bg-[#e8f0f9] text-[#185FA5]'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 min-w-0">
          {activeTab === 'empresa' && (
            <div className="card space-y-5">
              <h2 className="text-base font-semibold text-gray-900">Dados da Empresa</h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da empresa</label>
                  <input type="text" defaultValue="Recruta Ltda" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">CNPJ</label>
                  <input type="text" defaultValue="12.345.678/0001-90" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail corporativo</label>
                  <input type="email" defaultValue="contato@recruta.com.br" className="input" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
                  <input type="tel" defaultValue="(11) 3333-0000" className="input" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Site</label>
                <input type="url" defaultValue="https://recruta.com.br" className="input" />
              </div>

              <div className="pt-2">
                <button className="btn-primary flex items-center gap-2">
                  <Save size={15} />
                  Salvar alterações
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notificacoes' && (
            <div className="card space-y-5">
              <h2 className="text-base font-semibold text-gray-900">Notificações</h2>
              {[
                { label: 'Novo candidato na vaga', desc: 'Receba um e-mail quando um candidato se inscrever' },
                { label: 'Candidato avançou de etapa', desc: 'Notificação ao avançar candidato no pipeline' },
                { label: 'Entrevista agendada', desc: 'Lembrete 1h antes de cada entrevista' },
                { label: 'Relatório semanal', desc: 'Resumo de atividades toda segunda-feira' },
              ].map(({ label, desc }) => (
                <div key={label} className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                    <input type="checkbox" defaultChecked className="sr-only peer" />
                    <div className="w-10 h-5 bg-gray-200 peer-focus:ring-2 peer-focus:ring-[#185FA5] rounded-full peer peer-checked:after:translate-x-5 peer-checked:bg-[#185FA5] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </label>
                </div>
              ))}
            </div>
          )}

          {activeTab !== 'empresa' && activeTab !== 'notificacoes' && (
            <div className="card flex flex-col items-center justify-center py-16 text-center">
              <Settings size={32} className="text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">
                Configurações de <strong>{tabs.find(t => t.id === activeTab)?.label}</strong> em breve
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
