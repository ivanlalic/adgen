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
  const [productos, setProductos] = useState(() => {
    if (typeof window === 'undefined') return []
    try {
      const saved = localStorage.getItem('adgen_productos')
      if (!saved) return []
      return JSON.parse(saved).map(p => ({ ...p, createdAt: new Date(p.createdAt) }))
    } catch {
      return []
    }
  })
  const [session, setSession] = useState({
    imagenesUrls: [],
    nombreProducto: '',
    descripcion: '',
    analisisCompleto: null,
    anguloSeleccionado: null,
    templateSeleccionado: null,
    imagenGeneradaUrl: null,
  })

  useEffect(() => {
    try {
      localStorage.setItem('adgen_productos', JSON.stringify(productos))
    } catch {}
  }, [productos])

  function iniciarNuevoProducto() {
    setSession({
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
      imagenesUrls: producto.imagenesUrls || [],
      nombreProducto: producto.nombre,
      descripcion: producto.descripcion || '',
      analisisCompleto: producto.analisis,
      anguloSeleccionado: null,
      templateSeleccionado: null,
      imagenGeneradaUrl: null,
    })
    setPaso('analysis')
  }

  function onEliminarProducto(id) {
    setProductos(prev => prev.filter(p => p.id !== id))
  }

  function onAnalisisCompleto(analisis, imagenesUrls, nombre, descripcion) {
    setSession(prev => ({ ...prev, analisisCompleto: analisis, imagenesUrls, nombreProducto: nombre, descripcion }))
    setProductos(prev => [
      { id: Date.now(), nombre, imagenUrl: imagenesUrls[0] || null, imagenesUrls, descripcion, analisis, createdAt: new Date() },
      ...prev,
    ])
    setPaso('analysis')
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
