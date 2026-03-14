import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/toaster'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

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
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
        <Toaster />
        <Analytics />
      </body>
    </html>
  )
}
