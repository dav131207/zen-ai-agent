import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Send, Loader2 } from 'lucide-react'
import Message from './Message'
import ImageModal from './ImageModal'

const API_BASE = import.meta.env.VITE_API_URL || ''

const COMMANDS = [
  { id: 'getcoins', label: 'Get Free Coins!', shortLabel: 'Get Free Coins!', prompt: 'get coins' },
  { id: 'meme', label: 'Random Meme', shortLabel: 'Meme', prompt: 'random meme' },
  { id: 'rarepepe', label: 'Rare Pepe', shortLabel: 'Rare Pepe', prompt: 'rare pepe' },
  { id: 'social', label: 'Create Social Media Post', shortLabel: 'Social Post', prompt: 'create social media post' },
]

export default function Chat({ isDark }) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: "Hello. I'm Professor Pepe, your AI agent. Type a command or choose one below.",
      time: formatTime(new Date()),
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [typingText, setTypingText] = useState('')
  const [modalImage, setModalImage] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typingText])

  const handleSubmit = async (e, command = null) => {
    if (e && e.preventDefault) e.preventDefault()
    const displayText = command ? command.display : input.trim()
    const sendText = command ? command.send : input.trim()
    if (!displayText || !sendText || loading) return

    const userMsg = { role: 'user', text: displayText, time: formatTime(new Date()) }
    setMessages((prev) => [...prev, userMsg])
    if (!command) setInput('')
    setLoading(true)
    setTypingText('')

    if (sendText.toLowerCase() === 'rare pepe') {
      try {
        const pepe = await fetchRarePepe()
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: '',
            image: pepe.url,
            time: formatTime(new Date()),
          },
        ])
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ ${err.message || 'No rare pepe found.'}`,
            time: formatTime(new Date()),
          },
        ])
      } finally {
        setLoading(false)
      }
      return
    }

    if (sendText.toLowerCase() === 'get coins') {
      try {
        const data = await fetchGetCoins()
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: data.text,
            time: formatTime(new Date()),
          },
        ])
      } catch (err) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            text: `⚠️ ${err.message || 'Could not load get coins info.'}`,
            time: formatTime(new Date()),
          },
        ])
      } finally {
        setLoading(false)
      }
      return
    }

    try {
      const wantsImage = /\b(show|image|picture|pic|photo|visual|draw|meme)\b/i.test(sendText)
      const isSocialCommand = /^create\s+a?\s*social\s+media\s+post/i.test(sendText)

      // Social posts always include an image; explicit image searches use onlypepes.com.
      let imageUrl = null
      if (wantsImage || isSocialCommand) {
        imageUrl = await fetchImage(sendText)
      }

      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .slice(-10)
        .map((m) => ({ role: m.role, text: m.text }))

      const response = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: '',
          message: sendText,
          history,
          stream: true,
        }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Unknown error' }))
        throw new Error(err.detail || `HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setTypingText(fullText)
      }

      let emoteUrl = null
      if (fullText && Math.random() < 0.35) {
        emoteUrl = await fetchEmote(fullText)
      }

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: fullText,
          image: imageUrl,
          emote: emoteUrl,
          time: formatTime(new Date()),
        },
      ])
      setTypingText('')
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          text: `⚠️ ${err.message || 'Something went wrong. Please try again.'}`,
          time: formatTime(new Date()),
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const fetchImage = async (search) => {
    try {
      const res = await fetch(`${API_BASE}/api/image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: search }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch {
      return null
    }
  }

  const fetchEmote = async (text) => {
    try {
      const res = await fetch(`${API_BASE}/api/emote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return null
      const data = await res.json()
      return data.url || null
    } catch {
      return null
    }
  }

  const fetchRarePepe = async () => {
    const history = messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-10)
      .map((m) => ({ role: m.role, text: m.text }))

    const res = await fetch(`${API_BASE}/api/rare_pepe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'rare pepe', history }),
    })
    if (!res.ok) throw new Error('No rare pepe found')
    return res.json()
  }

  const fetchGetCoins = async () => {
    const res = await fetch(`${API_BASE}/api/get_coins`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Could not load get coins info')
    return res.json()
  }

  return (
    <div className="flex flex-col h-full">
      {/* messages */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-3 sm:px-4 md:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
        <AnimatePresence initial={false}>
          {messages.map((msg, idx) => (
            <div key={idx} onClick={(e) => {
              if (e.target.tagName === 'IMG') setModalImage(e.target.src)
            }}>
              <Message msg={msg} isDark={isDark} />
            </div>
          ))}
        </AnimatePresence>

        {typingText && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-2 sm:gap-4"
          >
            <img
              src="/agent.png"
              alt="Professor Pepe"
              className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl object-cover shadow-sm"
            />
            <div className={`message-bubble-agent px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3.5 max-w-[88%] sm:max-w-[85%] md:max-w-[80%]`}>
              <p className="whitespace-pre-wrap text-sm sm:text-base">{typingText}</p>
              <span className="inline-block mt-2 w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            </div>
          </motion.div>
        )}

        {loading && !typingText && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-2 sm:gap-4"
          >
            <img
              src="/agent.png"
              alt="Professor Pepe"
              className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl object-cover shadow-sm"
            />
            <div className={`px-3 py-2 sm:px-4 sm:py-3 md:px-5 md:py-4 rounded-2xl rounded-tl-sm ${isDark ? 'bg-brand-800/80' : 'bg-white'} border border-brand-100 dark:border-white/10 flex items-center gap-2`}>
              <span className="typing-dot" style={{ animationDelay: '0ms' }} />
              <span className="typing-dot" style={{ animationDelay: '150ms' }} />
              <span className="typing-dot" style={{ animationDelay: '300ms' }} />
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* input area */}
      <div className={`relative z-20 px-3 sm:px-4 md:px-8 py-3 sm:py-4 bg-brand-800/70 dark:bg-brand-950/60 backdrop-blur-xl border-t border-brand-700/30 dark:border-white/5`}>
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto relative">
          <div className="flex flex-nowrap sm:flex-wrap items-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 overflow-x-auto sm:overflow-visible pb-1 scrollbar-thin snap-x snap-mandatory">
            {COMMANDS.map((cmd) => (
              <button
                key={cmd.id}
                type="button"
                onClick={() => handleSubmit(null, { display: cmd.label, send: cmd.prompt })}
                disabled={loading}
                className={`shrink-0 snap-start whitespace-nowrap px-2 sm:px-3 py-1 sm:py-1.5 rounded-full text-[10px] sm:text-xs font-medium transition-all duration-200 hover:scale-105 hover:shadow-md ${
                  isDark
                    ? 'bg-brand-800 text-brand-300 hover:bg-brand-700 hover:text-brand-50'
                    : 'bg-brand-100 text-brand-600 hover:bg-brand-200 hover:text-brand-900'
                } disabled:opacity-50 disabled:hover:scale-100`}
              >
                <span className="sm:hidden">{cmd.shortLabel}</span>
                <span className="hidden sm:inline">{cmd.label}</span>
              </button>
            ))}
          </div>

          <div className={`flex items-center gap-1.5 sm:gap-2 rounded-full border px-2 sm:px-2.5 py-1.5 sm:py-2 shadow-lg transition-all duration-300 focus-within:ring-2 focus-within:ring-accent/40 focus-within:shadow-accent/20 ${
            isDark
              ? 'bg-brand-800/80 border-white/10 focus-within:border-accent/50'
              : 'bg-white border-brand-200 focus-within:border-accent/50'
          }`}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a command..."
              className={`flex-1 bg-transparent px-3 sm:px-4 py-1.5 sm:py-2 outline-none text-sm transition-colors min-w-0 ${
                isDark ? 'placeholder:text-brand-500 text-brand-50' : 'placeholder:text-brand-400 text-brand-900'
              }`}
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="p-2 sm:p-2.5 rounded-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 active:scale-90 transition-transform flex-shrink-0"
              aria-label="Send"
            >
              {loading ? <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" /> : <Send size={16} className="sm:w-[18px] sm:h-[18px]" />}
            </button>
          </div>
        </form>
      </div>

      <ImageModal src={modalImage} onClose={() => setModalImage(null)} />
    </div>
  )
}

function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}
