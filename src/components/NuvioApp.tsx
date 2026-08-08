"use client";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { AIOrb, type OrbState } from "@/components/ai/AIOrb";
import { AIAmbientBackground } from "@/components/ai/AIAmbientBackground";
import { ArrowDown, Bell, BookOpen, Brain, BriefcaseBusiness, Check, ChevronRight, Edit2, FileText, FolderKanban, Grid2X2, LayoutDashboard, Menu, MessageSquare, Mic, Paperclip, Pencil, Plus, Search, Send, Settings, Sparkles, Trash2, Users, X, Zap } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Sidebar, Page, navItems, StudyRoomSummary } from "@/components/Sidebar";
import { SettingsPage } from "@/components/SettingsPage";
import { StudyPage } from "@/components/StudyPage";

const API = "http://localhost:8000";
const ALT_API = "http://127.0.0.1:8000";

async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  try {
    const res = await fetch(`${API}${path}`, options);
    return res;
  } catch (err) {
    try {
      return await fetch(`${ALT_API}${path}`, options);
    } catch {
      throw err;
    }
  }
}

type Message = { role: "user" | "assistant"; text: string; sources?: { title: string; type: string; detail: string; docId?: string }[]; attachments?: { name: string }[] };
type BackendDoc = { id: string; filename: string; category: string; user_note?: string; size?: number; uploaded_at?: string; file_path?: string };
type BackendMem = { id: string; content: string; category?: string; created_at?: string; doc_id?: string; filename?: string };
type BackendConv = { id: string; title: string; created_at?: string; updated_at?: string; last_message_at?: string; message_count?: number; last_message_preview?: string };

const defaultPrompts = ["Show my documents", "Find my Aadhaar card", "What did I store?", "Show my resume"];

export function NuvioApp() {
  const [page, setPage] = useState<Page>("home");
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("nuvio_sidebar_collapsed") === "true";
    }
    return false;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("nuvio_sidebar_collapsed", String(isCollapsed));
    }
  }, [isCollapsed]);

  const [sidebar, setSidebar] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [voice, setVoice] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState<"idle" | "listening" | "error">("idle");
  const [level, setLevel] = useState(.24);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [realDocs, setRealDocs] = useState<BackendDoc[]>([]);
  const [realMemories, setRealMemories] = useState<BackendMem[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);

  // Conversation History state
  const [conversations, setConversations] = useState<BackendConv[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editTitleInput, setEditTitleInput] = useState("");
  const [chatSearch, setChatSearch] = useState("");

  // Study Rooms state
  const [studyRooms, setStudyRooms] = useState<StudyRoomSummary[]>([]);
  const [activeStudyRoomId, setActiveStudyRoomId] = useState<string | null>(null);

  function handleNewStudyRoom() {
    setPage("study");
    setActiveConvId(null);
    setActiveStudyRoomId("NEW_ROOM_" + Date.now());
  }

  function handleSelectStudyRoom(id: string) {
    setPage("study");
    setActiveConvId(null);
    setActiveStudyRoomId(id);
  }

  function handleDeleteStudyRoom(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const saved = localStorage.getItem("nuvio_study_rooms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const updated = parsed.filter((r: any) => r.id !== id);
          localStorage.setItem("nuvio_study_rooms", JSON.stringify(updated));
          setStudyRooms(updated.map((r: any) => ({ id: r.id, title: r.title, subject: r.subject, resource_count: r.resources?.length || 0 })));
        }
      }
    } catch {}
    if (activeStudyRoomId === id) {
      setActiveStudyRoomId(null);
    }
  }

  function handleRenameStudyRoom(id: string, newTitle: string) {
    try {
      const saved = localStorage.getItem("nuvio_study_rooms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const updated = parsed.map((r: any) => (r.id === id ? { ...r, title: newTitle } : r));
          localStorage.setItem("nuvio_study_rooms", JSON.stringify(updated));
          setStudyRooms(updated.map((r: any) => ({ id: r.id, title: r.title, subject: r.subject, resource_count: r.resources?.length || 0 })));
        }
      }
    } catch {}
  }

  const fileRef = useRef<HTMLInputElement>(null);
  const chatFileRef = useRef<HTMLInputElement>(null);
  const media = useRef<MediaStream | null>(null);
  const raf = useRef<number | null>(null);
  const feedEnd = useRef<HTMLDivElement>(null);

  // Fetch real data from backend
  const fetchDocs = useCallback(async () => { try { const r = await apiFetch("/api/documents"); if (r.ok) setRealDocs(await r.json()); } catch { } }, []);
  const fetchMems = useCallback(async () => { try { const r = await apiFetch("/api/memories"); if (r.ok) setRealMemories(await r.json()); } catch { } }, []);

  // Fetch conversations from backend
  const fetchConversations = useCallback(async () => {
    try {
      const r = await apiFetch("/api/conversations");
      if (r.ok) {
        const data = await r.json();
        setConversations(data.conversations || []);
      }
    } catch { }
  }, []);

  useEffect(() => {
    fetchDocs();
    fetchMems();
    fetchConversations();
  }, [fetchDocs, fetchMems, fetchConversations]);

  useEffect(() => { feedEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const stopVoice = useCallback(() => { media.current?.getTracks().forEach(t => t.stop()); media.current = null; if (raf.current) cancelAnimationFrame(raf.current); setVoiceStatus("idle"); setVoice(false); }, []);
  useEffect(() => { const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setSearchOpen(true); } if (e.key === "Escape") { setSearchOpen(false); if (voice) stopVoice(); } }; window.addEventListener("keydown", key); return () => window.removeEventListener("keydown", key); }, [stopVoice, voice]);
  useEffect(() => () => { media.current?.getTracks().forEach(t => t.stop()); }, []);

  async function startVoice() { setVoice(true); try { const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); media.current = stream; const audio = new AudioContext(); const source = audio.createMediaStreamSource(stream); const analyser = audio.createAnalyser(); analyser.fftSize = 256; source.connect(analyser); const data = new Uint8Array(analyser.frequencyBinCount); const tick = () => { analyser.getByteFrequencyData(data); setLevel(Math.min(.9, .18 + data.reduce((a, b) => a + b, 0) / data.length / 255)); raf.current = requestAnimationFrame(tick); }; tick(); setVoiceStatus("listening"); } catch { setVoiceStatus("error"); } }

  // Load a single conversation's history
  async function loadConversation(convId: string) {
    try {
      setLoading(true);
      setActiveConvId(convId);
      if (typeof window !== "undefined") {
        localStorage.setItem("nuvio_active_conv_id", convId);
      }
      setPage("home");
      setSidebar(false);
      const res = await apiFetch(`/api/conversations/${convId}`);
      if (res.ok) {
        const data = await res.json();
        const msgs: Message[] = (data.messages || []).map((m: any) => ({
          role: m.role,
          text: m.content || m.text || "",
          sources: m.sources,
        }));
        setMessages(msgs);
      } else {
        // If saved conversation ID does not exist on backend (e.g. 404), reset state cleanly
        setActiveConvId(null);
        setMessages([]);
        if (typeof window !== "undefined") {
          localStorage.removeItem("nuvio_active_conv_id");
        }
      }
    } catch (e) {
      console.error("Failed to load conversation", e);
      setActiveConvId(null);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  // Fetch initial data & restore active conversation if saved
  useEffect(() => {
    fetchDocs();
    fetchMems();
    fetchConversations().then(() => {
      if (typeof window !== "undefined") {
        const savedId = localStorage.getItem("nuvio_active_conv_id");
        if (savedId && savedId !== "NEW_CHAT") {
          loadConversation(savedId);
        }
      }
    });
  }, [fetchDocs, fetchMems, fetchConversations]);

  // Start New Chat
  function handleNewChat() {
    setActiveConvId(null);
    setMessages([]);
    setPage("home");
    setSidebar(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("nuvio_active_conv_id", "NEW_CHAT");
    }
  }

  // Rename Conversation
  async function handleRename(convId: string, e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!editTitleInput.trim()) return;
    try {
      await apiFetch(`/api/conversations/${convId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: editTitleInput.trim() }),
      });
      setEditingConvId(null);
      fetchConversations();
    } catch { }
  }

  // Delete Conversation
  async function handleDeleteConv(convId: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Delete this conversation?")) return;
    try {
      await apiFetch(`/api/conversations/${convId}`, { method: "DELETE" });
      if (activeConvId === convId) {
        handleNewChat();
      }
      fetchConversations();
    } catch { }
  }

  // REAL send — calls backend /api/conversations/{id}/chat or creates a new conversation
  async function send(text = input) {
    const query = text.trim();
    if (!query && pendingFiles.length === 0) return;
    if (loading) return;
    setInput("");
    const userMsg: Message = { role: "user", text: query, attachments: pendingFiles.map(f => ({ name: f.name })) };
    setMessages(m => [...m, userMsg]);
    setLoading(true);
    const filesToUpload = [...pendingFiles];
    setPendingFiles([]);

    try {
      // Upload attached files first
      for (const file of filesToUpload) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("user_note", query || `Uploaded: ${file.name}`);
        try { await apiFetch(`/api/documents/upload`, { method: "POST", body: fd }); } catch { }
      }

      let currentConvId = activeConvId;

      // If no active conversation, create one on the backend first
      if (!currentConvId) {
        try {
          const createRes = await apiFetch(`/api/conversations`, { method: "POST" });
          if (createRes.ok) {
            const newConv = await createRes.json();
            currentConvId = newConv.id;
            setActiveConvId(currentConvId);
            if (typeof window !== "undefined" && currentConvId) {
              localStorage.setItem("nuvio_active_conv_id", currentConvId);
            }
          }
        } catch { }
      }

      // Execute Chat API (persistent or fallback)
      let endpoint = currentConvId ? `/api/conversations/${currentConvId}/chat` : `/api/chat`;
      let chatRes = await apiFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: query, history: messages.slice(-6).map(m => ({ role: m.role, content: m.text })) }),
      });

      // If 404 because conversation ID was stale/deleted, fallback cleanly to /api/chat
      if (chatRes.status === 404 && currentConvId) {
        setActiveConvId(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem("nuvio_active_conv_id");
        }
        endpoint = `/api/chat`;
        chatRes = await apiFetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: query, history: messages.slice(-6).map(m => ({ role: m.role, content: m.text })) }),
        });
      }

      if (!chatRes.ok) throw new Error("Backend error");
      const data = await chatRes.json();

      if (data.conversation_id && !activeConvId) {
        setActiveConvId(data.conversation_id);
        if (typeof window !== "undefined") {
          localStorage.setItem("nuvio_active_conv_id", data.conversation_id);
        }
      }

      const sources = (data.sources || []).filter((s: any) => s.docId || s.docName).map((s: any) => ({
        title: s.docName || "Document", type: "Document", detail: (s.snippet || "").slice(0, 60), docId: s.docId || "",
      }));

      setMessages(m => [...m, { role: "assistant", text: data.response || "No response.", sources: sources.length > 0 ? sources : undefined }]);
      fetchDocs();
      fetchMems();
      fetchConversations();
    } catch {
      setMessages(m => [...m, { role: "assistant", text: "⚠️ Could not reach backend. Make sure it's running on localhost:8000." }]);
    } finally {
      setLoading(false);
    }
  }

  function handleChatFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    setPendingFiles(prev => [...prev, ...files]);
    if (chatFileRef.current) chatFileRef.current.value = "";
  }

  function openPreview(name: string, docId?: string) { setPreview(name); setPreviewId(docId || null); }

  const handleStudyRoomsChange = useCallback((rooms: StudyRoomSummary[]) => {
    setStudyRooms(rooms);
  }, []);

  function renderContent() {
    if (page === "home") return <Home messages={messages} input={input} setInput={setInput} send={send} loading={loading} voice={voice} voiceStatus={voiceStatus} level={level} onVoice={startVoice} onStopVoice={stopVoice} onPreview={openPreview} pendingFiles={pendingFiles} setPendingFiles={setPendingFiles} chatFileRef={chatFileRef} onChatFile={handleChatFile} feedEnd={feedEnd} />;
    if (page === "documents") return <Documents docs={realDocs} onPreview={openPreview} onDelete={async (id) => { try { await apiFetch(`/api/documents/${id}`, { method: "DELETE" }); fetchDocs(); fetchMems(); } catch { } }} onUpload={async () => { fileRef.current?.click(); }} fileRef={fileRef} onFileChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; const fd = new FormData(); fd.append("file", file); fd.append("user_note", ""); try { await apiFetch(`/api/documents/upload`, { method: "POST", body: fd }); fetchDocs(); } catch { } if (fileRef.current) fileRef.current.value = ""; }} />;
    if (page === "memory") return <Memory memories={realMemories} onDelete={async (id) => { try { await apiFetch(`/api/memories/${id}`, { method: "DELETE" }); fetchMems(); } catch { } }} onAdd={async (text) => { try { await apiFetch(`/api/memories`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: text }) }); fetchMems(); } catch { } }} />;
    if (page === "study") return <StudyPage activeRoomId={activeStudyRoomId} onSelectRoom={handleSelectStudyRoom} onRoomsChange={handleStudyRoomsChange} />;
    if (page === "settings") return <SettingsPage />;
    return <Collection page={page} />;
  }

  const activeTitle = page === "home"
    ? (activeConvId ? conversations.find(c => c.id === activeConvId)?.title || "AI Assistant" : "AI Assistant")
    : (page === "settings" ? "Settings" : navItems.find(n => n.id === page)?.label || "Collection");

  return (
    <main className="nuvio-shell">
      <div className="nuvio-background" />

      <Sidebar
        activePage={page}
        setActivePage={setPage}
        activeConvId={activeConvId}
        setActiveConvId={setActiveConvId}
        conversations={conversations}
        editingConvId={editingConvId}
        setEditingConvId={setEditingConvId}
        editTitleInput={editTitleInput}
        setEditTitleInput={setEditTitleInput}
        handleNewChat={handleNewChat}
        loadConversation={loadConversation}
        handleRename={handleRename}
        handleDeleteConv={handleDeleteConv}
        realDocsCount={realDocs.length}
        realMemoriesCount={realMemories.length}
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
        mobileSidebarOpen={sidebar}
        setMobileSidebarOpen={setSidebar}
        studyRooms={studyRooms}
        activeStudyRoomId={activeStudyRoomId}
        onNewStudyRoom={handleNewStudyRoom}
        onSelectStudyRoom={handleSelectStudyRoom}
        onDeleteStudyRoom={handleDeleteStudyRoom}
        onRenameStudyRoom={handleRenameStudyRoom}
      />

      <section className="nuvio-main">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setSidebar(true)} aria-label="Open mobile menu"><Menu size={20} /></button>
          <div>
            <span className="eyebrow">{page === "home" ? "YOUR PRIVATE INTELLIGENCE" : "KNOWLEDGE BASE"}</span>
            <h1>{activeTitle}</h1>
          </div>
          <div className="top-actions">
            <button onClick={() => setSearchOpen(true)} aria-label="Search"><Search size={19} /><kbd>⌘ K</kbd></button>
            <button aria-label="Notifications"><Bell size={19} /></button>
            <button className="profile"><span className="avatar">T</span><ChevronRight size={15} /></button>
          </div>
        </header>
        <AnimatePresence mode="wait">
          <motion.div
            key={page + (activeConvId || "")}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeInOut" }}
            style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, height: "100%", overflow: "hidden" }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </section>

      <AnimatePresence>
        {searchOpen && <SearchModal docs={realDocs} memories={realMemories} onClose={() => setSearchOpen(false)} onNavigate={(p) => { setPage(p); setSearchOpen(false); }} />}
        {preview && <Preview name={preview} docId={previewId} onClose={() => { setPreview(null); setPreviewId(null); }} />}
      </AnimatePresence>
    </main>
  );
}

function Home({ messages, input, setInput, send, loading, voice, voiceStatus, level, onVoice, onStopVoice, onPreview, pendingFiles, setPendingFiles, chatFileRef, onChatFile, feedEnd }: { messages: Message[]; input: string; setInput: (v: string) => void; send: (v?: string) => void; loading: boolean; voice: boolean; voiceStatus: "idle" | "listening" | "error"; level: number; onVoice: () => void; onStopVoice: () => void; onPreview: (n: string, id?: string) => void; pendingFiles: File[]; setPendingFiles: (f: File[]) => void; chatFileRef: React.RefObject<HTMLInputElement | null>; onChatFile: (e: React.ChangeEvent<HTMLInputElement>) => void; feedEnd: React.RefObject<HTMLDivElement | null> }) {
  const landing = messages.length === 0;
  const orbState: OrbState = loading ? "thinking" : voiceStatus === "error" ? "error" : voiceStatus === "listening" ? "listening" : "idle";
  
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const [showScrollDown, setShowScrollDown] = useState(false);

  const checkScroll = useCallback(() => {
    const el = chatFeedRef.current;
    if (!el) return;
    const isScrollable = el.scrollHeight > el.clientHeight + 20;
    const isNotAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight > 40;
    setShowScrollDown(isScrollable && isNotAtBottom);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = chatFeedRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => el.removeEventListener("scroll", checkScroll);
  }, [checkScroll, messages, loading]);

  const scrollToBottom = () => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({ top: chatFeedRef.current.scrollHeight, behavior: "smooth" });
    }
    if (feedEnd.current) {
      feedEnd.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className={`assistant-stage ${landing ? "landing" : "chatting"}`}>
      <AIAmbientBackground active={!landing || voice} isGenerating={loading} isVoiceActive={voiceStatus === "listening"} />
      <AnimatePresence mode="wait">
        {voice ? (
          <motion.div key="voice" className="voice-mode" initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .97 }}>
            <span className="voice-label">{voiceStatus === "error" ? "Microphone unavailable" : "Listening…"}</span>
            <AIOrb state={orbState} level={level} />
            <p>{voiceStatus === "error" ? "Allow microphone access, then try again." : "Speak naturally. I'm listening."}</p>
            <button className="voice-stop" onClick={onStopVoice}><Mic size={21} /><span>End voice session</span></button>
          </motion.div>
        ) : landing ? (
          <motion.div key="landing" className="hero" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="hero-grid" />
            <AIOrb state={orbState} />
            <div className="hero-copy">
              <h2>Hey, what can I help you <em>find?</em></h2>
              <p>Search your knowledge. Talk to your second brain.</p>
            </div>
            <div className="suggestions">
              {defaultPrompts.map(p => <button key={p} onClick={() => send(p)}><Sparkles size={14} />{p}</button>)}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            className="chat-feed"
            ref={chatFeedRef}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {messages.map((m, i) => (
              <div className={`message message--${m.role}`} key={i}>
                {m.role === "assistant" && (
                  <span className="message-orb">
                    <AIOrb size="small" state="success" />
                  </span>
                )}
                <div className="message-card">
                  {m.attachments && m.attachments.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                      {m.attachments.map((a, j) => (
                        <span key={j} style={{ fontSize: 11, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 12, padding: "2px 8px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          <FileText size={12} />{a.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.role === "user" ? (
                    <p>{m.text}</p>
                  ) : (
                    <div className="markdown-content">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          a: ({ node, ...props }) => (
                            <a target="_blank" rel="noopener noreferrer" style={{ color: "#38bdf8", textDecoration: "underline", fontWeight: 500 }} {...props} />
                          )
                        }}
                      >
                        {m.text}
                      </ReactMarkdown>
                    </div>
                  )}
                  {m.sources && (
                    <div className="sources">
                      <span>Grounded in your knowledge</span>
                      {m.sources.map(s => (
                        <button key={s.title + s.docId} className="source" onClick={() => onPreview(s.title, s.docId)}>
                          <FileText size={18} />
                          <div><b>{s.title}</b><small>{s.type} · {s.detail}</small></div>
                          <ChevronRight size={16} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {loading && (
              <div className="retrieval">
                <AIOrb size="small" state="thinking" />
                <div><b>Searching your knowledge</b><span>Retrieving relevant memories and documents…</span></div>
              </div>
            )}
            <div ref={feedEnd} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Down Arrow Scroll to Bottom Button */}
      <AnimatePresence>
        {showScrollDown && !voice && (
          <motion.button
            key="scroll-down-btn"
            initial={{ opacity: 0, y: 10, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.85 }}
            transition={{ duration: 0.15 }}
            className="scroll-to-bottom-btn"
            onClick={scrollToBottom}
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <ArrowDown size={18} />
          </motion.button>
        )}
      </AnimatePresence>

      {!voice && (
        <>
          {pendingFiles.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, padding: "0 16px 6px" }}>
              {pendingFiles.map((f, i) => (
                <span key={i} style={{ fontSize: 11, background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.25)", borderRadius: 14, padding: "3px 10px", display: "inline-flex", alignItems: "center", gap: 4, color: "rgba(255,255,255,0.8)" }}>
                  <FileText size={12} />{f.name.length > 20 ? f.name.slice(0, 18) + "..." : f.name}
                  <button onClick={() => setPendingFiles(pendingFiles.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>×</button>
                </span>
              ))}
            </div>
          )}
          <div className="composer">
            <button aria-label="Attach document" onClick={() => chatFileRef.current?.click()}><Paperclip size={19} /></button>
            <input ref={chatFileRef} type="file" multiple accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp" onChange={onChatFile} style={{ display: "none" }} />
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && send()} placeholder={landing ? "Ask anything about your knowledge…" : "Continue the conversation…"} />
            <button className="mic" onClick={onVoice} aria-label="Start voice mode"><Mic size={18} /></button>
            <button className="send" onClick={() => send()} aria-label="Send message"><Send size={17} /></button>
          </div>
        </>
      )}
      <p className="privacy"><Zap size={12} /> Private by design · Your knowledge stays yours</p>
    </div>
  );
}

function Documents({ docs, onPreview, onDelete, onUpload, fileRef, onFileChange }: { docs: BackendDoc[]; onPreview: (n: string, id?: string) => void; onDelete: (id: string) => void; onUpload: () => void; fileRef: React.RefObject<HTMLInputElement | null>; onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  const sizeStr = (b?: number) => b ? `${(b / 1024).toFixed(1)} KB` : "";
  const timeStr = (t?: string) => { try { return t ? new Date(t).toLocaleDateString() : ""; } catch { return ""; } };
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">PERSONAL LIBRARY</span><h2>Documents that power your AI</h2><p>Everything stored in your knowledge base.</p></div><button className="primary" onClick={onUpload}><Plus size={17} /> Upload documents</button><input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.jpg,.jpeg,.png,.gif,.webp" onChange={onFileChange} style={{ display: "none" }} /></div><button className="upload-zone" onClick={onUpload}><span><FileText size={26} /></span><div><b>Drop files into your knowledge base</b><p>PDF, DOCX, TXT, images (JPG, PNG, WEBP)</p></div><strong>Browse files</strong></button>{docs.length === 0 ? <div className="empty-collection"><AIOrb size="small" /><h3>No documents yet</h3><p>Upload your first document to get started.</p></div> : <div className="document-grid">{docs.map(d => <div className="doc-card" key={d.id} style={{ position: "relative", cursor: "pointer" }} onClick={() => onPreview(d.filename, d.id)}><button onClick={(e) => { e.stopPropagation(); onDelete(d.id); }} title="Delete document" style={{ position: "absolute", top: 12, right: 12, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: 6, color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10 }}><Trash2 size={14} /></button><span className="doc-icon violet"><FileText size={24} /></span><b>{d.filename}</b><small>{d.category} · {sizeStr(d.size)}</small>{d.user_note && <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>📝 {d.user_note}</p>}<div><i>Indexed</i><span>{timeStr(d.uploaded_at)}</span></div></div>)}</div>}</div>;
}

function Memory({ memories, onDelete, onAdd }: { memories: BackendMem[]; onDelete: (id: string) => void; onAdd: (text: string) => void }) {
  const [add, setAdd] = useState("");
  return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">CURATED CONTEXT</span><h2>Your Memory</h2><p>Everything stored in your knowledge base memory.</p></div></div><div className="memory-add"><Brain size={21} /><input value={add} onChange={e => setAdd(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && add.trim()) { onAdd(add.trim()); setAdd(""); } }} placeholder="Tell Nuvio something worth remembering…" /><button className="primary" onClick={() => { if (add.trim()) { onAdd(add.trim()); setAdd("") } }}>Save memory</button></div>{memories.length === 0 ? <div className="empty-collection"><AIOrb size="small" /><h3>No memories yet</h3><p>Store something via chat or add one above.</p></div> : <div className="memory-list">{memories.map(m => <article key={m.id} className="memory-card"><span><Brain size={18} /></span><div><p>{m.content}</p><small>{m.category || "Memory"} · {m.created_at ? new Date(m.created_at).toLocaleDateString() : "Today"}{m.filename ? ` · 📎 ${m.filename}` : ""}</small></div><button onClick={() => onDelete(m.id)}><X size={16} /></button></article>)}</div>}</div>
}

function Collection({ page }: { page: Page }) { const title = navItems.find(n => n.id === page)?.label || "Workspace"; return <div className="page-wrap"><div className="page-heading"><div><span className="eyebrow">KNOWLEDGE WORKSPACE</span><h2>{title}</h2><p>Your AI-connected workspace.</p></div></div><div className="empty-collection"><AIOrb size="small" /><h3>Your {title.toLowerCase()} space is ready.</h3><p>Use the chat to store and retrieve information.</p></div></div> }

function SearchModal({ docs, memories, onClose, onNavigate }: { docs: BackendDoc[]; memories: BackendMem[]; onClose: () => void; onNavigate: (p: Page) => void }) {
  const [q, setQ] = useState("");
  const filtered = q ? docs.filter(d => `${d.filename} ${d.category} ${d.user_note || ""}`.toLowerCase().includes(q.toLowerCase())) : docs.slice(0, 5);
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.div className="search-modal" initial={{ scale: .96, y: 14 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96, y: 14 }} onMouseDown={e => e.stopPropagation()}><div><Search size={21} /><input autoFocus value={q} onChange={e => setQ(e.target.value)} placeholder="Search your entire knowledge base…" /><kbd>ESC</kbd></div><p>{q ? `Results for "${q}"` : `${docs.length} documents · ${memories.length} memories`}</p>{filtered.length > 0 ? filtered.map(d => <button key={d.id} onClick={() => onNavigate("documents")}><span><FileText size={17} /></span><div><b>{d.filename}</b><small>{d.category}{d.user_note ? ` · ${d.user_note}` : ""}</small></div><ChevronRight size={16} /></button>) : <p style={{ padding: "16px", textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13 }}>No results</p>}</motion.div></motion.div>
}

function Preview({ name, docId, onClose }: { name: string; docId?: string | null; onClose: () => void }) {
  const url = docId ? `${API}/api/documents/file/${docId}` : null;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(name);
  return <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}><motion.div className="preview-modal" initial={{ scale: .96 }} animate={{ scale: 1 }} onMouseDown={e => e.stopPropagation()}><button onClick={onClose}><X size={18} /></button>{isImage && url ? <img src={url} alt={name} style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 12, margin: "12px 0" }} /> : <span className="preview-icon"><FileText size={30} /></span>}<h3>{name}</h3><p>Document in your knowledge base</p>{url && <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 12, padding: "8px 18px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 10, color: "#fff", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>📥 View / Download</a>}<small style={{ marginTop: 12, display: "block" }}>Indexed by Nuvio · Available as a source in conversations.</small></motion.div></motion.div>
}
