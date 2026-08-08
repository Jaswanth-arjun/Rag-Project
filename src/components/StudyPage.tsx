"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen,
  Plus,
  Trash2,
  Upload,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Send,
  ListChecks,
  Lightbulb,
  Award,
  CheckCircle2,
  Paperclip,
  X,
  FileDown,
  RefreshCw,
  ArrowDown,
  FolderOpen,
  Edit2,
  Check
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AIOrb } from "@/components/ai/AIOrb";

export interface StudyResource {
  id: string;
  name: string;
  type: "pdf" | "image" | "document" | "other";
  size?: string;
  uploadedAt: string;
  docId?: string;
}

export interface StudyMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  sources?: string[];
  timestamp: string;
}

export interface StudyRoom {
  id: string;
  title: string;
  subject: string;
  unitOrTopic: string;
  createdAt: string;
  resources: StudyResource[];
  messages: StudyMessage[];
}

const DEFAULT_ROOMS: StudyRoom[] = [];

const DRAFT_WELCOME_MSG: StudyMessage = {
  id: "welcome-msg",
  role: "assistant",
  text: `🎯 **Study Room Ready!**\n\nUpload your study materials (PDFs, textbook images, or notes) using the **Paperclip** icon below. Ask me to:\n- 📋 List Unit topics (*"What are the topics in Unit 1?"*)\n- 💡 Explain any specific concept (*"Explain..."*)\n- 🔍 Re-explain in simpler terms (*"Explain it more clearly"*)\n- 📝 Generate all 2-mark or 5-mark exam Q&As!`,
  timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
};

const DRAFT_ROOM: StudyRoom = {
  id: "DRAFT",
  title: "New Study Session",
  subject: "General Study",
  unitOrTopic: "Unit 1",
  createdAt: new Date().toISOString(),
  resources: [],
  messages: [DRAFT_WELCOME_MSG],
};

interface StudyPageProps {
  activeRoomId?: string | null;
  onSelectRoom?: (id: string) => void;
  onRoomsChange?: (rooms: { id: string; title: string; subject?: string; resource_count?: number }[]) => void;
}

export function StudyPage({ activeRoomId: externalActiveId, onSelectRoom, onRoomsChange }: StudyPageProps) {
  const [rooms, setRooms] = useState<StudyRoom[]>(() => {
    if (typeof window === "undefined") return DEFAULT_ROOMS;
    try {
      const saved = localStorage.getItem("nuvio_study_rooms");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Purge legacy sample rooms & un-messaged empty draft rooms
          const cleaned = parsed.filter(
            (r: any) =>
              r.id !== "sample-dbms-1" &&
              !r.title?.includes("DBMS Unit 1") &&
              !((r.title === "New Study Room" || r.title === "New Study Session") &&
                (!r.resources || r.resources.length === 0) &&
                (!r.messages || !r.messages.some((m: any) => m.role === "user")))
          );
          return cleaned;
        }
      }
    } catch {
      // fallback
    }
    return DEFAULT_ROOMS;
  });

  const [activeId, setActiveId] = useState<string>(() => {
    if (externalActiveId && (externalActiveId === "DRAFT" || externalActiveId.startsWith("NEW_ROOM_"))) {
      return "DRAFT";
    }
    if (externalActiveId && rooms.some((r) => r.id === externalActiveId)) return externalActiveId;
    return rooms[0]?.id || "DRAFT";
  });

  // Sync external active ID if changed from sidebar
  useEffect(() => {
    if (externalActiveId === "DRAFT" || (externalActiveId && externalActiveId.startsWith("NEW_ROOM_"))) {
      setActiveId("DRAFT");
    } else if (externalActiveId && rooms.some((r) => r.id === externalActiveId)) {
      setActiveId(externalActiveId);
    } else if (!externalActiveId && rooms.length > 0) {
      setActiveId(rooms[0].id);
    } else if (!externalActiveId && rooms.length === 0) {
      setActiveId("DRAFT");
    }
  }, [externalActiveId, rooms]);

  // Ref decouple for onRoomsChange to prevent re-render loops
  const onRoomsChangeRef = useRef(onRoomsChange);
  useEffect(() => {
    onRoomsChangeRef.current = onRoomsChange;
  }, [onRoomsChange]);

  // Sync rooms to localStorage and parent callback
  useEffect(() => {
    try {
      localStorage.setItem("nuvio_study_rooms", JSON.stringify(rooms));
    } catch {}

    if (onRoomsChangeRef.current) {
      onRoomsChangeRef.current(
        rooms.map((r) => ({
          id: r.id,
          title: r.title,
          subject: r.subject,
          resource_count: r.resources.length,
        }))
      );
    }
  }, [rooms]);

  const activeRoom = rooms.find((r) => r.id === activeId) || DRAFT_ROOM;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showResourcesModal, setShowResourcesModal] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState("Unit 1");

  // Inline Title Editing state
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleInput, setTitleInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatFeedRef = useRef<HTMLDivElement>(null);
  const chatFeedEndRef = useRef<HTMLDivElement>(null);
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
  }, [checkScroll, activeRoom?.messages, loading]);

  const scrollToBottom = () => {
    if (chatFeedRef.current) {
      chatFeedRef.current.scrollTo({ top: chatFeedRef.current.scrollHeight, behavior: "smooth" });
    }
    if (chatFeedEndRef.current) {
      chatFeedEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeRoom?.messages?.length, loading]);

  // Rename Room Title
  const handleSaveTitle = () => {
    if (!activeRoom || !titleInput.trim()) return;
    setRooms((prev) =>
      prev.map((r) => (r.id === activeRoom.id ? { ...r, title: titleInput.trim() } : r))
    );
    setEditingTitle(false);
  };

  // Resource Upload Handler
  const handleUploadResource = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);

    const newResources: StudyResource[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const formData = new FormData();
      formData.append("file", file);
      formData.append("user_note", `Study Material for ${activeRoom.title}`);

      try {
        const res = await fetch("http://localhost:8000/api/documents/upload", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();
        const ext = file.name.split(".").pop()?.toLowerCase() || "";
        const fileType: StudyResource["type"] =
          ext === "pdf" ? "pdf" : ["jpg", "jpeg", "png", "webp", "bmp"].includes(ext) ? "image" : "document";

        newResources.push({
          id: crypto.randomUUID(),
          name: file.name,
          type: fileType,
          size: `${(file.size / 1024).toFixed(1)} KB`,
          uploadedAt: new Date().toISOString(),
          docId: data.document?.id,
        });
      } catch (err) {
        console.error("Resource upload failed", err);
      }
    }

    if (newResources.length > 0) {
      const firstFileName = newResources[0].name.replace(/\.[^/.]+$/, "");
      const assistantMsg: StudyMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: `✅ **Added ${newResources.length} Study Resource(s)**:\n${newResources
          .map((res) => `- 📄 \`${res.name}\``)
          .join("\n")}\n\nI have indexed all material using Multi-Engine OCR & PDF parsing. Ask me anything about your material!`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      if (activeId === "DRAFT" || !rooms.some((r) => r.id === activeId)) {
        // Commit Draft Room to History with First File Name
        const newRoomId = crypto.randomUUID();
        const newRoom: StudyRoom = {
          id: newRoomId,
          title: firstFileName,
          subject: "General Study",
          unitOrTopic: "Unit 1",
          createdAt: new Date().toISOString(),
          resources: newResources,
          messages: [DRAFT_WELCOME_MSG, assistantMsg],
        };
        setRooms((prev) => [newRoom, ...prev]);
        setActiveId(newRoomId);
        if (onSelectRoom) onSelectRoom(newRoomId);
      } else {
        // Update existing saved room
        setRooms((prev) =>
          prev.map((r) => {
            if (r.id === activeId) {
              const updatedTitle =
                r.title === "New Study Room" || r.title === "New Study Session" ? firstFileName : r.title;
              return {
                ...r,
                title: updatedTitle,
                resources: [...r.resources, ...newResources],
                messages: [...r.messages, assistantMsg],
              };
            }
            return r;
          })
        );
      }
    }

    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Remove single attached resource
  const handleRemoveResource = (resId: string) => {
    if (!activeRoom) return;
    setRooms((prev) =>
      prev.map((r) =>
        r.id === activeRoom.id ? { ...r, resources: r.resources.filter((res) => res.id !== resId) } : r
      )
    );
  };

  // Send Chat Query to AI Study Agent
  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || input;
    if (!textToSend.trim() || loading) return;

    const userMsg: StudyMessage = {
      id: crypto.randomUUID(),
      role: "user",
      text: textToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    let targetRoomId = activeId;
    let currentRoomTitle = activeRoom.title;

    if (activeId === "DRAFT" || !rooms.some((r) => r.id === activeId)) {
      // Commit draft room to real saved room with query-based title
      const newRoomId = crypto.randomUUID();
      const generatedTitle =
        textToSend.trim().length > 30 ? textToSend.trim().slice(0, 30) + "..." : textToSend.trim();
      const newRoom: StudyRoom = {
        id: newRoomId,
        title: generatedTitle,
        subject: "General Study",
        unitOrTopic: "Unit 1",
        createdAt: new Date().toISOString(),
        resources: [],
        messages: [DRAFT_WELCOME_MSG, userMsg],
      };
      targetRoomId = newRoomId;
      currentRoomTitle = generatedTitle;
      setRooms((prev) => [newRoom, ...prev]);
      setActiveId(newRoomId);
      if (onSelectRoom) onSelectRoom(newRoomId);
    } else {
      setRooms((prev) =>
        prev.map((r) => (r.id === targetRoomId ? { ...r, messages: [...r.messages, userMsg] } : r))
      );
    }

    if (!customPrompt) setInput("");
    setLoading(true);

    try {
      const academicSystemContext = `[STUDY ROOM CONTEXT: ${currentRoomTitle} | Subject: ${activeRoom.subject}]
User Query: ${textToSend.trim()}

INSTRUCTIONS FOR STUDY AGENT:
1. TOPIC LISTING: If the user asks for topics in a unit (e.g. "topics present in 1st unit"), list ONLY the clear topic names in bullet format without unwanted descriptions.
2. EXPLANATION: If the user asks to explain a topic, provide a comprehensive, clear academic breakdown.
3. SIMPLIFIED EXPLANATION: If the user indicates they didn't understand or asks for a clearer/simpler explanation, re-explain using easy everyday analogies, step-by-step points, and simple language.
4. EXAM Q&A GENERATOR: If the user asks for "all 2 marks questions with answers" (or 5-mark/10-mark questions), analyze the uploaded study material and provide ALL candidate questions along with complete, full-score answers. Do not provide just 1 question; list every question (2, 3, 4 or more) present or relevant to the material.`;

      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: academicSystemContext }),
      });

      const data = await response.json();

      const botMsg: StudyMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: data.response || "No response received.",
        sources:
          data.sources && data.sources.length > 0
            ? data.sources.map((s: any) => s.document || s.title || s)
            : undefined,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setRooms((prev) =>
        prev.map((r) => (r.id === targetRoomId ? { ...r, messages: [...r.messages, botMsg] } : r))
      );
    } catch {
      const errorMsg: StudyMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        text: "⚠️ Could not connect to the Study Agent backend. Please verify FastAPI is running on `http://localhost:8000`.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setRooms((prev) =>
        prev.map((r) => (r.id === targetRoomId ? { ...r, messages: [...r.messages, errorMsg] } : r))
      );
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Buttons
  const handleQuickAction = (actionType: "topics" | "explain_simpler" | "2marks" | "5marks") => {
    if (!activeRoom) return;

    if (actionType === "topics") {
      handleSend("What are the topics present in the study material? List only topic names.");
    } else if (actionType === "explain_simpler") {
      handleSend("Please explain the previous topic more clearly. Use simple everyday analogies and easy step-by-step points so I can understand it easily.");
    } else if (actionType === "2marks") {
      handleSend("Give all 2 marks questions along with answers based on the study material. Analyze the material and provide all possible questions with complete answers.");
    } else if (actionType === "5marks") {
      handleSend("Give all 5 marks and 10 marks exam questions along with detailed structured answers based on the study material.");
    }
  };

  if (!activeRoom) return null;

  return (
    <div className="assistant-stage chatting" style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      
      {/* ── Top Bar: Study Room Header ── */}
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#090d24]/60 backdrop-blur-xl flex items-center justify-between gap-3 flex-shrink-0 z-20">
        
        {/* Left: Active Room Info & Inline Title Editing */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white flex-shrink-0 shadow-md shadow-indigo-500/20">
            <BookOpen className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              {editingTitle ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                    className="bg-white/10 border border-white/20 rounded-md px-2 py-0.5 text-sm text-white outline-none"
                    autoFocus
                  />
                  <button onClick={handleSaveTitle} className="p-1 text-emerald-400 hover:text-emerald-300">
                    <Check size={14} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 group/title">
                  <h2 className="text-sm sm:text-base font-bold text-white truncate max-w-md">
                    {activeRoom.title}
                  </h2>
                  <button
                    onClick={() => { setTitleInput(activeRoom.title); setEditingTitle(true); }}
                    className="opacity-0 group-hover/title:opacity-100 p-1 text-white/40 hover:text-white transition-opacity"
                    title="Rename Room"
                  >
                    <Edit2 size={12} />
                  </button>
                </div>
              )}
            </div>
            
            {activeRoom.resources.length > 0 && (
              <p className="text-[11px] text-white/50 flex items-center gap-2 mt-0.5">
                <button
                  onClick={() => setShowResourcesModal(true)}
                  className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <Paperclip className="w-3 h-3" />
                  <span>{activeRoom.resources.length} material(s) attached</span>
                </button>
              </p>
            )}
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={(e) => handleUploadResource(e.target.files)}
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.bmp,.webp,.docx,.txt"
          className="hidden"
        />
      </div>

      {/* ── Main Clean Conversation Chat Feed ── */}
      <div className="chat-feed" ref={chatFeedRef} style={{ flex: 1, paddingBottom: 80 }}>
        
        {/* Attached Files Notification Card in Chat */}
        {activeRoom.resources && activeRoom.resources.length > 0 && (
          <div className="mx-auto my-1 max-w-xl w-full p-2.5 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between text-xs text-white/70">
            <div className="flex items-center gap-2 min-w-0">
              <FolderOpen className="w-4 h-4 text-indigo-400 flex-shrink-0" />
              <span className="truncate">
                Active Material: <strong className="text-white">{activeRoom.resources.map(r => r.name).join(", ")}</strong>
              </span>
            </div>
            <button
              onClick={() => setShowResourcesModal(true)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium px-2 py-0.5 rounded-md hover:bg-white/[0.05] transition-colors flex-shrink-0"
            >
              Manage
            </button>
          </div>
        )}

        {/* Messages List */}
        {activeRoom.messages.map((m) => (
          <div className={`message message--${m.role}`} key={m.id}>
            {m.role === "assistant" && (
              <span className="message-orb">
                <AIOrb size="small" state="success" />
              </span>
            )}
            <div className="message-card">
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

                  {m.sources && m.sources.length > 0 && (
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.08)", fontSize: 11, color: "#818cf8" }}>
                      📚 <strong>Sources extracted:</strong> {m.sources.join(", ")}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="message message--assistant">
            <span className="message-orb">
              <AIOrb size="small" state="thinking" />
            </span>
            <div className="message-card">
              <p className="text-xs text-indigo-300 animate-pulse flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin" /> Analyzing study material & generating answer...
              </p>
            </div>
          </div>
        )}

        <div ref={chatFeedEndRef} />
      </div>

      {/* ⬇️ Floating Scroll-to-Bottom Down Arrow Button */}
      {showScrollDown && (
        <button
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          aria-label="Scroll to bottom"
          title="Scroll to bottom"
        >
          <ArrowDown size={18} />
        </button>
      )}

      {/* ── Bottom Composer Area ── */}
      <div className="w-full flex flex-col items-center gap-2 pb-3 px-4 z-20">
        
        {/* Quick Action Prompt Pills */}
        <div className="suggestions" style={{ margin: 0, gap: 6, flexWrap: "wrap", justifyContent: "center" }}>
          <button onClick={() => handleQuickAction("topics")} className="text-xs py-1.5 px-3">
            <ListChecks size={13} className="text-indigo-400" />
            <span>Topic List ({selectedUnit})</span>
          </button>
          <button onClick={() => handleQuickAction("2marks")} className="text-xs py-1.5 px-3">
            <Award size={13} className="text-emerald-400" />
            <span>All 2-Mark Q&A</span>
          </button>
          <button onClick={() => handleQuickAction("explain_simpler")} className="text-xs py-1.5 px-3">
            <Lightbulb size={13} className="text-amber-400" />
            <span>Explain Simpler</span>
          </button>
          <button onClick={() => handleQuickAction("5marks")} className="text-xs py-1.5 px-3">
            <Sparkles size={13} className="text-purple-400" />
            <span>5/10-Mark Exam Q&A</span>
          </button>
        </div>

        {/* Composer Bar */}
        <div className="composer">
          {/* Paperclip Button for direct document upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Attach Study Material (PDF/Image)"
            aria-label="Attach Study Material"
            className="hover:text-indigo-300"
          >
            <Paperclip size={18} />
          </button>

          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder={`Ask anything about ${selectedUnit} or uploaded PDF/Image notes...`}
          />

          <button
            type="button"
            className="send"
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      {/* ── Modal: Manage Attached Resources ── */}
      {showResourcesModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#0b132b] border border-white/15 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl animate-scale-in text-left">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Paperclip className="w-5 h-5 text-indigo-400" /> Attached Study Materials
              </h3>
              <button onClick={() => setShowResourcesModal(false)} className="text-white/40 hover:text-white p-1 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeRoom.resources.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {activeRoom.resources.map((res) => (
                  <div key={res.id} className="p-3 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      {res.type === "pdf" ? (
                        <FileText className="w-4 h-4 text-red-400 flex-shrink-0" />
                      ) : res.type === "image" ? (
                        <ImageIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      ) : (
                        <FileText className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-white font-medium truncate">{res.name}</p>
                        <p className="text-[10px] text-white/40">{res.type.toUpperCase()} • {res.size}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveResource(res.id)}
                      className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors"
                      title="Remove file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-white/[0.02] border border-dashed border-white/10 text-center space-y-2">
                <FileDown className="w-8 h-8 text-white/20 mx-auto" />
                <p className="text-xs text-white/40">No study material attached yet.</p>
              </div>
            )}

            <div className="flex items-center justify-between pt-3 border-t border-white/10">
              <button
                onClick={() => { setShowResourcesModal(false); fileInputRef.current?.click(); }}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </button>
              <button
                onClick={() => setShowResourcesModal(false)}
                className="px-4 py-2 rounded-xl text-xs text-white/60 hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
