import { motion } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

function linkify(text) {
  if (!text) return text
  return text.replace(
    /(?<!\]\()(https?:\/\/[^\s<>"{}|\\^`[\]]+|discord\.gg\/[^\s<>"{}|\\^`[\]]+)/g,
    (url) => {
      const trimmed = url.replace(/[.,;:!?]+$/, '')
      let display = 'Link'
      try {
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
        const u = new URL(normalized)
        display = u.hostname.replace(/^www\./, '')
      } catch {
        display = 'Link'
      }
      return `[${display}](${trimmed})`
    }
  )
}

const markdownComponents = {
  a: ({ node, ...props }) => (
    <a {...props} target="_blank" rel="noopener noreferrer" />
  ),
}

export default function Message({ msg, isDark }) {
  const isUser = msg.role === 'user'

  const textWithLinks = linkify(msg.text)

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      className={`flex gap-2 sm:gap-3 md:gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {isUser ? (
        <img
          src="/user.png"
          alt="User"
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl object-cover shadow-sm"
        />
      ) : (
        <img
          src="/agent.png"
          alt="Professor Pepe"
          className="flex-shrink-0 w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 rounded-xl object-cover shadow-sm"
        />
      )}

      <div className={`max-w-[88%] sm:max-w-[85%] md:max-w-[80%] min-w-0 ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1.5 sm:gap-2`}>
        <div className={`message-bubble-${isUser ? 'user' : 'agent'} px-3 py-2 sm:px-4 sm:py-2.5 md:px-5 md:py-3.5 w-full`}>
          {msg.image && (
            <motion.img
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              src={msg.image}
              alt="Generated visual"
              className="mb-2 sm:mb-3 rounded-xl max-w-full max-h-48 sm:max-h-56 md:max-h-64 h-auto w-auto mx-auto shadow-sm"
            />
          )}
          {msg.text && (
            <div className="prose prose-sm dark:prose-invert max-w-none break-words [overflow-wrap:anywhere]">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                {msg.emote ? `${textWithLinks.trim()} ![emote](${msg.emote})` : textWithLinks}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <span className="text-[9px] sm:text-[10px] text-brand-400 dark:text-brand-500 px-1">
          {msg.time}
        </span>
      </div>
    </motion.div>
  )
}
