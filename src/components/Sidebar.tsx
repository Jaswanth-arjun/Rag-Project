"use client";

import React from "react";
import {
  LayoutDashboard,
  FileText,
  Brain,
  BookOpen,
  FolderKanban,
  Users,
  BriefcaseBusiness,
  GraduationCap,
  Plus,
  MessageSquare,
  Pencil,
  Trash2,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { AIOrb } from "@/components/ai/AIOrb";

export type Page =
  | "home"
  | "documents"
  | "memory"
  | "notes"
  | "projects"
  | "referrals"
  | "jobs"
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

export const navItems = [
  { id: "home", label: "Home", icon: LayoutDashboard },
  { id: "documents", label: "Documents", icon: FileText },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "notes", label: "Notes", icon: BookOpen },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "referrals", label: "Referrals", icon: Users },
  { id: "jobs", label: "Job applications", icon: BriefcaseBusiness },
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
}: {
  activePage: Page;
  setActivePage: (page: Page) => void;
  activeConvId: string | null;
  setActiveConvId: (id: string | null) => void;
  isCollapsed: boolean;
  setMobileSidebarOpen: (o: boolean) => void;
}) {
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
