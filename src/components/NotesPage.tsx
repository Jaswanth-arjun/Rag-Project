"use client";

import React, { useState } from "react";
import {
  StickyNote,
  Plus,
  Search,
  Trash2,
  Edit3,
  Save,
  X,
  Bookmark,
  BookmarkCheck,
  Calendar,
} from "lucide-react";

interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  bookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Personal Notes");
  const [tags, setTags] = useState("");
  const [searchFilter, setSearchFilter] = useState("");

  const handleSave = () => {
    if (!title.trim()) return;

    if (editingId) {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingId
            ? {
                ...n,
                title: title.trim(),
                content: content.trim(),
                category,
                tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
                updatedAt: new Date().toISOString(),
              }
            : n
        )
      );
      setEditingId(null);
    } else {
      const note: Note = {
        id: crypto.randomUUID(),
        title: title.trim(),
        content: content.trim(),
        category,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        bookmarked: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setNotes((prev) => [note, ...prev]);
    }

    setTitle("");
    setContent("");
    setTags("");
    setShowAdd(false);
  };

  const toggleBookmark = (id: string) => {
    setNotes((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, bookmarked: !n.bookmarked } : n
      )
    );
  };

  const deleteNote = (id: string) => {
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  const startEdit = (note: Note) => {
    setTitle(note.title);
    setContent(note.content);
    setCategory(note.category);
    setTags(note.tags.join(", "));
    setEditingId(note.id);
    setShowAdd(true);
  };

  const filtered = notes.filter(
    (n) =>
      !searchFilter ||
      n.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.content.toLowerCase().includes(searchFilter.toLowerCase()) ||
      n.tags.some((t) => t.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">📝 Notes</h1>
          <p className="text-sm text-white/40 mt-1">Quick notes, ideas, and thoughts</p>
        </div>
        <button
          onClick={() => {
            setShowAdd(!showAdd);
            setEditingId(null);
            setTitle("");
            setContent("");
            setTags("");
          }}
          className="gradient-primary px-5 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" />
          New Note
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-2xl p-6 animate-scale-in space-y-4">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Note title..."
            className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors font-medium"
            autoFocus
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write your note..."
            rows={6}
            className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors resize-none"
          />
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Tags (comma separated)"
            className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAdd(false);
                setEditingId(null);
              }}
              className="px-4 py-2 rounded-xl text-sm text-white/40"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="gradient-primary px-5 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              {editingId ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input
          type="text"
          placeholder="Search notes..."
          value={searchFilter}
          onChange={(e) => setSearchFilter(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/30 outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <StickyNote className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30">No notes yet</p>
          <p className="text-sm text-white/20 mt-1">Create your first note above</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((note) => (
            <div
              key={note.id}
              className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="text-sm font-semibold text-white/80">{note.title}</h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => toggleBookmark(note.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-amber-400 transition-colors"
                  >
                    {note.bookmarked ? (
                      <BookmarkCheck className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Bookmark className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => startEdit(note)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-primary-400 transition-colors"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteNote(note.id)}
                    className="p-1.5 rounded-lg text-white/30 hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <p className="text-xs text-white/40 line-clamp-4 whitespace-pre-wrap">
                {note.content}
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {note.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-white/30"
                  >
                    #{tag}
                  </span>
                ))}
                <span className="text-[10px] text-white/20 ml-auto flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {new Date(note.updatedAt).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
