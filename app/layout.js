import './globals.css'

export const metadata = {
  title: 'AdGen — AI Landing Page & Ad Creative Generator',
  description: 'Genera secciones de landing pages y anuncios para Meta Ads con IA.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
