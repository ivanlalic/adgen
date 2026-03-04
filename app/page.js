'use client'
import { useState } from 'react'
import HomeView from '@/components/HomeView'
import Step1Upload from '@/components/Step1Upload'
import Step2Angles from '@/components/Step2Angles'
import Step3Templates from '@/components/Step3Templates'

/**
 * page.js — Orquestador principal del stepper.
 * paso: 'home' | 'upload' | 'analysis' | 'templates' | 'generate'
 */
export default function Home() {
  const [paso, setPaso] = useState('home')
  const [productos, setProductos] = useState([])
  const [session, setSession] = useState({
    imagenesUrls: [],
    nombreProducto: '',
    descripcion: '',
    analisisCompleto: null,
    anguloSeleccionado: null,
    templateSeleccionado: null,
    imagenGeneradaUrl: null,
  })

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

  function onAnalisisCompleto(analisis, imagenesUrls, nombre, descripcion) {
    setSession(prev => ({ ...prev, analisisCompleto: analisis, imagenesUrls, nombreProducto: nombre, descripcion }))
    setProductos(prev => [
      { id: Date.now(), nombre, imagenUrl: imagenesUrls[0] || null, analisis, createdAt: new Date() },
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
    return <HomeView productos={productos} onNuevoProducto={iniciarNuevoProducto} />
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
    // Step4Generate — placeholder hasta que se implemente
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="text-center max-w-sm px-6">
          <p className="text-violet-400 text-4xl mb-4">✦</p>
          <h2 className="text-xl font-semibold mb-2">Paso 4 · Generar</h2>
          <p className="text-gray-500 text-sm mb-2">
            Template: <strong className="text-gray-300">{session.templateSeleccionado?.nombre}</strong>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Ángulo: <strong className="text-gray-300">{session.anguloSeleccionado?.angle_name}</strong>
          </p>
          <button
            onClick={() => setPaso('templates')}
            className="text-sm text-violet-400 hover:text-violet-300 underline underline-offset-2"
          >
            ← Volver a templates
          </button>
        </div>
      </div>
    )
  }

  return null
}
