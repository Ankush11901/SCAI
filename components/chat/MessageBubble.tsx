import { User, Bot } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface MessageBubbleProps {
  message: Message
}

/**
 * MessageBubble
 * Individual chat message display
 */
export default function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0">
          <Bot className="w-5 h-5 text-scai-page" />
        </div>
      )}
      
      <div
        className={`max-w-[80%] ${
          isUser
            ? 'bg-scai-input border border-scai-border rounded-2xl rounded-br-sm'
            : 'bg-transparent border-l-2 border-scai-brand1 pl-4'
        } ${isUser ? 'px-4 py-3' : 'py-1'}`}
      >
        <p className="text-scai-text whitespace-pre-wrap">{message.content}</p>
        <p className={`text-xs mt-1 ${isUser ? 'text-scai-text-muted text-right' : 'text-scai-text-muted'}`}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>

      {isUser && (
        <div className="w-10 h-10 rounded-xl bg-scai-surface border border-scai-border flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-scai-text-sec" />
        </div>
      )}
    </div>
  )
}

