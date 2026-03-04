'use client'
import { useState, useEffect } from 'react'
import HomeView from '@/components/HomeView'
import Step1Upload from '@/components/Step1Upload'
import Step2Angles from '@/components/Step2Angles'
import Step3Templates from '@/components/Step3Templates'
import Step4Generate from '@/components/Step4Generate'

/**
 * page.js — Orquestador principal del stepper.
 * paso: 'home' | 'upload' | 'analysis' | 'templates' | 'generate'
 */
export default function Home() {
  const [paso, setPaso] = useState('home')
  const [productos, setProductos] = useState([])
  const [loadingProductos, setLoadingProductos] = useState(true)
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

  useEffect(() => {
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

  function onSelectProducto(producto) {
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

  async function onEliminarProducto(id) {
    setProductos(prev => prev.filter(p => p.id !== id))
    try {
      await fetch(`/api/productos/${id}`, { method: 'DELETE' })
    } catch {}
  }

  async function onAnalisisCompleto(analisis, imagenesUrls, nombre, descripcion) {
    setSession(prev => ({ ...prev, analisisCompleto: analisis, imagenesUrls, nombreProducto: nombre, descripcion }))
    setPaso('analysis')

    // Guardar en Supabase
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
        productos={productos}
        loading={loadingProductos}
        onNuevoProducto={iniciarNuevoProducto}
        onSelectProducto={onSelectProducto}
        onEliminarProducto={onEliminarProducto}
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

  return null
}
