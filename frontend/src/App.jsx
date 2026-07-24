import { useState } from 'react'
import { motion } from 'framer-motion'
import { useTheme } from './hooks/useTheme'
import Chat from './components/Chat'
import ParticlesBackground from './components/ParticlesBackground'

const SUPPORT_ADDRESS = 'PhzpSqdSiMRNQ6ksCEDs4ufJtFfuyLCU9j'

function SupportButton() {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(SUPPORT_ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // ignore
    }
  }

  return (
    <button
      onClick={copy}
      className="text-left text-[10px] md:text-xs text-brand-500 dark:text-brand-400 hover:text-accent transition-colors"
      title="Click to copy"
    >
      <span className="block font-semibold uppercase tracking-wider">Support Project</span>
      <span className="font-mono">{copied ? 'Copied!' : SUPPORT_ADDRESS}</span>
    </button>
  )
}

export default function App() {
  const { isDark } = useTheme()

  return (
    <div className={`min-h-screen transition-colors duration-500 ${isDark ? 'bg-brand-900 text-brand-50' : 'bg-brand-50 text-brand-900'}`}>
      <ParticlesBackground isDark={isDark} />
      <div className="flex h-screen overflow-hidden">
        <main className="flex-1 flex flex-col relative">
          <header className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6 py-2 bg-brand-800/70 dark:bg-brand-950/60 backdrop-blur-xl border-b border-brand-700/30 dark:border-white/5">
            <div className="flex items-center">
              <SupportButton />
            </div>

            <div className="flex items-center justify-center gap-2 md:gap-3">
              <motion.img
                src="/logo.png"
                alt="Professor Pepe Logo"
                initial={{ rotate: -10, scale: 0.8 }}
                animate={{ rotate: [0, 5, -5, 0], y: [0, -4, 0] }}
                transition={{
                  rotate: { duration: 6, repeat: Infinity, ease: 'easeInOut' },
                  y: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
                  scale: { type: 'spring', stiffness: 200 },
                }}
                whileHover={{ scale: 1.1, rotate: 10 }}
                className="w-16 h-16 md:w-24 md:h-24 object-contain"
              />
              <div className="leading-tight w-44 md:w-56 text-center">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight whitespace-nowrap">
                  <span className={isDark ? 'text-white' : 'text-brand-900'}>Professor</span>{' '}
                  <span className="text-accent">Pepe</span>
                </h1>
                <p className="text-[9px] md:text-[10px] tracking-[0.18em] md:tracking-[0.24em] text-brand-500 dark:text-brand-400 font-medium whitespace-nowrap">
                  Your daily dose of Intelligence
                </p>
              </div>
            </div>

            <div />
          </header>

          <div className="flex-1 relative z-10 overflow-hidden">
            <Chat isDark={isDark} />
          </div>
        </main>
      </div>
    </div>
  )
}
