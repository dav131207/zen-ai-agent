import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Sparkles, Globe, MessageSquare, Hash, ArrowRight, ArrowLeft } from 'lucide-react'

const LANGUAGES = [
  { id: 'English', icon: '🇺🇸', label: 'English' },
  { id: 'German', icon: '🇩🇪', label: 'German' },
  { id: 'Spanish', icon: '🇪🇸', label: 'Spanish' },
  { id: 'French', icon: '🇫🇷', label: 'French' },
]

const TONALITIES = [
  { id: 'Humorous', label: 'Meme / Funny', icon: '🐸', desc: 'Degen energy, lots of memes' },
  { id: 'Professional', label: 'News / Pro', icon: '📰', desc: 'Serious updates & alpha' },
  { id: 'Hype', label: 'Bullish / Hype', icon: '🚀', desc: 'To the moon, LFG!' },
  { id: 'Educational', label: 'Educational', icon: '🧠', desc: 'Explaining the tech' },
  { id: 'Philosophical', label: 'Philosophical', icon: '🌌', desc: 'Deep thoughts on crypto' }
]

export default function SocialPostModal({ isOpen, onClose, onSubmit, isDark }) {
  const [step, setStep] = useState(1)
  const [language, setLanguage] = useState('English')
  const [tonality, setTonality] = useState('Humorous')
  const [topic, setTopic] = useState('')

  if (!isOpen) {
    if (step !== 1) setTimeout(() => setStep(1), 300)
    return null
  }

  const handleNext = () => setStep(s => Math.min(s + 1, 3))
  const handlePrev = () => setStep(s => Math.max(s - 1, 1))

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ language, tonality, topic })
  }

  const stepVariants = {
    hidden: { opacity: 0, x: 50, scale: 0.95 },
    visible: { opacity: 1, x: 0, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { opacity: 0, x: -50, scale: 0.95, transition: { duration: 0.2 } }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      >
        {/* Dynamic Glass Backdrop */}
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-xl transition-all"
          onClick={onClose}
        />

        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 40 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className={`relative w-full max-w-2xl rounded-[2rem] overflow-hidden shadow-2xl border ${
            isDark 
              ? 'bg-[#0f1115]/90 border-white/10 text-white shadow-accent/5' 
              : 'bg-white/90 border-brand-200 text-brand-900 shadow-brand-500/10'
          }`}
        >
          {/* Ambient Glows */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/20 rounded-full blur-[100px] pointer-events-none -translate-y-1/2" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-brand-500/20 rounded-full blur-[100px] pointer-events-none translate-y-1/2" />

          {/* Header */}
          <div className="relative z-10 px-8 pt-8 pb-4 flex justify-between items-center">
            <div className="flex flex-col">
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
                <Sparkles className="text-accent" />
                Social Post Generator
              </h2>
              <div className="flex items-center gap-2 mt-3">
                {[1, 2, 3].map((i) => (
                  <div 
                    key={i} 
                    className={`h-1.5 rounded-full transition-all duration-500 ${
                      i === step ? 'w-8 bg-accent' : i < step ? 'w-4 bg-accent/50' : 'w-4 bg-gray-300 dark:bg-white/20'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
            >
              <X size={24} />
            </button>
          </div>

          {/* Content Area */}
          <div className="relative z-10 px-8 py-6 h-[400px] flex flex-col">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div key="step1" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="h-full flex flex-col">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 opacity-90">
                    <Globe size={20} className="text-accent" />
                    Select Language
                  </h3>
                  <div className="grid grid-cols-2 gap-4 flex-1">
                    {LANGUAGES.map((l) => (
                      <button
                        key={l.id}
                        onClick={() => { setLanguage(l.id); setTimeout(handleNext, 150) }}
                        className={`group relative overflow-hidden rounded-2xl p-6 text-left transition-all duration-300 border-2 ${
                          language === l.id
                            ? 'border-accent bg-accent/10 shadow-[0_0_30px_rgba(38,154,76,0.2)]'
                            : isDark
                              ? 'border-white/5 bg-white/5 hover:bg-white/10'
                              : 'border-brand-100 bg-brand-50 hover:bg-brand-100'
                        }`}
                      >
                        <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform origin-left">{l.icon}</span>
                        <span className="text-xl font-bold block">{l.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div key="step2" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="h-full flex flex-col">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 opacity-90">
                    <MessageSquare size={20} className="text-accent" />
                    Choose the Vibe
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 overflow-y-auto pr-2 scrollbar-thin">
                    {TONALITIES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => { setTonality(t.id); setTimeout(handleNext, 150) }}
                        className={`group relative overflow-hidden rounded-2xl p-5 text-left transition-all duration-300 border-2 flex items-center gap-4 ${
                          tonality === t.id
                            ? 'border-accent bg-accent/10 shadow-[0_0_30px_rgba(38,154,76,0.2)]'
                            : isDark
                              ? 'border-white/5 bg-white/5 hover:bg-white/10'
                              : 'border-brand-100 bg-brand-50 hover:bg-brand-100'
                        }`}
                      >
                        <span className="text-3xl group-hover:rotate-12 transition-transform">{t.icon}</span>
                        <div>
                          <span className="text-base font-bold block mb-0.5">{t.label}</span>
                          <span className="text-xs opacity-70 block">{t.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div key="step3" variants={stepVariants} initial="hidden" animate="visible" exit="exit" className="h-full flex flex-col">
                  <h3 className="text-lg font-bold mb-6 flex items-center gap-2 opacity-90">
                    <Hash size={20} className="text-accent" />
                    Add Custom Context <span className="opacity-50 font-normal text-sm normal-case">(Optional)</span>
                  </h3>
                  <div className="flex-1 flex flex-col">
                    <textarea
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="What is this post about? (e.g. New ATH, community update, roasting paperhands...)"
                      className={`w-full flex-1 p-6 rounded-3xl outline-none border-2 resize-none transition-all duration-300 text-lg shadow-inner ${
                        isDark 
                          ? 'bg-black/40 border-white/5 placeholder:text-white/30 text-white focus:border-accent/50 focus:bg-black/60' 
                          : 'bg-white/50 border-brand-100 placeholder:text-brand-300 text-brand-900 focus:border-accent/50 focus:bg-white'
                      }`}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className={`relative z-10 px-8 py-6 flex items-center justify-between border-t ${isDark ? 'border-white/5 bg-black/20' : 'border-brand-100 bg-white/50'}`}>
            <button
              onClick={handlePrev}
              disabled={step === 1}
              className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
                step === 1 
                  ? 'opacity-0 pointer-events-none' 
                  : isDark ? 'hover:bg-white/10 text-white' : 'hover:bg-black/5 text-brand-900'
              }`}
            >
              <ArrowLeft size={18} /> Back
            </button>
            
            {step < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-black transition-all bg-brand-900 text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-brand-50"
              >
                Next <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                className="group relative flex items-center gap-2 px-8 py-3 rounded-xl font-black text-brand-950 transition-all bg-accent hover:bg-accent-light hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(38,154,76,0.3)] hover:shadow-[0_0_30px_rgba(38,154,76,0.5)] overflow-hidden"
              >
                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
                <Sparkles size={18} className="animate-pulse" />
                Generate Now
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
