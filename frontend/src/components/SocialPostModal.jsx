import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

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
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className={`w-[90%] max-w-md rounded-2xl p-5 sm:p-6 shadow-2xl border ${
            isDark ? 'bg-brand-900 border-white/10 text-white' : 'bg-white border-brand-200 text-brand-900'
          }`}
        >
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold">Social Media Post Details</h2>
            <button onClick={onClose} className="p-1 hover:text-accent transition-colors">
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Language</label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className={`w-full p-2 rounded-xl outline-none border ${
                  isDark ? 'bg-brand-800 border-white/10' : 'bg-brand-50 border-brand-200'
                }`}
              >
                <option value="English">English</option>
                <option value="German">German</option>
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Tonality</label>
              <select
                value={tonality}
                onChange={(e) => setTonality(e.target.value)}
                className={`w-full p-2 rounded-xl outline-none border ${
                  isDark ? 'bg-brand-800 border-white/10' : 'bg-brand-50 border-brand-200'
                }`}
              >
                <option value="Humorous">Humorous / Meme</option>
                <option value="Professional">Professional / News</option>
                <option value="Hype">Hype / Bullish</option>
                <option value="Educational">Educational</option>
                <option value="Philosophical">Philosophical</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 opacity-80">Topic (Optional)</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. New all-time high, PoW benefits..."
                className={`w-full p-2 rounded-xl outline-none border ${
                  isDark ? 'bg-brand-800 border-white/10 placeholder:text-brand-500' : 'bg-brand-50 border-brand-200 placeholder:text-brand-400'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 mt-2 rounded-xl btn-primary font-medium transition-transform active:scale-95"
            >
              Generate Post
            </button>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
