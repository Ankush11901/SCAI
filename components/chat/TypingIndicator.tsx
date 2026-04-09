import { Bot } from 'lucide-react'

/**
 * TypingIndicator
 * Shows when AI is generating a response
 */
export default function TypingIndicator() {
  return (
    <div className="flex gap-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
        <Bot className="w-5 h-5 text-scai-page" />
      </div>
      
      <div className="flex items-center gap-1 py-3">
        <div className="typing-dot" style={{ animationDelay: '-0.32s' }} />
        <div className="typing-dot" style={{ animationDelay: '-0.16s' }} />
        <div className="typing-dot" />
      </div>
    </div>
  )
}

