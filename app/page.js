'use client'
import { useState } from 'react'
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
