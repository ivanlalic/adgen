'use client'

/**
 * HomeView — Página de inicio con grid de productos analizados.
 * Props:
 *   productos: array de productos analizados en la sesión
 *   onNuevoProducto: () => void
 */
export default function HomeView({ user, productos = [], loading = false, onNuevoProducto, onSelectProducto, onEliminarProducto, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-violet-400 text-lg">✦</span>
            <h1 className="text-xl font-bold tracking-tight">AdGen</h1>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">Generador de anuncios con IA</p>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-500 hidden sm:block truncate max-w-[160px]">
                {user.email}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-1.5 rounded-lg transition-all"
              >
                Salir
              </button>
            </div>
          )}
          <button
            onClick={onNuevoProducto}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo producto
          </button>
        </div>
      </header>

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-video bg-gray-800" />
                <div className="p-4 space-y-2">
                  <div className="h-3.5 bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : productos.length === 0 ? (
          <EmptyState onNuevoProducto={onNuevoProducto} />
        ) : (
          <>
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-400">
                {productos.length} producto{productos.length !== 1 ? 's' : ''} analizado{productos.length !== 1 ? 's' : ''}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {productos.map(p => (
                <ProductCard
                  key={p.id}
                  producto={p}
                  onSelect={() => onSelectProducto(p)}
                  onEliminar={() => onEliminarProducto(p.id)}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}

function EmptyState({ onNuevoProducto }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-5">
        <span className="text-violet-400 text-2xl">✦</span>
      </div>
      <h2 className="text-lg font-semibold text-gray-200 mb-2">
        Ningún producto todavía
      </h2>
      <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">
        Subí fotos de tu producto y dejá que la IA genere 5 ángulos de venta con copy listo para usar.
      </p>
      <button
        onClick={onNuevoProducto}
        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Crear primer producto
      </button>

      <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl text-left">
        {[
          { icon: '📸', title: 'Subís fotos', desc: '1-3 fotos del producto' },
          { icon: '🤖', title: 'Claude analiza', desc: '5 ángulos de venta con copy' },
          { icon: '🎨', title: 'Gemini genera', desc: 'La imagen lista para Meta Ads' },
        ].map(step => (
          <div key={step.title} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
            <div className="text-2xl mb-2">{step.icon}</div>
            <div className="text-sm font-medium text-gray-200 mb-1">{step.title}</div>
            <div className="text-xs text-gray-500">{step.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ProductCard({ producto, onSelect, onEliminar }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors group relative">
      {/* Botón eliminar */}
      <button
        onClick={e => { e.stopPropagation(); onEliminar() }}
        className="absolute top-2 right-2 z-10 w-6 h-6 bg-gray-800/80 hover:bg-red-700 rounded-full text-gray-400 hover:text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all text-xs"
        title="Eliminar"
      >
        ×
      </button>

      <button onClick={onSelect} className="w-full text-left">
        <div className="aspect-video bg-gray-800 overflow-hidden">
          {(producto.imagen_url || producto.imagenes_urls?.[0]) ? (
            <img
              src={producto.imagen_url || producto.imagenes_urls[0]}
              alt={producto.nombre}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-gray-700 text-2xl">📦</span>
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-medium text-gray-100 text-sm truncate">{producto.nombre}</h3>
          <p className="text-gray-600 text-xs mt-1">
            {producto.createdAt?.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="text-xs text-violet-400 bg-violet-900/20 border border-violet-800/30 px-2 py-0.5 rounded-full">
              {producto.analisis?.sales_angles?.length || 0} ángulos
            </span>
            {producto.generaciones?.[0]?.count > 0 && (
              <span className="text-xs text-emerald-400 bg-emerald-900/20 border border-emerald-800/30 px-2 py-0.5 rounded-full">
                {producto.generaciones[0].count} ad{producto.generaciones[0].count !== 1 ? 's' : ''}
              </span>
            )}
            {producto.analisis?.product_document?.price_positioning && (
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full capitalize">
                {producto.analisis.product_document.price_positioning}
              </span>
            )}
          </div>
          <p className="mt-3 text-xs text-violet-500 group-hover:text-violet-400 transition-colors font-medium">
            Retomar →
          </p>
        </div>
      </button>
    </div>
  )
}
