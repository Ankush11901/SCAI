"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Sparkles } from "lucide-react";
import { ARTICLE_TYPES, ArticleType } from "@/data/article-types";
import MessageBubble from "./MessageBubble";
import TypingIndicator from "./TypingIndicator";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  selectedType: ArticleType | null;
  onSelectType: (type: ArticleType | null) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
  onContentUpdate: (content: string) => void;
  onShowPreview: () => void;
}

/**
 * ChatInterface
 * ChatGPT-style conversational interface for article generation
 */
export default function ChatInterface({
  selectedType,
  onSelectType,
  isGenerating,
  setIsGenerating,
  onContentUpdate,
  onShowPreview,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(
        inputRef.current.scrollHeight,
        150
      )}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsGenerating(true);
    onShowPreview();

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `I'll create a ${selectedType?.name || "article"} about "${
          userMessage.content
        }". Watch the preview panel as I build your article in real-time...`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      // Simulate content generation
      onContentUpdate(
        `<h1>${userMessage.content}</h1><p>Generating content...</p>`
      );

      setTimeout(() => {
        setIsGenerating(false);
      }, 3000);
    }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 ? (
          // Empty state / Welcome
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-primary flex items-center justify-center mb-6 shadow-glow-lg">
              <Sparkles className="w-10 h-10 text-scai-page" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Create an Article</h2>
            <p className="text-scai-text-sec mb-8 max-w-md">
              Tell me what you want to write about, and I&apos;ll generate a
              complete, SEO-optimized article for you in real-time.
            </p>

            {/* Article type selector */}
            <div className="mb-6">
              <p className="text-sm text-scai-text-muted mb-3">
                Select article type:
              </p>
              <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
                {ARTICLE_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => onSelectType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selectedType?.id === type.id
                        ? "bg-scai-brand1 text-scai-page"
                        : "bg-scai-input border border-scai-border hover:border-scai-brand1 text-scai-text-sec hover:text-scai-text"
                    }`}
                  >
                    {type.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Example prompts */}
            <div className="text-sm text-scai-text-muted">
              <p className="mb-2">Try asking:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  "Best wireless headphones for 2024",
                  "How to start a vegetable garden",
                  "iPhone 15 vs Samsung S24 comparison",
                ].map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => setInput(prompt)}
                    className="px-3 py-1.5 bg-scai-surface border border-scai-border rounded-lg hover:border-scai-brand1 transition-colors"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          // Message list
          <div className="space-y-6">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isGenerating && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-scai-border bg-scai-surface p-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="relative flex items-end gap-3">
            <div className="flex-1 relative">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  selectedType
                    ? `Describe your ${selectedType.name.toLowerCase()} article topic...`
                    : "Select an article type above, then describe your topic..."
                }
                className="min-h-[52px] max-h-[150px] resize-none pr-12"
                rows={1}
                disabled={isGenerating}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isGenerating}
              size="icon"
              className="flex-shrink-0"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </div>
          <p className="text-xs text-scai-text-muted mt-2 text-center">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  );
}
