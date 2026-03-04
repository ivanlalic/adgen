import { getServiceClient } from '@/lib/supabase'

export const maxDuration = 30

export async function POST(request) {
  try {
    const formData = await request.formData()
    const seccion = formData.get('seccion')
    const nombre = formData.get('nombre')
    const file = formData.get('file')

    if (!seccion || !file || !nombre) {
      return Response.json({ success: false, error: 'Faltan datos requeridos' }, { status: 400 })
    }

    const serviceClient = getServiceClient()

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const contentType = file.type || 'image/jpeg'
    const ext = contentType.split('/')[1]?.replace('jpeg', 'jpg') || 'jpg'
    const storagePath = `${seccion.toLowerCase()}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    const { data: uploadData, error: uploadError } = await serviceClient.storage
      .from('templates')
      .upload(storagePath, buffer, { contentType, upsert: false })

    if (uploadError) throw new Error(`Storage error: ${uploadError.message}`)

    const { data: { publicUrl } } = serviceClient.storage
      .from('templates')
      .getPublicUrl(uploadData.path)

    const { data: templateData, error: dbError } = await serviceClient
      .from('templates')
      .insert({
        nombre,
        seccion: seccion.toUpperCase(),
        imagen_url: publicUrl,
        style_guide: null,
        publico: true,
        creado_por: 'admin',
      })
      .select()
      .single()

    if (dbError) throw new Error(`DB error: ${dbError.message}`)

    return Response.json({ success: true, template: templateData })
  } catch (err) {
    console.error('[/api/admin/upload-template] Error:', err)
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
