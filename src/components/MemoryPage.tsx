"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import {
  Brain,
  Plus,
  Search,
  Trash2,
  Edit3,
  Tag,
  Calendar,
  Filter,
  X,
  Save,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Memory } from "@/types";
import { CATEGORIES, CATEGORY_ICONS } from "@/types";

export function MemoryPage() {
  const { memories, addMemory, removeMemory, backendUrl } = useApp();
  const [showAdd, setShowAdd] = useState(false);

  const handleDeleteMemory = async (id: string) => {
    try {
      await fetch(`${backendUrl}/api/memories/${id}`, { method: "DELETE" });
    } catch {}
    removeMemory(id);
    toast.success("Memory deleted");
  };
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState("Personal Notes");
  const [newTags, setNewTags] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const handleAddMemory = () => {
    if (!newContent.trim()) return;

    const memory: Memory = {
      id: crypto.randomUUID(),
      content: newContent.trim(),
      category: newCategory,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: newTags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };

    addMemory(memory);
    setNewContent("");
    setNewTags("");
    setShowAdd(false);
    toast.success("Memory saved!");
  };

  const filtered = memories.filter((m) => {
    const matchSearch =
      !searchFilter ||
      m.content.toLowerCase().includes(searchFilter.toLowerCase()) ||
      m.tags.some((t) => t.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchCategory = !categoryFilter || m.category === categoryFilter;
    return matchSearch && matchCategory;
  });

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            🧠 Memory
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Your AI never forgets what you intentionally save
          </p>
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="gradient-primary px-5 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          Add Memory
        </button>
      </div>

      {/* Add Memory Form */}
      {showAdd && (
        <div className="glass rounded-2xl p-6 animate-scale-in space-y-4">
          <h3 className="text-sm font-semibold text-white/70 flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            Save New Memory
          </h3>
          <textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="What should I remember? e.g., My Aadhaar number is XXXX, I interviewed at Google on March 15th..."
            className="w-full h-32 bg-white/[0.03] rounded-xl p-4 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors resize-none"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="flex-1 bg-white/[0.03] rounded-xl px-4 py-2.5 text-sm text-white outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat} className="bg-surface-900">
                  {CATEGORY_ICONS[cat]} {cat}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="Tags (comma separated)"
              className="flex-1 bg-white/[0.03] rounded-xl px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddMemory}
              className="gradient-primary px-5 py-2 rounded-xl text-sm font-medium text-white shadow-lg shadow-primary-500/25 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Memory
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search memories..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/30 outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="bg-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white/60 outline-none border border-white/[0.06]"
        >
          <option value="" className="bg-surface-900">All Categories</option>
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat} className="bg-surface-900">{cat}</option>
          ))}
        </select>
      </div>

      {/* Memories List */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Brain className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30 mb-2">No memories yet</p>
          <p className="text-sm text-white/20">
            Save memories by telling the AI &quot;Remember this...&quot; or use the
            button above
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((memory) => (
            <div
              key={memory.id}
              className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-white/80 whitespace-pre-wrap leading-relaxed">
                    {memory.content}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 flex items-center gap-1">
                      {CATEGORY_ICONS[memory.category]} {memory.category}
                    </span>
                    {memory.tags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30"
                      >
                        #{tag}
                      </span>
                    ))}
                    <span className="text-[10px] text-white/20 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(memory.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteMemory(memory.id)}
                  className="opacity-0 group-hover:opacity-100 p-2 rounded-lg text-white/30 hover:text-error hover:bg-error/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
