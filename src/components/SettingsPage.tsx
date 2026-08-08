"use client";

import React from "react";
import { useApp } from "@/context/AppContext";
import { Settings, Key, Globe, Palette, Server, Shield, HardDrive, Info } from "lucide-react";

export function SettingsPage() {
  const { apiKey, setApiKey, backendUrl, setBackendUrl, theme, toggleTheme } = useApp();

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white">⚙️ Settings</h1>
        <p className="text-sm text-white/40 mt-1">Configure your AI Second Brain</p>
      </div>

      {/* API Configuration */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Key className="w-5 h-5 text-amber-400" />
          API Configuration
        </h2>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">OpenAI API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors"
          />
          <p className="text-[10px] text-white/20 mt-1">
            Used for AI chat and embeddings. Stored locally, never sent to third parties.
          </p>
        </div>
      </div>

      {/* Backend Configuration */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-400" />
          Backend Server
        </h2>
        <div>
          <label className="text-xs text-white/40 mb-1.5 block">Backend URL</label>
          <input
            type="text"
            value={backendUrl}
            onChange={(e) => setBackendUrl(e.target.value)}
            placeholder="http://localhost:8000"
            className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 outline-none border border-white/[0.06] focus:border-primary-500/30 transition-colors"
          />
          <p className="text-[10px] text-white/20 mt-1">
            FastAPI backend URL. Start with: cd backend && python main.py
          </p>
        </div>
      </div>

      {/* Appearance */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Palette className="w-5 h-5 text-purple-400" />
          Appearance
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-white/60">Dark Mode</p>
            <p className="text-[10px] text-white/20">Toggle between light and dark themes</p>
          </div>
          <button
            onClick={toggleTheme}
            className={`w-12 h-6 rounded-full transition-colors relative ${
              theme === "dark" ? "bg-primary-500" : "bg-white/10"
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${
                theme === "dark" ? "left-6" : "left-0.5"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Security */}
      <div className="glass rounded-2xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Security & Privacy
        </h2>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-white/60">All data stored locally</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-white/60">API keys stored in browser only</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
            <div className="w-2 h-2 rounded-full bg-success" />
            <span className="text-sm text-white/60">No data shared between users</span>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass rounded-2xl p-6 space-y-3">
        <h2 className="text-base font-semibold text-white/80 flex items-center gap-2">
          <Info className="w-5 h-5 text-cyan-400" />
          About
        </h2>
        <p className="text-sm text-white/40">
          AI Second Brain v1.0.0 — Your personal RAG-powered knowledge operating system.
        </p>
        <p className="text-xs text-white/20">
          Built with Next.js, FastAPI, ChromaDB, and OpenAI.
        </p>
      </div>
    </div>
  );
}
