'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-browser'
import HomeView from '@/components/HomeView'
import Step1Upload from '@/components/Step1Upload'
import Step2Angles from '@/components/Step2Angles'
import Step3Templates from '@/components/Step3Templates'
import Step4Generate from '@/components/Step4Generate'
import ProductGeneraciones from '@/components/ProductGeneraciones'

/**
 * page.js — Orquestador principal del stepper.
 * paso: 'home' | 'upload' | 'analysis' | 'templates' | 'generate' | 'generaciones'
 */
export default function Home() {
  const [paso, setPaso] = useState('home')
  const [user, setUser] = useState(null)
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [productoActivo, setProductoActivo] = useState(null) // producto con generaciones cargadas
  const [session, setSession] = useState({
    productoId: null,
    imagenesUrls: [],
    nombreProducto: '',
    descripcion: '',
    analisisCompleto: null,
    anguloSeleccionado: null,
    templateSeleccionado: null,
    imagenGeneradaUrl: null,
  })

  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user))
    fetchProductos()
  }, [])

  async function fetchProductos() {
    setLoadingProductos(true)
    try {
      const res = await fetch('/api/productos')
      const json = await res.json()
      if (json.success) {
        setProductos(json.productos.map(p => ({ ...p, createdAt: new Date(p.created_at) })))
      }
    } catch {}
    finally { setLoadingProductos(false) }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/auth'
  }

  function iniciarNuevoProducto() {
    setSession({
      productoId: null,
      imagenesUrls: [],
      nombreProducto: '',
      descripcion: '',
      analisisCompleto: null,
      anguloSeleccionado: null,
      templateSeleccionado: null,
      imagenGeneradaUrl: null,
    })
    setPaso('upload')
  }

  async function onSelectProducto(producto) {
    // Cargar el producto con sus generaciones y mostrar la vista de galería
    try {
      const res = await fetch(`/api/productos/${producto.id}`)
      const json = await res.json()
      if (json.success) {
        setProductoActivo(json.producto)
      } else {
        setProductoActivo({ ...producto, generaciones: [] })
      }
    } catch {
      setProductoActivo({ ...producto, generaciones: [] })
    }
    setPaso('generaciones')
  }

  function onGenerarNuevoParaProducto(producto) {
    setSession({
      productoId: producto.id,
      imagenesUrls: producto.imagenes_urls || [],
      nombreProducto: producto.nombre,
      descripcion: producto.descripcion || '',
      analisisCompleto: producto.analisis,
      anguloSeleccionado: null,
      templateSeleccionado: null,
      imagenGeneradaUrl: null,
    })
    setPaso('analysis')
  }

  function onEliminarGeneracion(id) {
    setProductoActivo(prev => ({
      ...prev,
      generaciones: prev.generaciones.filter(g => g.id !== id),
    }))
  }

  async function onEliminarProducto(id) {
    setProductos(prev => prev.filter(p => p.id !== id))
    try {
      await fetch(`/api/productos/${id}`, { method: 'DELETE' })
    } catch {}
  }

  async function onAnalisisCompleto(analisis, imagenesUrls, nombre, descripcion) {
    setSession(prev => ({ ...prev, analisisCompleto: analisis, imagenesUrls, nombreProducto: nombre, descripcion }))
    setPaso('analysis')

    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          descripcion,
          imagen_url: imagenesUrls[0] || null,
          imagenes_urls: imagenesUrls,
          analisis,
        }),
      })
      const json = await res.json()
      if (json.success) {
        const nuevo = { ...json.producto, createdAt: new Date(json.producto.created_at) }
        setProductos(prev => [nuevo, ...prev])
        setSession(prev => ({ ...prev, productoId: json.producto.id }))
      }
    } catch {}
  }

  function onAnguloSeleccionado(angulo) {
    setSession(prev => ({ ...prev, anguloSeleccionado: angulo }))
    setPaso('templates')
  }

  function onTemplateSeleccionado(template) {
    setSession(prev => ({ ...prev, templateSeleccionado: template }))
    setPaso('generate')
  }

  if (paso === 'home') {
    return (
      <HomeView
        user={user}
        productos={productos}
        loading={loadingProductos}
        onNuevoProducto={iniciarNuevoProducto}
        onSelectProducto={onSelectProducto}
        onEliminarProducto={onEliminarProducto}
        onLogout={handleLogout}
      />
    )
  }

  if (paso === 'upload') {
    return (
      <Step1Upload
        onBack={() => setPaso('home')}
        onComplete={onAnalisisCompleto}
      />
    )
  }

  if (paso === 'analysis') {
    return (
      <Step2Angles
        analisis={session.analisisCompleto}
        nombreProducto={session.nombreProducto}
        imagenesUrls={session.imagenesUrls}
        onBack={() => setPaso('upload')}
        onAnguloSeleccionado={onAnguloSeleccionado}
      />
    )
  }

  if (paso === 'templates') {
    return (
      <Step3Templates
        session={session}
        onBack={() => setPaso('analysis')}
        onTemplateSeleccionado={onTemplateSeleccionado}
      />
    )
  }

  if (paso === 'generate') {
    return (
      <Step4Generate
        session={session}
        onBack={() => setPaso('templates')}
        onNuevaCampania={iniciarNuevoProducto}
      />
    )
  }

  if (paso === 'generaciones' && productoActivo) {
    return (
      <ProductGeneraciones
        producto={productoActivo}
        generaciones={productoActivo.generaciones || []}
        onBack={() => setPaso('home')}
        onGenerarNuevo={() => onGenerarNuevoParaProducto(productoActivo)}
        onEliminar={onEliminarGeneracion}
      />
    )
  }

  return null
}
