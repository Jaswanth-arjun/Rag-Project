"use client";

import React, { useState } from "react";
import { FolderKanban, Plus, ExternalLink, Trash2, Save, Calendar } from "lucide-react";

interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl: string;
  status: "active" | "completed" | "paused" | "planned";
  progress: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  paused: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  planned: "bg-purple-500/10 text-purple-400 border-purple-500/20",
};

export function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [techStack, setTechStack] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [status, setStatus] = useState<Project["status"]>("active");

  const handleSave = () => {
    if (!title.trim()) return;
    setProjects((prev) => [{
      id: crypto.randomUUID(), title: title.trim(), description: description.trim(),
      techStack: techStack.split(",").map((t) => t.trim()).filter(Boolean),
      githubUrl: githubUrl.trim(), status, progress: status === "completed" ? 100 : 0,
      createdAt: new Date().toISOString(),
    }, ...prev]);
    setTitle(""); setDescription(""); setTechStack(""); setGithubUrl(""); setShowAdd(false);
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">🚀 Projects</h1>
          <p className="text-sm text-white/40 mt-1">Track and manage your projects</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="gradient-primary px-5 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> New Project
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-2xl p-6 animate-scale-in space-y-4">
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Project title..." className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description..." rows={3} className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] resize-none" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="Tech stack (comma separated)" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="GitHub URL" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
          </div>
          <select value={status} onChange={(e) => setStatus(e.target.value as Project["status"])} className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/[0.06]">
            <option value="active" className="bg-surface-900">Active</option>
            <option value="planned" className="bg-surface-900">Planned</option>
            <option value="paused" className="bg-surface-900">Paused</option>
            <option value="completed" className="bg-surface-900">Completed</option>
          </select>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm text-white/40">Cancel</button>
            <button onClick={handleSave} className="gradient-primary px-5 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <div className="text-center py-16">
          <FolderKanban className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30">No projects yet</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {projects.map((p) => (
            <div key={p.id} className="glass rounded-2xl p-6 hover:bg-white/[0.06] transition-all group">
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-base font-semibold text-white/80">{p.title}</h3>
                <span className={`text-[10px] px-2 py-0.5 rounded-full border capitalize ${STATUS_COLORS[p.status]}`}>{p.status}</span>
              </div>
              <p className="text-xs text-white/40 line-clamp-2 mb-3">{p.description}</p>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {p.techStack.map((t) => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">{t}</span>)}
              </div>
              <div className="w-full h-1.5 rounded-full bg-white/[0.05] mb-3">
                <div className="h-full rounded-full gradient-primary" style={{ width: `${p.progress}%` }} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/20 flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(p.createdAt).toLocaleDateString()}</span>
                <div className="flex gap-1">
                  {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg text-white/30 hover:text-white/60"><ExternalLink className="w-4 h-4" /></a>}
                  <button onClick={() => setProjects((prev) => prev.filter((x) => x.id !== p.id))} className="p-1.5 rounded-lg text-white/30 hover:text-error opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
