"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Search,
  FileText,
  Brain,
  MessageSquare,
  StickyNote,
  Users,
  Briefcase,
  FolderKanban,
  Clock,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { SearchResult } from "@/types";
import { CATEGORY_ICONS } from "@/types";

const RESULT_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  memory: Brain,
  chat: MessageSquare,
  note: StickyNote,
  contact: Users,
  project: FolderKanban,
  job: Briefcase,
};

export function SearchPage() {
  const { searchQuery, setSearchQuery, documents, memories, conversations, backendUrl } = useApp();
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setHasSearched(true);

    // Try backend search first
    try {
      const response = await fetch(`${backendUrl}/api/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        setIsSearching(false);
        return;
      }
    } catch {
      // Fallback to local search
    }

    // Local search fallback
    const localResults: SearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Search documents
    documents.forEach((doc) => {
      const nameMatch = doc.name.toLowerCase().includes(lowerQuery);
      const categoryMatch = doc.category.toLowerCase().includes(lowerQuery);
      const tagMatch = doc.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      const textMatch = doc.extractedText?.toLowerCase().includes(lowerQuery);

      if (nameMatch || categoryMatch || tagMatch || textMatch) {
        localResults.push({
          type: "document",
          id: doc.id,
          title: doc.name,
          snippet: doc.summary || `${doc.category} • ${doc.type}`,
          relevance: nameMatch ? 1 : categoryMatch ? 0.8 : 0.6,
          category: doc.category,
          timestamp: doc.uploadedAt,
        });
      }
    });

    // Search memories
    memories.forEach((mem) => {
      const contentMatch = mem.content.toLowerCase().includes(lowerQuery);
      const tagMatch = mem.tags.some((t) => t.toLowerCase().includes(lowerQuery));
      const categoryMatch = mem.category.toLowerCase().includes(lowerQuery);

      if (contentMatch || tagMatch || categoryMatch) {
        localResults.push({
          type: "memory",
          id: mem.id,
          title: mem.content.slice(0, 60) + "...",
          snippet: mem.content,
          relevance: contentMatch ? 0.9 : 0.7,
          category: mem.category,
          timestamp: mem.createdAt,
        });
      }
    });

    // Search conversations
    conversations.forEach((conv) => {
      const titleMatch = conv.title.toLowerCase().includes(lowerQuery);
      const msgMatch = conv.messages.some((m) =>
        m.content.toLowerCase().includes(lowerQuery)
      );

      if (titleMatch || msgMatch) {
        const matchedMsg = conv.messages.find((m) =>
          m.content.toLowerCase().includes(lowerQuery)
        );
        localResults.push({
          type: "chat",
          id: conv.id,
          title: conv.title,
          snippet: matchedMsg?.content.slice(0, 100) || `${conv.messages.length} messages`,
          relevance: titleMatch ? 0.85 : 0.65,
          timestamp: conv.updatedAt,
        });
      }
    });

    // Sort by relevance
    localResults.sort((a, b) => b.relevance - a.relevance);
    setResults(localResults);
    setIsSearching(false);
  };

  const suggestions = [
    "Find my Aadhaar",
    "Show certificates",
    "Search Java notes",
    "Find Microsoft referrals",
    "Resume version 3",
    "Interview notes",
    "Projects using React",
    "RRB PO notes",
  ];

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">
          🔍 Universal Search
        </h1>
        <p className="text-sm text-white/40 mt-1">
          Search everything — documents, memories, chats, notes, contacts
        </p>
      </div>

      {/* Search Input */}
      <div className="relative group">
        <div className="absolute -inset-0.5 rounded-2xl gradient-primary opacity-20 group-focus-within:opacity-30 transition-opacity blur-sm" />
        <div className="relative glass-strong rounded-2xl overflow-hidden flex items-center">
          <Search className="w-5 h-5 text-white/40 ml-5" />
          <input
            type="text"
            placeholder='Search anything... "Find my Aadhaar", "Show Java notes"'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch(searchQuery);
            }}
            className="w-full py-4 px-4 bg-transparent text-white placeholder-white/30 outline-none text-sm lg:text-base"
            autoFocus
          />
          <button
            onClick={() => handleSearch(searchQuery)}
            className="gradient-primary px-6 py-2 rounded-xl text-sm font-medium text-white mr-2 hover:scale-[1.02] active:scale-[0.98] transition-transform"
          >
            Search
          </button>
        </div>
      </div>

      {/* Suggestions */}
      {!hasSearched && (
        <div className="space-y-3">
          <p className="text-sm text-white/40 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            Try searching for:
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSearchQuery(s);
                  handleSearch(s);
                }}
                className="glass px-4 py-2 rounded-xl text-sm text-white/50 hover:text-white/80 hover:bg-white/[0.08] transition-all"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {isSearching ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-primary-400 animate-spin" />
          <span className="ml-3 text-white/40">Searching your knowledge base...</span>
        </div>
      ) : hasSearched && results.length === 0 ? (
        <div className="text-center py-16">
          <Search className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30 mb-2">No results found</p>
          <p className="text-sm text-white/20">
            Try different keywords or upload more documents
          </p>
        </div>
      ) : (
        hasSearched && (
          <div className="space-y-3">
            <p className="text-sm text-white/40">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
            {results.map((result) => {
              const Icon = RESULT_ICONS[result.type] || FileText;
              return (
                <div
                  key={result.id}
                  className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all cursor-pointer group animate-slide-up"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-medium text-white/80 truncate">
                          {result.title}
                        </h3>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400 capitalize">
                          {result.type}
                        </span>
                        {result.category && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30">
                            {CATEGORY_ICONS[result.category]} {result.category}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/40 line-clamp-2">
                        {result.snippet}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-white/20 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(result.timestamp).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-emerald-400">
                          {Math.round(result.relevance * 100)}% match
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}
