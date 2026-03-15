import type { Metadata, Viewport } from 'next'
import { Nunito, Rubik } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
})

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
  display: 'swap',
})

export const metadata: Metadata = {
  title: '我の番茄',
  description: '极简番茄钟与待办管理应用',
  icons: {
    icon: [
      { url: '/tomato-icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/tomato-icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/tomato-apple-icon.png',
  },
  manifest: '/manifest.json',
  appleWebApp: {
    title: '我の番茄',
    capable: true,
    statusBarStyle: 'black-translucent',
  },
  }

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // 视口延伸至安全区，实现沉浸式状态栏
  themeColor: '#ffffff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="bg-white">
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${nunito.className} ${rubik.variable} antialiased bg-white min-h-screen min-h-dvh`}>
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
