'use client'

import { useEffect, useState } from 'react'
import { X, ArrowRight, Loader2, Clock, History } from 'lucide-react'
import { supabase } from '@/lib/supabase'

type Historico = {
  id: string
  etapa_anterior: string | null
  etapa_nova: string
  data_movimento: string
  observacao: string | null
}

type Props = {
  candidatoId: string
  vagaId: string
  candidatoNome: string
  onClose: () => void
}

const ETAPA_BADGE: Record<string, string> = {
  'Triagem':            'bg-gray-100 text-gray-700',
  'Entrevista RH':      'bg-green-100 text-green-700',
  'Teste Técnico':      'bg-purple-100 text-purple-700',
  'Entrevista Gestor':  'bg-yellow-100 text-yellow-700',
  'Proposta':           'bg-blue-100 text-blue-700',
  'Contratado':         'bg-orange-100 text-orange-700',
  'Reprovado':          'bg-red-100 text-red-700',
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function HistoricoModal({ candidatoId, vagaId, candidatoNome, onClose }: Props) {
  const [historico, setHistorico] = useState<Historico[]>([])
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    supabase
      .from('pipeline_historico')
      .select('*')
      .eq('candidato_id', candidatoId)
      .eq('vaga_id', vagaId)
      .order('data_movimento', { ascending: false })
      .then(({ data }) => {
        setHistorico((data as Historico[]) ?? [])
        setLoading(false)
      })
  }, [candidatoId, vagaId])

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">

          {/* Header */}
          <div
            className="flex items-center justify-between p-5 rounded-t-2xl flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #185FA5, #2d7dd2)' }}
          >
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History size={15} /> Histórico de Movimentações
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">{candidatoNome}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors">
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5">
            {loading && (
              <div className="flex justify-center py-10">
                <Loader2 size={22} className="animate-spin text-[#185FA5]" />
              </div>
            )}

            {!loading && historico.length === 0 && (
              <div className="text-center py-10">
                <Clock size={30} className="mx-auto text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">Nenhuma movimentação registrada</p>
              </div>
            )}

            {!loading && historico.length > 0 && (
              <div className="relative pl-1">
                {/* Timeline line */}
                <div className="absolute left-4 top-4 bottom-2 w-px bg-gray-200" />

                <ul className="space-y-5">
                  {historico.map((h, i) => (
                    <li key={h.id} className="flex gap-3 relative">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 z-10 text-white text-xs font-bold shadow-sm"
                        style={{ background: '#185FA5' }}
                      >
                        {historico.length - i}
                      </div>
                      <div className="flex-1 pb-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          {h.etapa_anterior && (
                            <>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ETAPA_BADGE[h.etapa_anterior] ?? 'bg-gray-100 text-gray-600'}`}>
                                {h.etapa_anterior}
                              </span>
                              <ArrowRight size={11} className="text-gray-400" />
                            </>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ETAPA_BADGE[h.etapa_nova] ?? 'bg-gray-100 text-gray-600'}`}>
                            {h.etapa_nova}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">{fmtDate(h.data_movimento)}</p>
                        {h.observacao && (
                          <p className="mt-1.5 text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">
                            {h.observacao}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
