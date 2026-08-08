"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import {
  FileText,
  MessageSquare,
  Brain,
  Search,
  Upload,
  Clock,
  TrendingUp,
  Sparkles,
  ArrowRight,
  FolderOpen,
  Zap,
} from "lucide-react";
import { CATEGORY_ICONS } from "@/types";

export function Dashboard() {
  const {
    documents,
    memories,
    conversations,
    setActivePage,
    setSearchQuery,
  } = useApp();

  const stats = [
    {
      label: "Documents",
      value: documents.length,
      icon: FileText,
      color: "from-blue-500 to-cyan-400",
      shadow: "shadow-blue-500/20",
    },
    {
      label: "Memories",
      value: memories.length,
      icon: Brain,
      color: "from-purple-500 to-pink-400",
      shadow: "shadow-purple-500/20",
    },
    {
      label: "Conversations",
      value: conversations.length,
      icon: MessageSquare,
      color: "from-emerald-500 to-teal-400",
      shadow: "shadow-emerald-500/20",
    },
    {
      label: "Searches",
      value: 0,
      icon: Search,
      color: "from-amber-500 to-orange-400",
      shadow: "shadow-amber-500/20",
    },
  ];

  const quickActions = [
    {
      label: "New Chat",
      icon: MessageSquare,
      action: () => setActivePage("chat"),
      color: "text-blue-400",
    },
    {
      label: "Upload Files",
      icon: Upload,
      action: () => setActivePage("documents"),
      color: "text-purple-400",
    },
    {
      label: "Search All",
      icon: Search,
      action: () => setActivePage("search"),
      color: "text-emerald-400",
    },
    {
      label: "Add Memory",
      icon: Brain,
      action: () => setActivePage("memory"),
      color: "text-amber-400",
    },
  ];

  const categories = Object.entries(CATEGORY_ICONS).slice(0, 8);

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold">
            Welcome to your{" "}
            <span className="text-gradient">Second Brain</span>
          </h1>
          <p className="text-white/50 mt-2 text-sm lg:text-base">
            Your AI-powered knowledge operating system. Ask anything, find
            everything.
          </p>
        </div>
        <button
          onClick={() => setActivePage("chat")}
          className="gradient-primary px-6 py-3 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Start AI Chat
        </button>
      </div>

      {/* Quick Search */}
      <div className="relative group">
        <div className="absolute -inset-0.5 rounded-2xl gradient-primary opacity-20 group-hover:opacity-30 transition-opacity blur-sm" />
        <div className="relative glass-strong rounded-2xl p-1">
          <div className="flex items-center gap-3 px-4">
            <Search className="w-5 h-5 text-white/40" />
            <input
              type="text"
              placeholder='Search anything... "Find my Aadhaar", "Show Java notes", "Resume version 3"'
              className="w-full py-4 bg-transparent text-white placeholder-white/30 outline-none text-sm lg:text-base"
              value=""
              onChange={(e) => {
                setSearchQuery(e.target.value);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  setSearchQuery((e.target as HTMLInputElement).value);
                  setActivePage("search");
                }
              }}
            />
            <kbd className="hidden lg:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.05] text-white/30 text-xs border border-white/[0.08]">
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`glass rounded-2xl p-5 hover:scale-[1.02] transition-all duration-300 cursor-pointer group ${stat.shadow} shadow-lg`}
            >
              <div className="flex items-center justify-between mb-3">
                <div
                  className={`w-10 h-10 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-lg`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <TrendingUp className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
              </div>
              <div className="text-2xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/40 mt-1">{stat.label}</div>
            </div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
          <Zap className="w-5 h-5 text-amber-400" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.label}
                onClick={action.action}
                className="glass rounded-xl p-4 flex items-center gap-3 hover:bg-white/[0.08] transition-all duration-200 group text-left"
              >
                <Icon className={`w-5 h-5 ${action.color}`} />
                <span className="text-sm font-medium text-white/70 group-hover:text-white/90 transition-colors">
                  {action.label}
                </span>
                <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-white/40 ml-auto group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white/80 flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-400" />
              Recent Documents
            </h2>
            <button
              onClick={() => setActivePage("documents")}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              View All →
            </button>
          </div>
          {documents.length === 0 ? (
            <div className="text-center py-8">
              <FolderOpen className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">No documents yet</p>
              <button
                onClick={() => setActivePage("documents")}
                className="mt-3 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Upload your first document →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.slice(0, 5).map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-sm">
                    {CATEGORY_ICONS[doc.category] || "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-white/30">{doc.category}</p>
                  </div>
                  <span className="text-xs text-white/20">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Conversations */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white/80 flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-emerald-400" />
              Recent Chats
            </h2>
            <button
              onClick={() => setActivePage("chat")}
              className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
            >
              View All →
            </button>
          </div>
          {conversations.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
              <p className="text-sm text-white/30">No conversations yet</p>
              <button
                onClick={() => setActivePage("chat")}
                className="mt-3 text-xs text-primary-400 hover:text-primary-300 transition-colors"
              >
                Start your first chat →
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.slice(0, 5).map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-white/[0.04] transition-all cursor-pointer"
                  onClick={() => setActivePage("chat")}
                >
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <MessageSquare className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white/80 truncate">
                      {conv.title}
                    </p>
                    <p className="text-xs text-white/30">
                      {conv.messages.length} messages
                    </p>
                  </div>
                  <span className="text-xs text-white/20">
                    {new Date(conv.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Categories Grid */}
      <div>
        <h2 className="text-lg font-semibold text-white/80 mb-4 flex items-center gap-2">
          <FolderOpen className="w-5 h-5 text-purple-400" />
          Categories
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {categories.map(([name, icon]) => (
            <button
              key={name}
              onClick={() => {
                setSearchQuery(name);
                setActivePage("search");
              }}
              className="glass rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/[0.08] transition-all duration-200 group"
            >
              <span className="text-2xl group-hover:scale-110 transition-transform">
                {icon}
              </span>
              <span className="text-[10px] text-white/40 group-hover:text-white/60 transition-colors text-center leading-tight">
                {name}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Memories Section */}
      <div className="glass rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white/80 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-400" />
            Saved Memories
          </h2>
          <button
            onClick={() => setActivePage("memory")}
            className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
          >
            View All →
          </button>
        </div>
        {memories.length === 0 ? (
          <div className="text-center py-8">
            <Brain className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-sm text-white/30">
              No memories saved yet
            </p>
            <p className="text-xs text-white/20 mt-1">
              Tell the AI &quot;Remember this...&quot; to save a memory
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            {memories.slice(0, 6).map((memory) => (
              <div
                key={memory.id}
                className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-all cursor-pointer border border-white/[0.04]"
              >
                <p className="text-sm text-white/70 line-clamp-2">
                  {memory.content}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400">
                    {memory.category}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {new Date(memory.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
