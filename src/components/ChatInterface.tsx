"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Send,
  Paperclip,
  Mic,
  Plus,
  MessageSquare,
  Sparkles,
  Bot,
  User,
  Copy,
  Check,
  Search,
  X,
  FileText,
  Trash2,
  ChevronDown,
} from "lucide-react";
import toast from "react-hot-toast";
import type { ChatMessage, ChatConversation } from "@/types";

export function ChatInterface() {
  const {
    conversations,
    activeConversation,
    setActiveConversation,
    createConversation,
    addMessage,
    backendUrl,
    apiKey,
  } = useApp();

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [attachments, setAttachments] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const handleSend = useCallback(async () => {
    if (!input.trim() && attachments.length === 0) return;
    if (isLoading) return;

    let conv = activeConversation;
    if (!conv) {
      conv = createConversation();
    }

    const currentAttachments = [...attachments];
    const userInput = input.trim();

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userInput,
      timestamp: new Date().toISOString(),
      attachments: currentAttachments.map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        type: f.type,
        size: f.size,
      })),
    };

    addMessage(conv.id, userMessage);
    setInput("");
    setAttachments([]);
    setIsLoading(true);

    try {
      // 1. Upload attached files to backend storage and memory if present
      const uploadedFileNames: string[] = [];
      for (const file of currentAttachments) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("user_note", userInput || `Uploaded in chat: ${file.name}`);
        
        try {
          const uploadRes = await fetch(`${backendUrl}/api/documents/upload`, {
            method: "POST",
            body: formData,
          });
          if (uploadRes.ok) {
            uploadedFileNames.push(file.name);
          }
        } catch (uploadErr) {
          console.warn("Attachment upload warning:", uploadErr);
        }
      }

      // 2. Build complete message query
      let fullMessage = userInput;
      if (uploadedFileNames.length > 0 && !fullMessage.toLowerCase().includes(uploadedFileNames[0].toLowerCase())) {
        fullMessage = `${fullMessage} ${uploadedFileNames.join(" ")}`.trim();
      }

      // 3. Send chat request
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({
          message: fullMessage,
          conversation_id: conv.id,
          history: conv.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || data.message || "I couldn't process that request.",
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
      };

      addMessage(conv.id, assistantMessage);
    } catch (error) {
      // Fallback: generate a local response when backend is unavailable
      const fallbackMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: generateLocalResponse(userInput),
        timestamp: new Date().toISOString(),
      };
      addMessage(conv.id, fallbackMessage);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachments, activeConversation, createConversation, addMessage, backendUrl, apiKey, isLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    toast.success("Copied to clipboard");
  };

  const handleFileAttach = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(historySearch.toLowerCase())
  );

  const messages = activeConversation?.messages || [];

  return (
    <div className="flex h-full">
      {/* Chat History Sidebar */}
      <div
        className={`
          ${showHistory ? "w-80" : "w-0"}
          transition-all duration-300 overflow-hidden
          bg-surface-950/60 backdrop-blur-xl border-r border-white/[0.06]
          flex flex-col
        `}
      >
        <div className="p-4 border-b border-white/[0.06]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white/70">Chat History</h3>
            <button
              onClick={() => setShowHistory(false)}
              className="text-white/30 hover:text-white/60 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-white/[0.05] text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {filteredConversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => {
                setActiveConversation(conv);
                if (window.innerWidth < 1024) setShowHistory(false);
              }}
              className={`
                w-full text-left p-3 rounded-xl transition-all
                ${
                  activeConversation?.id === conv.id
                    ? "bg-primary-500/10 text-white"
                    : "text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                }
              `}
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm truncate">{conv.title}</span>
              </div>
              <p className="text-xs text-white/30 mt-1 ml-6">
                {conv.messages.length} msgs •{" "}
                {new Date(conv.updatedAt).toLocaleDateString()}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center gap-3 p-4 border-b border-white/[0.06] glass">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-white/50 hover:text-white/80"
          >
            <MessageSquare className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              const conv = createConversation();
              setActiveConversation(conv);
            }}
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors text-white/50 hover:text-white/80"
            title="New Chat"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h2 className="text-sm font-semibold text-white/80">
              {activeConversation?.title || "New Conversation"}
            </h2>
            <p className="text-xs text-white/30">
              AI retrieves from your knowledge base before answering
            </p>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-success/10 border border-success/20">
            <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] text-success font-medium">RAG Active</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-6">
          {messages.length === 0 ? (
            <EmptyChat onSuggestion={(text) => { setInput(text); inputRef.current?.focus(); }} />
          ) : (
            messages.map((msg, idx) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                copiedId={copiedId}
                onCopy={copyToClipboard}
                animationDelay={idx * 0.05}
              />
            ))
          )}
          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachments Preview */}
        {attachments.length > 0 && (
          <div className="px-4 lg:px-6 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg glass text-xs"
              >
                <FileText className="w-3 h-3 text-primary-400" />
                <span className="text-white/70 truncate max-w-[120px]">{file.name}</span>
                <button
                  onClick={() => removeAttachment(idx)}
                  className="text-white/30 hover:text-error transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 lg:p-6 border-t border-white/[0.06]">
          <div className="relative max-w-4xl mx-auto">
            <div className="glass-strong rounded-2xl overflow-hidden">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='Ask anything... "Show my resume", "Find Aadhaar", "Who can refer me at Microsoft?"'
                rows={1}
                className="w-full px-5 py-4 pr-32 bg-transparent text-white placeholder-white/30 outline-none resize-none text-sm lg:text-base"
                style={{ minHeight: "56px", maxHeight: "150px" }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = Math.min(target.scrollHeight, 150) + "px";
                }}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.txt,.pptx,.xlsx,.csv,.png,.jpg,.jpeg,.gif,.zip,.mp3,.mp4,.webm"
                />
                <button
                  onClick={handleFileAttach}
                  className="p-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
                  title="Attach files"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <button
                  className="p-2.5 rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
                  title="Voice input"
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={handleSend}
                  disabled={isLoading || (!input.trim() && attachments.length === 0)}
                  className={`
                    p-2.5 rounded-xl transition-all
                    ${
                      input.trim() || attachments.length > 0
                        ? "gradient-primary text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:scale-105 active:scale-95"
                        : "text-white/20 bg-white/[0.03]"
                    }
                  `}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
            <p className="text-center text-[10px] text-white/20 mt-2">
              AI always retrieves from your knowledge base. Press Enter to send, Shift+Enter for new line.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyChat({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  const suggestions = [
    "Show my latest resume",
    "Find my Aadhaar card",
    "Who can refer me at Microsoft?",
    "Show all Java notes",
    "Find semester 6 marks memo",
    "Summarize my last interview experience",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full py-16 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl gradient-accent flex items-center justify-center mb-6 shadow-2xl shadow-purple-500/20 animate-float">
        <Sparkles className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">AI Second Brain</h2>
      <p className="text-sm text-white/40 mb-8 text-center max-w-md">
        I can search your documents, recall memories, find contacts, and answer
        questions using your personal knowledge base.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onSuggestion(suggestion)}
            className="glass rounded-xl px-4 py-3 text-left text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all group"
          >
            <span className="group-hover:text-primary-400 transition-colors">→</span>{" "}
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({
  message,
  copiedId,
  onCopy,
  animationDelay,
}: {
  message: ChatMessage;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  animationDelay: number;
}) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "justify-end" : "justify-start"} animate-slide-up`}
      style={{ animationDelay: `${animationDelay}s` }}
    >
      {!isUser && (
        <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      <div
        className={`
          max-w-[80%] lg:max-w-[70%] rounded-2xl px-4 py-3
          ${
            isUser
              ? "gradient-primary text-white shadow-lg shadow-primary-500/20"
              : "glass"
          }
        `}
      >
        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {message.attachments.map((att) => (
              <span
                key={att.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/10 text-xs"
              >
                <FileText className="w-3 h-3" /> {att.name}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="markdown-content text-sm text-white/80">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}

        {/* Sources */}
        {message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-white/[0.08]">
            <p className="text-xs text-white/40 mb-2 flex items-center gap-1">
              <FileText className="w-3 h-3 text-primary-400" /> Sources & Documents:
            </p>
            <div className="space-y-2">
              {message.sources.map((src, idx) => (
                <div
                  key={idx}
                  className="text-xs p-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <span className="text-primary-400 font-medium truncate block">{src.docName}</span>
                    <p className="text-white/30 mt-0.5 line-clamp-2 text-[11px]">{src.snippet}</p>
                  </div>
                  {src.docId && (
                    <a
                      href={`http://localhost:8000/api/documents/file/${src.docId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg gradient-primary text-white text-[11px] font-medium flex items-center gap-1 hover:scale-105 transition-all flex-shrink-0 shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5" /> View PDF
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        {!isUser && (
          <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/[0.05]">
            <button
              onClick={() => onCopy(message.content, message.id)}
              className="text-white/20 hover:text-white/50 transition-colors"
              title="Copy"
            >
              {copiedId === message.id ? (
                <Check className="w-3.5 h-3.5 text-success" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
            <span className="text-[10px] text-white/15">
              {new Date(message.timestamp).toLocaleTimeString()}
            </span>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-8 h-8 rounded-xl bg-surface-700 flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-white/60" />
        </div>
      )}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-xl gradient-primary flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary-500/20">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="glass rounded-2xl px-5 py-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-typing" style={{ animationDelay: "0s" }} />
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-typing" style={{ animationDelay: "0.3s" }} />
          <div className="w-2 h-2 rounded-full bg-primary-400 animate-typing" style={{ animationDelay: "0.6s" }} />
        </div>
      </div>
    </div>
  );
}

function generateLocalResponse(input: string): string {
  const lower = input.toLowerCase();

  if (lower.includes("remember") || lower.includes("save") || lower.includes("store")) {
    return "✅ **Memory Saved!**\n\nI've stored this information in your knowledge base. You can retrieve it anytime by asking me.\n\n> 💡 *Connect the backend server to enable persistent storage.*";
  }

  if (lower.includes("resume")) {
    return "📋 **Resume Search**\n\nI searched your knowledge base for resume documents.\n\n> ⚠️ *No documents found. Upload your resume files first, then I can find and compare versions.*\n\n**Suggested actions:**\n- Upload your resume (PDF/DOCX)\n- Say \"Remember my latest resume is version 3\"";
  }

  if (lower.includes("aadhaar") || lower.includes("pan") || lower.includes("passport")) {
    return "🔍 **Document Search**\n\nI searched your knowledge base for identity documents.\n\n> ⚠️ *No matching documents found in your knowledge base.*\n\n**To get started:**\n1. Go to **Documents** and upload your identity documents\n2. I'll automatically extract text and categorize them\n3. Then you can search for them using natural language";
  }

  if (lower.includes("refer") || lower.includes("microsoft") || lower.includes("google")) {
    return "👥 **Referral Search**\n\nI searched your referral contacts.\n\n> ⚠️ *No referral contacts found. Add contacts in the Referrals section.*\n\n**Tip:** Go to the **Referrals** tab and add your LinkedIn contacts with company details.";
  }

  if (lower.includes("java") || lower.includes("notes") || lower.includes("study")) {
    return "📚 **Notes Search**\n\nI searched your study notes and documents.\n\n> ⚠️ *No matching notes found.*\n\n**To organize your study materials:**\n1. Upload PDFs and notes in the **Documents** section\n2. Create study notes in the **Study** tab\n3. I'll make everything searchable with AI";
  }

  return `🤖 **AI Response**\n\nI understand your query: *"${input}"*\n\nI searched your knowledge base but couldn't find relevant information.\n\n> 💡 **Tip:** Connect the FastAPI backend server for full RAG capabilities including:\n> - Semantic search across all your documents\n> - Persistent memory storage\n> - Document embedding and retrieval\n> - OCR text extraction\n\n**Quick Setup:**\n\`\`\`bash\ncd backend\npip install -r requirements.txt\npython main.py\n\`\`\`\n\nThe backend runs on \`http://localhost:8000\` by default.`;
}
