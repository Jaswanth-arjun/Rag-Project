"use client";

import React from "react";
import {
  LayoutDashboard,
  FileText,
  Brain,
  GraduationCap,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Check,
  X,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronDown,
  BookOpen,
} from "lucide-react";
import { AIOrb } from "@/components/ai/AIOrb";

export type Page =
  | "home"
  | "documents"
  | "memory"
  | "study"
  | "settings";

export type BackendConv = {
  id: string;
  title: string;
  created_at?: string;
  updated_at?: string;
  last_message_at?: string;
  message_count?: number;
  last_message_preview?: string;
};

export type StudyRoomSummary = {
  id: string;
  title: string;
  subject?: string;
  resource_count?: number;
};

export const navItems = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "study", label: "Study", icon: GraduationCap },
] as const;

export interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  conversations: BackendConv[];
  editingConvId: string | null;
  setEditingConvId: (id: string | null) => void;
  editTitleInput: string;
  setEditTitleInput: (val: string) => void;
  handleNewChat: () => void;
  loadConversation: (id: string) => void;
  handleRename: (id: string, e?: React.FormEvent) => void;
  handleDeleteConv: (id: string, e: React.MouseEvent) => void;
  realDocsCount: number;
  realMemoriesCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean | ((prev: boolean) => boolean)) => void;
  mobileSidebarOpen: boolean;
  setMobileSidebarOpen: (open: boolean) => void;

  // Study Rooms
  studyRooms?: StudyRoomSummary[];
  activeStudyRoomId?: string | null;
  onNewStudyRoom?: () => void;
  onSelectStudyRoom?: (id: string) => void;
  onDeleteStudyRoom?: (id: string, e: React.MouseEvent) => void;
  onRenameStudyRoom?: (id: string, newTitle: string) => void;
}

export function Sidebar({
  activePage,
  setActivePage,
  activeConvId,
  setActiveConvId,
  conversations,
  editingConvId,
  setEditingConvId,
  editTitleInput,
  setEditTitleInput,
  handleNewChat,
  loadConversation,
  handleRename,
  handleDeleteConv,
  realDocsCount,
  realMemoriesCount,
  isCollapsed,
  setIsCollapsed,
  mobileSidebarOpen,
  setMobileSidebarOpen,
  studyRooms,
  activeStudyRoomId,
  onNewStudyRoom,
  onSelectStudyRoom,
  onDeleteStudyRoom,
  onRenameStudyRoom,
}: SidebarProps) {
  return (
    <>
      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Sidebar Element */}
      <aside
        className={`nuvio-sidebar ${isCollapsed ? "is-collapsed" : ""} ${
          mobileSidebarOpen ? "is-mobile-open" : ""
        } ${isCollapsed ? "p-2.5" : "p-3"}`}
      >
        {/* Top Header Section */}
        <SidebarHeader
          isCollapsed={isCollapsed}
          setIsCollapsed={setIsCollapsed}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />

        {/* New Conversation Action Button */}
        <NewConversationButton
          isCollapsed={isCollapsed}
          onClick={handleNewChat}
        />

        {/* Main Navigation Items */}
        <MainNavigation
          activePage={activePage}
          setActivePage={setActivePage}
          activeConvId={activeConvId}
          setActiveConvId={setActiveConvId}
          isCollapsed={isCollapsed}
          setMobileSidebarOpen={setMobileSidebarOpen}
          studyRooms={studyRooms}
          activeStudyRoomId={activeStudyRoomId}
          onNewStudyRoom={onNewStudyRoom}
          onSelectStudyRoom={onSelectStudyRoom}
          onDeleteStudyRoom={onDeleteStudyRoom}
          onRenameStudyRoom={onRenameStudyRoom}
        />

        {/* Recent Chats Section */}
        {!isCollapsed && (
          <RecentChats
            conversations={conversations}
            activeConvId={activeConvId}
            editingConvId={editingConvId}
            setEditingConvId={setEditingConvId}
            editTitleInput={editTitleInput}
            setEditTitleInput={setEditTitleInput}
            loadConversation={(id) => {
              loadConversation(id);
              setMobileSidebarOpen(false);
            }}
            handleRename={handleRename}
            handleDeleteConv={handleDeleteConv}
          />
        )}

        {/* Knowledge Base Card */}
        {!isCollapsed && (
          <KnowledgeBaseCard
            docsCount={realDocsCount}
            memoriesCount={realMemoriesCount}
          />
        )}

        {/* Bottom Profile & Settings Section */}
        <SidebarFooter
          activePage={activePage}
          setActivePage={setActivePage}
          isCollapsed={isCollapsed}
          setMobileSidebarOpen={setMobileSidebarOpen}
        />
      </aside>
    </>
  );
}

/* ---------------- Subcomponents ---------------- */

function SidebarHeader({
  isCollapsed,
  setIsCollapsed,
  setMobileSidebarOpen,
}: {
  isCollapsed: boolean;
  setIsCollapsed: (c: boolean | ((prev: boolean) => boolean)) => void;
  setMobileSidebarOpen: (o: boolean) => void;
}) {
  if (isCollapsed) {
    return (
      <div className="flex flex-col items-center gap-2 mb-3 pt-1">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-10 h-10 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white/60 hover:text-white flex items-center justify-center transition-all group relative cursor-pointer"
          title="Expand sidebar"
        >
          <PanelLeftOpen size={18} />
          <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0f172a] text-white text-xs font-medium rounded-md shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Expand sidebar
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-1.5 py-1 mb-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center flex-shrink-0">
          <AIOrb size="small" />
        </div>
        <div className="flex flex-col">
          <span className="text-[15px] font-semibold text-white tracking-tight leading-tight">
            Nuvio
          </span>
          <span className="text-[11px] text-white/40 font-normal">
            Personal AI Knowledge OS
          </span>
        </div>
      </div>

      <button
        onClick={() => setIsCollapsed(true)}
        className="w-8 h-8 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        title="Collapse sidebar"
      >
        <PanelLeftClose size={17} />
      </button>
    </div>
  );
}

function NewConversationButton({
  isCollapsed,
  onClick,
}: {
  isCollapsed: boolean;
  onClick: () => void;
}) {
  if (isCollapsed) {
    return (
      <div className="mb-2">
        <button
          onClick={onClick}
          className="w-11 h-11 mx-auto rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.14] border border-white/[0.08] text-white flex items-center justify-center transition-all group relative cursor-pointer shadow-sm"
          title="New conversation"
        >
          <Plus size={18} />
          <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0f172a] text-white text-xs font-medium rounded-md shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            New conversation
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="mb-3">
      <button
        onClick={onClick}
        className="w-full h-[46px] px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] active:bg-white/[0.14] border border-white/[0.08] text-white font-medium text-sm flex items-center gap-3 shadow-sm transition-all cursor-pointer"
      >
        <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white flex-shrink-0">
          <Plus size={16} />
        </div>
        <span className="text-sm font-medium text-white/90">New conversation</span>
      </button>
    </div>
  );
}

function MainNavigation({
  activePage,
  setActivePage,
  activeConvId,
  setActiveConvId,
  isCollapsed,
  setMobileSidebarOpen,
  studyRooms,
  activeStudyRoomId,
  onNewStudyRoom,
  onSelectStudyRoom,
  onDeleteStudyRoom,
  onRenameStudyRoom,
}: {
  activePage: Page;
  setActivePage: (page: Page) => void;
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  isCollapsed: boolean;
  setMobileSidebarOpen: (o: boolean) => void;
  studyRooms?: StudyRoomSummary[];
  activeStudyRoomId?: string | null;
  onNewStudyRoom?: () => void;
  onSelectStudyRoom?: (id: string) => void;
  onDeleteStudyRoom?: (id: string, e: React.MouseEvent) => void;
  onRenameStudyRoom?: (id: string, newTitle: string) => void;
}) {
  const [showStudyDropdown, setShowStudyDropdown] = React.useState(false);
  const [editingRoomId, setEditingRoomId] = React.useState<string | null>(null);
  const [editRoomTitleInput, setEditRoomTitleInput] = React.useState("");

  const handleSaveRoomTitle = (id: string, e?: React.MouseEvent | React.FormEvent) => {
    if (e) e.stopPropagation();
    if (editRoomTitleInput.trim() && onRenameStudyRoom) {
      onRenameStudyRoom(id, editRoomTitleInput.trim());
    }
    setEditingRoomId(null);
  };

  return (
    <nav className="space-y-1 mb-2">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = activePage === item.id && activeConvId === null;

        if (isCollapsed) {
          return (
            <button
              key={item.id}
              onClick={() => {
                setActivePage(item.id as Page);
                setActiveConvId(null);
                setMobileSidebarOpen(false);
              }}
              className={`w-11 h-11 mx-auto rounded-xl flex items-center justify-center transition-all duration-150 border group relative cursor-pointer ${
                isActive
                  ? "bg-white/[0.12] text-white border-white/[0.12] shadow-sm"
                  : "border-transparent text-white/60 hover:text-white hover:bg-white/[0.04]"
              }`}
            >
              <Icon size={18} />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0f172a] text-white text-xs font-medium rounded-md shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                {item.label}
              </div>
            </button>
          );
        }

        if (item.id === "study") {
          return (
            <div key={item.id} className="relative group/study space-y-1">
              <div
                className={`w-full h-[42px] px-3 rounded-xl flex items-center justify-between text-sm font-medium transition-all duration-150 border ${
                  isActive
                    ? "bg-white/[0.08] text-white font-semibold border-white/[0.08] shadow-sm"
                    : "border-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.04]"
                }`}
              >
                <button
                  onClick={() => {
                    setActivePage(item.id as Page);
                    setActiveConvId(null);
                    setMobileSidebarOpen(false);
                  }}
                  className="flex items-center gap-3 flex-1 text-left truncate cursor-pointer py-1.5"
                >
                  <Icon size={18} className={isActive ? "text-indigo-400" : "text-white/50"} />
                  <span className="truncate">{item.label}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActivePage("study");
                      setActiveConvId(null);
                      onNewStudyRoom?.();
                      setMobileSidebarOpen(false);
                    }}
                    className="p-1 rounded-md hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                    title="New Study Room (+)"
                  >
                    <Plus size={14} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowStudyDropdown(!showStudyDropdown);
                    }}
                    className="p-1 rounded-md hover:bg-white/15 text-white/60 hover:text-white transition-colors cursor-pointer"
                    title="Recent Study Rooms History"
                  >
                    <ChevronDown size={14} className={`transition-transform duration-200 ${showStudyDropdown ? "rotate-180 text-indigo-400" : ""}`} />
                  </button>
                </div>
              </div>

              {/* Dropdown Menu for Recent Study Room History */}
              {showStudyDropdown && (
                <div className="mx-1 p-2 rounded-xl bg-[#0b132b]/95 border border-white/15 shadow-2xl backdrop-blur-2xl space-y-1 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="px-2 py-1 text-[10px] font-semibold text-white/50 tracking-wider uppercase border-b border-white/10 pb-1.5">
                    <span>STUDY ROOM HISTORY</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 pt-1">
                    {studyRooms && studyRooms.length > 0 ? (
                      studyRooms.map((room) => (
                        <div key={room.id}>
                          {editingRoomId === room.id ? (
                            <div
                              className="w-full px-2 py-1 rounded-lg text-xs flex items-center gap-1 bg-white/10 border border-indigo-500/40"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="text"
                                value={editRoomTitleInput}
                                onChange={(e) => setEditRoomTitleInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleSaveRoomTitle(room.id, e);
                                  if (e.key === "Escape") setEditingRoomId(null);
                                }}
                                className="bg-transparent text-xs text-white outline-none flex-1 min-w-0 px-1"
                                autoFocus
                              />
                              <button
                                onClick={(e) => handleSaveRoomTitle(room.id, e)}
                                className="p-1 text-emerald-400 hover:text-emerald-300 transition-colors"
                                title="Save"
                              >
                                <Check size={12} />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setEditingRoomId(null); }}
                                className="p-1 text-white/40 hover:text-white transition-colors"
                                title="Cancel"
                              >
                                <X size={12} />
                              </button>
                            </div>
                          ) : (
                            <div
                              onClick={() => {
                                setActivePage("study");
                                onSelectStudyRoom?.(room.id);
                                setShowStudyDropdown(false);
                                setMobileSidebarOpen(false);
                              }}
                              className={`w-full px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between cursor-pointer transition-all group/room ${
                                activeStudyRoomId === room.id
                                  ? "bg-indigo-600/30 text-indigo-200 font-medium border border-indigo-500/30"
                                  : "text-white/70 hover:bg-white/[0.08] hover:text-white border border-transparent"
                              }`}
                            >
                              <span className="truncate font-medium flex-1 mr-2">{room.title}</span>
                              <div className="flex items-center gap-1 opacity-0 group-hover/room:opacity-100 transition-opacity">
                                {onRenameStudyRoom && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingRoomId(room.id);
                                      setEditRoomTitleInput(room.title);
                                    }}
                                    className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-indigo-300 transition-colors cursor-pointer"
                                    title="Rename Study Room"
                                  >
                                    <Pencil size={12} />
                                  </button>
                                )}
                                {onDeleteStudyRoom && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onDeleteStudyRoom(room.id, e);
                                    }}
                                    className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                                    title="Delete Study Room"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="px-2 py-3 text-[11px] text-white/40 text-center">
                        No recent study rooms.<br />Click <b>+</b> to create one.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        }

        return (
          <button
            key={item.id}
            onClick={() => {
              setActivePage(item.id as Page);
              setActiveConvId(null);
              setMobileSidebarOpen(false);
            }}
            className={`w-full h-[42px] px-3 rounded-xl flex items-center gap-3 text-sm font-medium transition-all duration-150 border cursor-pointer ${
              isActive
                ? "bg-white/[0.08] text-white font-semibold border-white/[0.08] shadow-sm"
                : "border-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.04]"
            }`}
          >
            <Icon size={18} className={isActive ? "text-indigo-400" : "text-white/50"} />
            <span className="truncate">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function RecentChats({
  conversations,
  activeConvId,
  editingConvId,
  setEditingConvId,
  editTitleInput,
  setEditTitleInput,
  loadConversation,
  handleRename,
  handleDeleteConv,
}: {
  conversations: BackendConv[];
  activeConvId: string | null;
  editingConvId: string | null;
  setEditingConvId: (id: string | null) => void;
  editTitleInput: string;
  setEditTitleInput: (val: string) => void;
  loadConversation: (id: string) => void;
  handleRename: (id: string, e?: React.FormEvent) => void;
  handleDeleteConv: (id: string, e: React.MouseEvent) => void;
}) {
  return (
    <div className="flex-1 flex flex-col min-h-0 mb-2">
      <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold tracking-wider text-white/40 uppercase flex items-center justify-between select-none">
        <span>RECENT CHATS</span>
        <span className="text-[10px] text-white/30">({conversations.length})</span>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 px-1 space-y-0.5 recent-chats-scroll">
        {conversations.length === 0 ? (
          <div className="px-3 py-4 text-xs text-white/30 text-center">
            No saved chats yet
          </div>
        ) : (
          conversations.map((c) => {
            const isActive = activeConvId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => loadConversation(c.id)}
                className={`w-full px-2.5 py-2 rounded-lg text-xs flex items-center justify-between transition-all duration-150 border group cursor-pointer ${
                  isActive
                    ? "bg-white/[0.08] text-white font-medium border-white/[0.06]"
                    : "border-transparent text-white/60 hover:text-white/90 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare size={14} className="text-white/40 flex-shrink-0" />
                  {editingConvId === c.id ? (
                    <form
                      onSubmit={(e) => handleRename(c.id, e)}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1"
                    >
                      <input
                        autoFocus
                        className="bg-[#0f172a] border border-indigo-500/50 rounded px-1.5 py-0.5 text-xs text-white outline-none w-full"
                        value={editTitleInput}
                        onChange={(e) => setEditTitleInput(e.target.value)}
                        onBlur={() => handleRename(c.id)}
                      />
                    </form>
                  ) : (
                    <span className="truncate text-[13px]">{c.title}</span>
                  )}
                </div>

                {editingConvId !== c.id && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingConvId(c.id);
                        setEditTitleInput(c.title);
                      }}
                      className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                      title="Rename chat"
                    >
                      <Pencil size={12} />
                    </button>
                    <button
                      onClick={(e) => handleDeleteConv(c.id, e)}
                      className="p-1 rounded hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete chat"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function KnowledgeBaseCard({
  docsCount,
  memoriesCount,
}: {
  docsCount: number;
  memoriesCount: number;
}) {
  return (
    <div className="mx-1 my-2 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-xs space-y-1">
      <div className="flex items-center justify-between text-white/80">
        <span className="font-medium text-[12px]">Knowledge base</span>
        <span className="text-[11px] text-indigo-300 font-semibold bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
          {docsCount} docs
        </span>
      </div>
      <div className="text-[10px] text-white/40">
        {memoriesCount} memories stored
      </div>
    </div>
  );
}

function SidebarFooter({
  activePage,
  setActivePage,
  isCollapsed,
  setMobileSidebarOpen,
}: {
  activePage: Page;
  setActivePage: (page: Page) => void;
  isCollapsed: boolean;
  setMobileSidebarOpen: (o: boolean) => void;
}) {
  const isSettingsActive = activePage === "settings";

  if (isCollapsed) {
    return (
      <div className="pt-2 border-t border-white/[0.08] flex justify-center">
        <button
          onClick={() => {
            setActivePage("settings");
            setMobileSidebarOpen(false);
          }}
          className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150 border group relative cursor-pointer ${
            isSettingsActive
              ? "bg-white/[0.12] text-white border-white/[0.12]"
              : "border-transparent text-white/60 hover:text-white hover:bg-white/[0.04]"
          }`}
        >
          <Settings size={18} />
          <div className="absolute left-full ml-3 px-2.5 py-1 bg-[#0f172a] text-white text-xs font-medium rounded-md shadow-xl border border-white/10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
            Settings
          </div>
        </button>
      </div>
    );
  }

  return (
    <div className="pt-2 border-t border-white/[0.08]">
      <button
        onClick={() => {
          setActivePage("settings");
          setMobileSidebarOpen(false);
        }}
        className={`w-full h-[42px] px-3 rounded-xl flex items-center justify-between text-sm font-medium transition-all duration-150 border cursor-pointer ${
          isSettingsActive
            ? "bg-white/[0.08] text-white font-semibold border-white/[0.08]"
            : "border-transparent text-white/70 hover:text-white hover:bg-white/[0.04]"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-xs font-semibold flex items-center justify-center shadow-sm">
            N
          </div>
          <span className="text-sm font-medium text-white/90">Settings</span>
        </div>
        <Settings size={16} className="text-white/40" />
      </button>
    </div>
  );
}
