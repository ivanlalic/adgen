import { getServiceClient } from '@/lib/supabase'

export async function GET() {
  try {
    const serviceClient = getServiceClient()
    const { data, error } = await serviceClient
      .from('templates')
      .select('*')
      .order('seccion', { ascending: true })
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)
    return Response.json({ success: true, templates: data })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return Response.json({ success: false, error: 'ID requerido' }, { status: 400 })

    const serviceClient = getServiceClient()

    // Get template to find storage path
    const { data: template, error: fetchError } = await serviceClient
      .from('templates')
      .select('imagen_url, seccion')
      .eq('id', id)
      .single()

    if (fetchError) throw new Error(fetchError.message)

    // Extract storage path from URL
    if (template?.imagen_url) {
      const url = new URL(template.imagen_url)
      const pathParts = url.pathname.split('/templates/')
      if (pathParts[1]) {
        await serviceClient.storage.from('templates').remove([pathParts[1]])
      }
    }

    const { error: deleteError } = await serviceClient
      .from('templates')
      .delete()
      .eq('id', id)

    if (deleteError) throw new Error(deleteError.message)

    return Response.json({ success: true })
  } catch (err) {
    return Response.json({ success: false, error: err.message }, { status: 500 })
  }
}
