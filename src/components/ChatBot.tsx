"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import type { ChatMessage, ChatConversation } from "@/types";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* ── Icon components (inline SVGs to avoid extra deps) ── */
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);
const PaperclipIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);
const MenuIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);
const PlusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
const XIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
const FileIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
  </svg>
);
const CopyIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
);

/* ── Helpers ── */
function formatTime(ts: string) {
  try {
    return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch { return ""; }
}

function fileExt(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  const imgs = ["jpg", "jpeg", "png", "gif", "webp"];
  if (imgs.includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  return "file";
}

/* ── Suggestion chips for empty state ── */
const SUGGESTIONS = [
  "📄 Show my resume",
  "🪪 Find my Aadhaar card",
  "📋 What documents do I have?",
  "💾 Remember my phone number is 9876543210",
];

/* ── MAIN COMPONENT ── */
export function ChatBot() {
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
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = "auto";
      ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
    }
  }, [input]);

  /* ── File attachment ── */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  /* ── Send handler ── */
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
      // 1. Upload attachments
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
          if (uploadRes.ok) uploadedFileNames.push(file.name);
        } catch (err) {
          console.warn("Upload warning:", err);
        }
      }

      // 2. Build query
      let fullMessage = userInput;
      if (uploadedFileNames.length > 0 && !fullMessage.toLowerCase().includes(uploadedFileNames[0].toLowerCase())) {
        fullMessage = `${fullMessage} ${uploadedFileNames.join(" ")}`.trim();
      }

      // 3. Chat request
      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { "X-API-Key": apiKey } : {}),
        },
        body: JSON.stringify({
          message: fullMessage,
          conversation_id: conv.id,
          history: conv.messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!response.ok) throw new Error(`Backend error: ${response.status}`);
      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.response || "I couldn't process that request.",
        timestamp: new Date().toISOString(),
        sources: data.sources || [],
      };
      addMessage(conv.id, assistantMessage);
    } catch {
      const fallback: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "⚠️ Could not reach the backend. Make sure it's running at `localhost:8000`.\n\nStart it with:\n```bash\ncd backend && .\\venv\\Scripts\\python main.py\n```",
        timestamp: new Date().toISOString(),
      };
      addMessage(conv.id, fallback);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachments, activeConversation, createConversation, addMessage, backendUrl, apiKey, isLoading]);

  /* ── Suggestion click ── */
  const handleSuggestion = (text: string) => {
    const cleaned = text.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]+\s*/u, "");
    setInput(cleaned);
    setTimeout(() => textareaRef.current?.focus(), 50);
  };

  /* ── Key handler ── */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /* ── Copy message ── */
  const copyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const messages = activeConversation?.messages || [];
  const isEmpty = messages.length === 0;

  return (
    <div style={{ position: "relative", width: "100%", height: "100dvh", overflow: "hidden" }}>
      {/* Cosmic background */}
      <div className="cosmic-bg" />

      {/* Conversation drawer overlay */}
      <div className={`conv-overlay ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen(false)} />

      {/* Conversation drawer */}
      <div className={`conv-drawer ${drawerOpen ? "open" : ""}`}>
        <div style={{ padding: "20px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: "rgba(255,255,255,0.85)" }}>Conversations</span>
          <button
            onClick={() => { createConversation(); setDrawerOpen(false); }}
            style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 12, fontWeight: 500, cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
          >
            <PlusIcon /> New
          </button>
        </div>
        <div style={{ padding: "0 8px", overflow: "auto", flex: 1 }}>
          {conversations.length === 0 && (
            <p style={{ padding: "16px 8px", fontSize: 13, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>No conversations yet</p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`conv-item ${activeConversation?.id === c.id ? "active" : ""}`}
              onClick={() => { setActiveConversation(c); setDrawerOpen(false); }}
            >
              {c.title || "New Chat"}
            </div>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", height: "100dvh", maxWidth: 820, margin: "0 auto", padding: "0 12px" }}>

        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 4px", flexShrink: 0 }}>
          <button className="action-btn" onClick={() => setDrawerOpen(true)} aria-label="Menu" style={{ width: 38, height: 38 }}>
            <MenuIcon />
          </button>
          <h1 style={{ fontSize: 16, fontWeight: 600, letterSpacing: "-0.01em", color: "rgba(255,255,255,0.9)" }}>
            AI Second Brain
          </h1>
          <button
            className="action-btn"
            onClick={() => { createConversation(); }}
            aria-label="New chat"
            style={{ width: 38, height: 38 }}
          >
            <PlusIcon />
          </button>
        </header>

        {/* Messages area */}
        <div style={{ flex: 1, overflow: "auto", paddingBottom: 8 }}>
          {isEmpty ? (
            /* ── Empty state with orb ── */
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 28, padding: "0 20px" }}>
              <div className={`orb-container ${isLoading ? "orb-listening" : ""}`}>
                <div className="orb-glow" />
                <div className="orb-sphere" />
                <div className="orb-ring" />
              </div>
              <div style={{ textAlign: "center" }}>
                <h2 style={{ fontSize: "clamp(22px, 5vw, 30px)", fontWeight: 700, color: "rgba(255,255,255,0.92)", lineHeight: 1.25 }}>
                  Hey, what can I do
                </h2>
                <p style={{ fontSize: "clamp(20px, 4.5vw, 28px)", fontWeight: 500, color: "rgba(255,255,255,0.45)", marginTop: 4 }}>
                  for you today?
                </p>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 420 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSuggestion(s)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.08)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 13,
                      cursor: "pointer",
                      transition: "all 0.2s",
                      whiteSpace: "nowrap",
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(99,102,241,0.12)";
                      (e.target as HTMLButtonElement).style.borderColor = "rgba(99,102,241,0.3)";
                      (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.9)";
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)";
                      (e.target as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.08)";
                      (e.target as HTMLButtonElement).style.color = "rgba(255,255,255,0.6)";
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* ── Message list ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "8px 0" }}>
              {messages.map((msg, i) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className="animate-msg"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: isUser ? "flex-end" : "flex-start",
                      animationDelay: `${Math.min(i * 0.04, 0.3)}s`,
                    }}
                  >
                    <div
                      className={isUser ? "msg-user" : "msg-ai"}
                      style={{
                        maxWidth: "85%",
                        padding: "12px 16px",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                      }}
                    >
                      {/* Attachments preview */}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
                          {msg.attachments.map((a) => (
                            <span key={a.id} className="attachment-chip">
                              <FileIcon />
                              {a.name.length > 25 ? a.name.substring(0, 22) + "..." : a.name}
                            </span>
                          ))}
                        </div>
                      )}

                      {isUser ? (
                        <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(255,255,255,0.92)" }}>{msg.content}</p>
                      ) : (
                        <div className="markdown-content" style={{ fontSize: 14, color: "rgba(255,255,255,0.82)" }}>
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Sources */}
                      {msg.sources && msg.sources.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6, display: "flex", alignItems: "center", gap: 4 }}>
                            <FileIcon /> Sources
                          </p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {msg.sources.map((src, idx) => (
                              <div key={idx} className="source-card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <span style={{ fontSize: 12, fontWeight: 500, color: "#818cf8" }}>{src.docName}</span>
                                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{src.snippet}</p>
                                </div>
                                {src.docId && (
                                  <a href={`http://localhost:8000/api/documents/file/${src.docId}`} target="_blank" rel="noopener noreferrer" className="view-btn">
                                    <FileIcon /> View
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Meta row */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "3px 4px", marginTop: 2 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>{formatTime(msg.timestamp)}</span>
                      {!isUser && (
                        <button onClick={() => copyMessage(msg.content)} style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.2)", display: "flex", padding: 2 }} title="Copy">
                          <CopyIcon />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Typing indicator */}
              {isLoading && (
                <div className="animate-msg" style={{ display: "flex", alignItems: "flex-start" }}>
                  <div className="msg-ai" style={{ padding: "14px 20px", borderRadius: "18px 18px 18px 4px", display: "flex", gap: 5 }}>
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                    <div className="typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div style={{ flexShrink: 0, paddingBottom: "max(12px, env(safe-area-inset-bottom))", paddingTop: 6 }}>
          {/* Attachment chips */}
          {attachments.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8, paddingLeft: 4 }}>
              {attachments.map((f, i) => (
                <span key={i} className="attachment-chip">
                  <FileIcon />
                  {f.name.length > 20 ? f.name.substring(0, 18) + "..." : f.name}
                  <button onClick={() => removeAttachment(i)}>×</button>
                </span>
              ))}
            </div>
          )}

          {/* Input bar */}
          <div className="input-bar" style={{ display: "flex", alignItems: "flex-end", gap: 8, borderRadius: 24, padding: "8px 8px 8px 16px", transition: "all 0.2s" }}>
            <button className="action-btn" onClick={() => fileInputRef.current?.click()} aria-label="Attach file" style={{ width: 38, height: 38, marginBottom: 2 }}>
              <PaperclipIcon />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask anything, upload a file, or store a memory..."
              rows={1}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                outline: "none",
                color: "rgba(255,255,255,0.9)",
                fontSize: 14,
                lineHeight: 1.5,
                resize: "none",
                padding: "8px 0",
                minHeight: 20,
                maxHeight: 120,
                fontFamily: "inherit",
              }}
            />
            <button className="send-btn" onClick={handleSend} disabled={isLoading && !input.trim() && attachments.length === 0} aria-label="Send" style={{ marginBottom: 2 }}>
              <SendIcon />
            </button>
          </div>

          <p style={{ textAlign: "center", fontSize: 11, color: "rgba(255,255,255,0.15)", marginTop: 8, paddingBottom: 2 }}>
            Upload documents & images • Store memories • Retrieve anything
          </p>
        </div>
      </div>
    </div>
  );
}
