'use client'

import { useState } from 'react'
import { X, Loader2, MoveRight, AlertCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'

const ETAPAS = [
  'Triagem',
  'Entrevista RH',
  'Teste Técnico',
  'Entrevista Gestor',
  'Proposta',
  'Contratado',
]

type Props = {
  pipelineId: string
  candidatoId: string
  vagaId: string
  etapaAtual: string
  candidatoNome: string
  onClose: () => void
  onSuccess: (novaEtapa: string) => void
}

export default function MoverEtapaModal({
  pipelineId,
  candidatoId,
  vagaId,
  etapaAtual,
  candidatoNome,
  onClose,
  onSuccess,
}: Props) {
  const [novaEtapa, setNovaEtapa]   = useState('')
  const [observacao, setObservacao] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  async function handleSave() {
    if (!novaEtapa) { setError('Selecione a nova etapa.'); return }
    setSaving(true)
    setError('')

    const { error: e1 } = await supabase
      .from('pipeline')
      .update({ etapa: novaEtapa })
      .eq('id', pipelineId)

    if (e1) { setError(e1.message); setSaving(false); return }

    await supabase.from('pipeline_historico').insert({
      candidato_id:   candidatoId,
      vaga_id:        vagaId,
      etapa_anterior: etapaAtual,
      etapa_nova:     novaEtapa,
      observacao:     observacao.trim() || null,
    })

    setSaving(false)
    onSuccess(novaEtapa)
  }

  const etapasDisponiveis = ETAPAS.filter(e => e !== etapaAtual)

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm" onClick={() => { if (!saving) onClose() }} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">

          {/* Header */}
          <div
            className="flex items-center justify-between p-5 rounded-t-2xl"
            style={{ background: 'linear-gradient(135deg, #185FA5, #2d7dd2)' }}
          >
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <MoveRight size={15} /> Mover de Etapa
              </h2>
              <p className="text-blue-200 text-xs mt-0.5">{candidatoNome}</p>
            </div>
            <button
              onClick={() => { if (!saving) onClose() }}
              className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
              disabled={saving}
            >
              <X size={15} className="text-white" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            <p className="text-xs text-gray-500">
              Etapa atual:{' '}
              <span className="font-semibold text-gray-700">{etapaAtual}</span>
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nova etapa <span className="text-red-500">*</span>
              </label>
              <select
                className="input"
                value={novaEtapa}
                onChange={e => setNovaEtapa(e.target.value)}
                disabled={saving}
              >
                <option value="">Selecione a etapa</option>
                {etapasDisponiveis.map(e => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Observação <span className="text-gray-400 font-normal">(opcional)</span>
              </label>
              <textarea
                className="input min-h-[80px] resize-none text-sm"
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Motivo da movimentação..."
                disabled={saving}
              />
            </div>

            {error && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                <AlertCircle size={12} /> {error}
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary flex-1"
                disabled={saving}
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !novaEtapa}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {saving
                  ? <><Loader2 size={14} className="animate-spin" /> Movendo...</>
                  : <><MoveRight size={14} /> Mover</>
                }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
