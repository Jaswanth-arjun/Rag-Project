"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Briefcase, Plus, Save, Search, Filter, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import type { JobApplication } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  applied: "bg-blue-500/10 text-blue-400",
  screening: "bg-cyan-500/10 text-cyan-400",
  interview: "bg-purple-500/10 text-purple-400",
  assessment: "bg-amber-500/10 text-amber-400",
  offer: "bg-emerald-500/10 text-emerald-400",
  rejected: "bg-red-500/10 text-red-400",
  accepted: "bg-green-500/10 text-green-400",
  withdrawn: "bg-gray-500/10 text-gray-400",
};

export function JobTrackerPage() {
  const { jobApplications, addJobApplication } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [form, setForm] = useState({
    company: "", role: "", resumeVersion: "", status: "applied" as JobApplication["status"],
    notes: "", offerAmount: "",
  });

  const handleSave = () => {
    if (!form.company.trim() || !form.role.trim()) return;
    addJobApplication({
      id: crypto.randomUUID(), ...form,
      appliedDate: new Date().toISOString(),
    });
    setForm({ company: "", role: "", resumeVersion: "", status: "applied", notes: "", offerAmount: "" });
    setShowAdd(false);
    toast.success("Application tracked!");
  };

  const filtered = jobApplications.filter((j) => {
    const matchSearch = !searchFilter || j.company.toLowerCase().includes(searchFilter.toLowerCase()) || j.role.toLowerCase().includes(searchFilter.toLowerCase());
    const matchStatus = !statusFilter || j.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const stats = {
    total: jobApplications.length,
    active: jobApplications.filter((j) => !["rejected", "withdrawn", "accepted"].includes(j.status)).length,
    offers: jobApplications.filter((j) => j.status === "offer" || j.status === "accepted").length,
  };

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">💼 Job Tracker</h1>
          <p className="text-sm text-white/40 mt-1">Track all your job applications</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="gradient-primary px-5 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Application
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-xs text-white/40">Total Applied</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-blue-400">{stats.active}</div>
          <div className="text-xs text-white/40">Active</div>
        </div>
        <div className="glass rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-emerald-400">{stats.offers}</div>
          <div className="text-xs text-white/40">Offers</div>
        </div>
      </div>

      {showAdd && (
        <div className="glass rounded-2xl p-6 animate-scale-in space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company *" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} placeholder="Role *" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.resumeVersion} onChange={(e) => setForm({ ...form, resumeVersion: e.target.value })} placeholder="Resume version used" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as JobApplication["status"] })} className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/[0.06]">
              <option value="applied" className="bg-surface-900">Applied</option>
              <option value="screening" className="bg-surface-900">Screening</option>
              <option value="assessment" className="bg-surface-900">Assessment</option>
              <option value="interview" className="bg-surface-900">Interview</option>
              <option value="offer" className="bg-surface-900">Offer</option>
              <option value="accepted" className="bg-surface-900">Accepted</option>
              <option value="rejected" className="bg-surface-900">Rejected</option>
              <option value="withdrawn" className="bg-surface-900">Withdrawn</option>
            </select>
          </div>
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." rows={2} className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm text-white/40">Cancel</button>
            <button onClick={handleSave} className="gradient-primary px-5 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" placeholder="Search applications..." value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/30 outline-none" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-white/[0.05] rounded-xl px-4 py-2.5 text-sm text-white/60 outline-none border border-white/[0.06]">
          <option value="" className="bg-surface-900">All Status</option>
          <option value="applied" className="bg-surface-900">Applied</option>
          <option value="screening" className="bg-surface-900">Screening</option>
          <option value="interview" className="bg-surface-900">Interview</option>
          <option value="offer" className="bg-surface-900">Offer</option>
          <option value="rejected" className="bg-surface-900">Rejected</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Briefcase className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30">No applications tracked</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((job) => (
            <div key={job.id} className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-white/80">{job.role}</h3>
                  <p className="text-xs text-primary-400">{job.company}</p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[job.status]}`}>{job.status}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/30">
                {job.resumeVersion && <span>Resume: {job.resumeVersion}</span>}
                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(job.appliedDate).toLocaleDateString()}</span>
                {job.offerAmount && <span className="text-emerald-400">💰 {job.offerAmount}</span>}
              </div>
              {job.notes && <p className="text-xs text-white/30 mt-2 line-clamp-1">{job.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
