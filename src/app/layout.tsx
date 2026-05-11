import type { Metadata } from 'next'
import { Roboto } from 'next/font/google'
import './globals.css'
import { Toaster } from '@/components/ui/sonner'

const roboto = Roboto({
  subsets: ['latin'],
  variable: '--font-roboto',
  weight: ['400', '500', '700'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'AutoLançamento',
  description: 'Portal de lançamentos contábeis',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${roboto.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
