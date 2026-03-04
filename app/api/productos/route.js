import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const db = getServiceClient()
    const { data, error } = await db
      .from('productos')
      .select('id, nombre, descripcion, imagen_url, imagenes_urls, analisis, created_at, generaciones(count)')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return Response.json({ success: true, productos: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function POST(request) {
  try {
    const { nombre, descripcion, imagen_url, imagenes_urls, analisis } = await request.json()
    if (!nombre) return Response.json({ success: false, error: 'nombre requerido' }, { status: 400 })

    const db = getServiceClient()
    const { data, error } = await db
      .from('productos')
      .insert({ nombre, descripcion, imagen_url, imagenes_urls, analisis })
      .select()
      .single()

    if (error) throw new Error(error.message)
    return Response.json({ success: true, producto: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
