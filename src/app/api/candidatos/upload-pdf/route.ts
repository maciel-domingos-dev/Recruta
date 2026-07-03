import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

/* ─────────────────────────────────────────────────────────────────────────
   POST /api/candidatos/upload-pdf
   Content-Type: multipart/form-data  —  campo: pdf (File PDF)

   Faz upload do PDF para o Supabase Storage (bucket "curriculos")
   usando a service role key, que bypassa RLS.

   O bucket é criado automaticamente na primeira chamada se não existir.

   Retorna: { url: string }
───────────────────────────────────────────────────────────────────────── */
const BUCKET = 'curriculos'

export async function POST(request: Request) {
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 })
  }

  const pdfFile = formData.get('pdf') as File | null
  if (!pdfFile || pdfFile.size === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 })
  }

  let supabase: ReturnType<typeof getSupabaseAdmin>
  try {
    supabase = getSupabaseAdmin()
  } catch (e) {
    console.error('[upload-pdf] getSupabaseAdmin falhou:', e)
    return NextResponse.json({ error: 'Configuração de storage não disponível.' }, { status: 500 })
  }

  // Garante que o bucket existe (idempotente)
  const { error: bucketErr } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ['application/pdf'],
  })
  if (bucketErr && !bucketErr.message.toLowerCase().includes('already exists')) {
    console.error('[upload-pdf] bucket create:', bucketErr.message)
  }

  try {
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.pdf`
    const buffer   = Buffer.from(await pdfFile.arrayBuffer())

    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(filename, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadErr) {
      console.error('[upload-pdf] storage upload:', uploadErr.message)
      return NextResponse.json({ error: uploadErr.message }, { status: 500 })
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(filename)
    return NextResponse.json({ url: urlData.publicUrl })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro ao fazer upload do PDF'
    console.error('[upload-pdf]', err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
