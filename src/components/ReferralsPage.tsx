"use client";

import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { Users, Plus, Save, Trash2, Search, Link2, Mail, MapPin, Calendar } from "lucide-react";
import toast from "react-hot-toast";
import type { ReferralContact } from "@/types";

const STATUS_COLORS: Record<string, string> = {
  none: "bg-white/[0.05] text-white/40",
  pending: "bg-amber-500/10 text-amber-400",
  contacted: "bg-blue-500/10 text-blue-400",
  referred: "bg-emerald-500/10 text-emerald-400",
  declined: "bg-red-500/10 text-red-400",
};

export function ReferralsPage() {
  const { referralContacts, addReferralContact } = useApp();
  const [showAdd, setShowAdd] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [form, setForm] = useState({
    name: "", company: "", designation: "", linkedinUrl: "", email: "",
    skills: "", location: "", notes: "", priority: "medium" as "high" | "medium" | "low",
    referralStatus: "none" as ReferralContact["referralStatus"],
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.company.trim()) return;
    addReferralContact({
      id: crypto.randomUUID(), ...form,
      skills: form.skills.split(",").map((s) => s.trim()).filter(Boolean),
      tags: [], lastContactDate: "", followUpDate: "",
    });
    setForm({ name: "", company: "", designation: "", linkedinUrl: "", email: "", skills: "", location: "", notes: "", priority: "medium", referralStatus: "none" });
    setShowAdd(false);
    toast.success("Contact added!");
  };

  const filtered = referralContacts.filter((c) =>
    !searchFilter || c.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.company.toLowerCase().includes(searchFilter.toLowerCase()) ||
    c.skills.some((s) => s.toLowerCase().includes(searchFilter.toLowerCase()))
  );

  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">👥 Referral CRM</h1>
          <p className="text-sm text-white/40 mt-1">Manage your LinkedIn referral contacts</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)} className="gradient-primary px-5 py-2.5 rounded-xl font-medium text-white shadow-lg shadow-primary-500/25 transition-all hover:scale-[1.02] flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Contact
        </button>
      </div>

      {showAdd && (
        <div className="glass rounded-2xl p-6 animate-scale-in space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Full Name *" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company *" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Designation" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.linkedinUrl} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} placeholder="LinkedIn URL" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
            <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Location" className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
          </div>
          <input type="text" value={form.skills} onChange={(e) => setForm({ ...form, skills: e.target.value })} placeholder="Skills (comma separated)" className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06]" />
          <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Notes..." rows={2} className="w-full bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 outline-none border border-white/[0.06] resize-none" />
          <div className="flex flex-col sm:flex-row gap-3">
            <select value={form.referralStatus} onChange={(e) => setForm({ ...form, referralStatus: e.target.value as ReferralContact["referralStatus"] })} className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/[0.06]">
              <option value="none" className="bg-surface-900">No Status</option>
              <option value="pending" className="bg-surface-900">Pending</option>
              <option value="contacted" className="bg-surface-900">Contacted</option>
              <option value="referred" className="bg-surface-900">Referred</option>
              <option value="declined" className="bg-surface-900">Declined</option>
            </select>
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "high" | "medium" | "low" })} className="bg-white/[0.03] rounded-xl px-4 py-3 text-sm text-white outline-none border border-white/[0.06]">
              <option value="high" className="bg-surface-900">High Priority</option>
              <option value="medium" className="bg-surface-900">Medium Priority</option>
              <option value="low" className="bg-surface-900">Low Priority</option>
            </select>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 rounded-xl text-sm text-white/40">Cancel</button>
            <button onClick={handleSave} className="gradient-primary px-5 py-2 rounded-xl text-sm font-medium text-white flex items-center gap-2"><Save className="w-4 h-4" /> Save</button>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input type="text" placeholder='Search contacts... "Google", "Microsoft"' value={searchFilter} onChange={(e) => setSearchFilter(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/30 outline-none" />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30">No referral contacts</p>
          <p className="text-sm text-white/20 mt-1">Add LinkedIn contacts to track referrals</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="glass rounded-2xl p-5 hover:bg-white/[0.06] transition-all">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-white/80">{c.name}</h3>
                  <p className="text-xs text-white/40">{c.designation} at <span className="text-primary-400">{c.company}</span></p>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[c.referralStatus]}`}>{c.referralStatus}</span>
              </div>
              {c.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {c.skills.map((s) => <span key={s} className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">{s}</span>)}
                </div>
              )}
              {c.notes && <p className="text-xs text-white/30 mb-2 line-clamp-2">{c.notes}</p>}
              <div className="flex items-center gap-3">
                {c.location && <span className="text-[10px] text-white/20 flex items-center gap-1"><MapPin className="w-3 h-3" />{c.location}</span>}
                {c.linkedinUrl && <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-blue-400"><Link2 className="w-3.5 h-3.5" /></a>}
                {c.email && <a href={`mailto:${c.email}`} className="text-white/30 hover:text-primary-400"><Mail className="w-3.5 h-3.5" /></a>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
