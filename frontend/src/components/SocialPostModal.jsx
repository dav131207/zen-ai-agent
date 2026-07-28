import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, MessageSquare, Globe, Hash } from 'lucide-react'

const LANGUAGES = ['English', 'German', 'Spanish', 'French']
const TONALITIES = [
  { id: 'Humorous', label: 'Meme / Funny' },
  { id: 'Professional', label: 'News / Pro' },
  { id: 'Hype', label: 'Bullish / Hype' },
  { id: 'Educational', label: 'Educational' },
  { id: 'Philosophical', label: 'Deep / Philo' }
]

export default function SocialPostModal({ isOpen, onClose, onSubmit, isDark }) {
  const [language, setLanguage] = useState('English')
  const [tonality, setTonality] = useState('Humorous')
  const [topic, setTopic] = useState('')

  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ language, tonality, topic })
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-[90%] max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl border overflow-hidden relative ${
            isDark ? 'bg-brand-900/95 border-white/10 text-white' : 'bg-white/95 border-brand-200 text-brand-900'
          }`}
        >
          {/* Subtle gradient background effect */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex justify-between items-center mb-8 relative z-10">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-accent/20 rounded-2xl text-accent shadow-inner">
                <Sparkles size={24} />
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight">Craft your Post</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
            
            {/* Language Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3 opacity-90">
                <Globe size={16} className="text-accent" />
                <label className="text-sm font-bold uppercase tracking-wider">Language</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setLanguage(lang)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      language === lang 
                        ? 'bg-accent text-brand-950 shadow-lg shadow-accent/40 scale-105' 
                        : isDark 
                          ? 'bg-brand-800/50 text-brand-200 hover:bg-brand-700/80' 
                          : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Tonality Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3 opacity-90">
                <MessageSquare size={16} className="text-accent" />
                <label className="text-sm font-bold uppercase tracking-wider">Vibe & Tonality</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {TONALITIES.map(tone => (
                  <button
                    key={tone.id}
                    type="button"
                    onClick={() => setTonality(tone.id)}
                    className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                      tonality === tone.id 
                        ? 'bg-accent text-brand-950 shadow-lg shadow-accent/40 scale-105' 
                        : isDark 
                          ? 'bg-brand-800/50 text-brand-200 hover:bg-brand-700/80' 
                          : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
                    }`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic Input */}
            <div>
              <div className="flex items-center gap-2 mb-3 opacity-90">
                <Hash size={16} className="text-accent" />
                <label className="text-sm font-bold uppercase tracking-wider">Custom Topic <span className="opacity-50 text-xs normal-case font-medium ml-1">(Optional)</span></label>
              </div>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Pepe coin hitting a new ATH soon..."
                className={`w-full p-4 rounded-2xl outline-none border-2 transition-all duration-300 focus:border-accent shadow-inner ${
                  isDark 
                    ? 'bg-brand-950/50 border-white/5 placeholder:text-brand-500 text-white focus:bg-brand-900' 
                    : 'bg-white border-brand-100 placeholder:text-brand-400 text-brand-900 focus:bg-brand-50'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-4 mt-6 rounded-2xl font-black text-lg text-brand-950 transition-all duration-300 active:scale-95 shadow-xl flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent-light hover:shadow-accent/40 hover:scale-[1.02]"
            >
              <Sparkles size={20} className="animate-pulse" />
              Generate Magic Post
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
