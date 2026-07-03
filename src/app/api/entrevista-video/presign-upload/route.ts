import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

const BUCKET = 'entrevistas-audio'

/* ─────────────────────────────────────────────
   POST /api/entrevista-video/presign-upload
   Body: { entrevistaId }

   Cria uma URL pré-assinada para o cliente fazer upload
   de áudio diretamente ao Supabase Storage, sem passar
   pelo servidor Next.js (evita limite de body size).

   Retorna: { signedUrl, token, path, publicUrl }
───────────────────────────────────────────── */
export async function POST(request: Request) {
  // ── Diagnóstico de ambiente ──
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  console.log('[presign-upload] SERVICE_ROLE_KEY prefix:', serviceKey?.slice(0, 20) ?? 'AUSENTE')

  let entrevistaId: string
  try {
    ;({ entrevistaId } = await request.json())
  } catch {
    return NextResponse.json({ error: 'Body inválido.' }, { status: 400 })
  }

  if (!entrevistaId) {
    return NextResponse.json({ error: 'entrevistaId é obrigatório.' }, { status: 400 })
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>
  try {
    supabase = getSupabaseAdmin()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[presign-upload] getSupabaseAdmin falhou:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  // Garante que o bucket existe como público (ignora erro se já existir)
  const bucketRes = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 209715200, // 200 MB
  })
  console.log('[presign-upload] createBucket:', JSON.stringify(bucketRes.error ?? 'ok'))

  const filename = `${entrevistaId}-${Date.now()}.webm`
  console.log('[presign-upload] gerando signed URL para:', filename)

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(filename)

  console.log('[presign-upload] createSignedUploadUrl error:', JSON.stringify(error ?? null))
  console.log('[presign-upload] createSignedUploadUrl data:', data ? 'ok (signedUrl presente)' : 'null')

  if (error || !data?.signedUrl) {
    return NextResponse.json(
      { error: error?.message ?? 'Erro ao gerar URL de upload' },
      { status: 500 },
    )
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(filename)

  return NextResponse.json({
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
    publicUrl,
  })
}
