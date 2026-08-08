"use client";

import React, { useState } from "react";
import { BookOpen, Plus, Save, Search, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

interface StudyItem {
  id: string;
  title: string;
  subject: string;
  topic: string;
  content: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  bookmarked: boolean;
  createdAt: string;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: "bg-emerald-500/10 text-emerald-400",
  intermediate: "bg-amber-500/10 text-amber-400",
  advanced: "bg-red-500/10 text-red-400",
};

export function StudyPage() {
  const [items, setItems] = useState<StudyItem[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [form, setForm] = useState({
    title: "", subject: "", topic: "", content: "", tags: "",
    difficulty: "beginner" as StudyItem["difficulty"],
  });

  const handleSave = () => {
    if (!form.title.trim()) return;
    setItems((prev) => [{
      id: crypto.randomUUID(), ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      bookmarked: false, createdAt: new Date().toISOString(),
    }, ...prev]);
    setForm({ title: "", subject: "", topic: "", content: "", tags: "", difficulty: "beginner" });
    setShowAdd(false);
  };

  const filtered = items.filter((i) =>
    !searchFilter || i.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
    i.subject.toLowerCase().includes(searchFilter.toLowerCase()) ||
    i.topic.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">📚 Study Manager</h1>
          <p className="text-sm text-white/40 mt-1">Organize notes, flashcards, and study materials</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="gradient-primary px-5 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Study Note
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-2xl p-6 animate-scale-in space-y-4">
          <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Title *" className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input type="text" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="Subject" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="Topic" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <select value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value as StudyItem["difficulty"] })} className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/[0.06]">
              <option value="beginner" className="bg-surface-900">Beginner</option>
              <option value="intermediate" className="bg-surface-900">Intermediate</option>
              <option value="advanced" className="bg-surface-900">Advanced</option>
            </select>
          </div>
          <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder="Study notes content..." rows={5} className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] resize-none" />
          <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} placeholder="Tags (comma separated)" className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm text-white/40">Cancel</button>
            <button onClick={handleSave} className="gradient-primary px-5 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input type="text" placeholder="Search study notes..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/30 outline-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30">No study notes yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((item) => (
            <div key={item.id} className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all group">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-white/80">{item.title}</h3>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${DIFFICULTY_COLORS[item.difficulty]}`}>{item.difficulty}</span>
                  <button onClick={() => setItems((p) => p.map((i) => i.id === item.id ? { ...i, bookmarked: !i.bookmarked } : i))} className="p-1 rounded text-white/30 hover:text-amber-400">
                    {item.bookmarked ? <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" /> : <Bookmark className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              {item.subject && <p className="text-xs text-primary-400 mb-1">{item.subject} {item.topic && `› ${item.topic}`}</p>}
              <p className="text-xs text-white/40 line-clamp-3 whitespace-pre-wrap">{item.content}</p>
              <div className="flex flex-wrap gap-1 mt-3">
                {item.tags.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30">#{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
