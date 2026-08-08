"use client";

import React, { useState, useCallback } from "react";
import { useApp } from "@/context/AppContext";
import { useDropzone } from "react-dropzone";
import {
  Upload,
  FileText,
  Image,
  Film,
  Music,
  Archive,
  File,
  Trash2,
  Eye,
  Download,
  Search,
  Grid3X3,
  List,
  Filter,
  X,
  CheckCircle2,
  Loader2,
  FolderOpen,
} from "lucide-react";
import toast from "react-hot-toast";
import type { Document } from "@/types";
import { CATEGORIES, CATEGORY_ICONS } from "@/types";

const FILE_ICONS: Record<string, typeof FileText> = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  ppt: FileText,
  pptx: FileText,
  xls: FileText,
  xlsx: FileText,
  csv: FileText,
  png: Image,
  jpg: Image,
  jpeg: Image,
  gif: Image,
  webp: Image,
  mp4: Film,
  webm: Film,
  avi: Film,
  mp3: Music,
  wav: Music,
  ogg: Music,
  zip: Archive,
  rar: Archive,
};

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return FILE_ICONS[ext] || File;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function autoCategory(name: string, type: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("resume") || lower.includes("cv")) return "Resume";
  if (lower.includes("aadhaar") || lower.includes("pan") || lower.includes("passport") || lower.includes("id"))
    return "Personal Documents";
  if (lower.includes("certificate") || lower.includes("cert")) return "Certificates";
  if (lower.includes("marksheet") || lower.includes("semester") || lower.includes("grade") || lower.includes("marks"))
    return "Education";
  if (lower.includes("offer") || lower.includes("appointment")) return "Job Applications";
  if (lower.includes("bill") || lower.includes("invoice")) return "Bills";
  if (lower.includes("receipt")) return "Receipts";
  if (lower.includes("medical") || lower.includes("prescription") || lower.includes("health")) return "Medical";
  if (lower.includes("tax") || lower.includes("salary") || lower.includes("bank")) return "Finance";
  if (lower.includes("note") || lower.includes("study")) return "Study Notes";
  if (lower.includes("project")) return "Projects";
  if (type.startsWith("image/")) return "Images";
  if (type.startsWith("video/")) return "Videos";
  if (type.startsWith("audio/")) return "Audio";
  return "Miscellaneous";
}

export function DocumentsPage() {
  const { documents, addDocument, removeDocument, backendUrl } = useApp();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchFilter, setSearchFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [uploading, setUploading] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const handleDeleteDocument = async (id: string) => {
    try {
      await fetch(`${backendUrl}/api/documents/${id}`, { method: "DELETE" });
    } catch {}
    removeDocument(id);
    toast.success("Document removed");
  };

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setUploading(true);

      for (const file of acceptedFiles) {
        const doc: Document = {
          id: crypto.randomUUID(),
          name: file.name,
          type: file.type || "application/octet-stream",
          category: autoCategory(file.name, file.type),
          size: file.size,
          uploadedAt: new Date().toISOString(),
          tags: [],
          summary: `Uploaded ${file.name}`,
        };

        // Try uploading to backend
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("category", doc.category);

          const response = await fetch(`${backendUrl}/api/documents/upload`, {
            method: "POST",
            body: formData,
          });

          if (response.ok) {
            const data = await response.json();
            doc.extractedText = data.extracted_text;
            doc.summary = data.summary || doc.summary;
            doc.tags = data.tags || doc.tags;
            doc.metadata = data.metadata;
          }
        } catch {
          // Backend unavailable - store locally
        }

        addDocument(doc);
        toast.success(`${file.name} uploaded`);
      }

      setUploading(false);
    },
    [addDocument, backendUrl]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "text/plain": [".txt"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
      "image/*": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
      "application/zip": [".zip"],
      "audio/*": [".mp3", ".wav", ".ogg"],
      "video/*": [".mp4", ".webm", ".avi"],
    },
    multiple: true,
  });

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      !searchFilter ||
      doc.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchFilter.toLowerCase()) ||
      doc.tags.some((t) => t.toLowerCase().includes(searchFilter.toLowerCase()));
    const matchesCategory = !categoryFilter || doc.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white">
            📁 Documents
          </h1>
          <p className="text-sm text-white/40 mt-1">
            Upload, organize and search your files
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-white/40">
            {documents.length} documents
          </span>
        </div>
      </div>

      {/* Upload Zone */}
      <div
        {...getRootProps()}
        className={`
          relative rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer
          ${
            isDragActive
              ? "border-primary-400 bg-primary-500/10 scale-[1.01]"
              : "border-white/[0.08] hover:border-white/[0.15] hover:bg-white/[0.02]"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="p-8 lg:p-12 text-center">
          {uploading ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-12 h-12 text-primary-400 animate-spin" />
              <p className="text-sm text-white/60">Processing files...</p>
            </div>
          ) : isDragActive ? (
            <div className="flex flex-col items-center gap-3">
              <Upload className="w-12 h-12 text-primary-400 animate-float" />
              <p className="text-lg font-medium text-primary-400">
                Drop files here
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center shadow-lg shadow-primary-500/20">
                <Upload className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium text-white/70">
                  Drag & drop files, or{" "}
                  <span className="text-primary-400">browse</span>
                </p>
                <p className="text-xs text-white/30 mt-1">
                  PDF, DOCX, TXT, PPT, Excel, CSV, Images, Audio, Video, ZIP
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass text-sm text-white placeholder-white/30 outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl glass text-sm transition-all ${
              showFilters ? "text-primary-400" : "text-white/50 hover:text-white/70"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filter
          </button>
          <button
            onClick={() => setViewMode("grid")}
            className={`p-2.5 rounded-xl transition-all ${
              viewMode === "grid"
                ? "bg-primary-500/15 text-primary-400"
                : "glass text-white/40 hover:text-white/60"
            }`}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`p-2.5 rounded-xl transition-all ${
              viewMode === "list"
                ? "bg-primary-500/15 text-primary-400"
                : "glass text-white/40 hover:text-white/60"
            }`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Filter */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 animate-slide-up">
          <button
            onClick={() => setCategoryFilter("")}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
              !categoryFilter
                ? "gradient-primary text-white"
                : "glass text-white/40 hover:text-white/60"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => {
            const count = documents.filter((d) => d.category === cat).length;
            if (count === 0 && !categoryFilter) return null;
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat === categoryFilter ? "" : cat)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all flex items-center gap-1 ${
                  categoryFilter === cat
                    ? "gradient-primary text-white"
                    : "glass text-white/40 hover:text-white/60"
                }`}
              >
                <span>{CATEGORY_ICONS[cat]}</span>
                {cat}
                {count > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/10 text-[10px]">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Documents Grid / List */}
      {filteredDocs.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-16 h-16 text-white/10 mx-auto mb-4" />
          <p className="text-lg text-white/30 mb-2">No documents found</p>
          <p className="text-sm text-white/20">
            Upload files or adjust your filters
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredDocs.map((doc) => {
            const Icon = getFileIcon(doc.name);
            return (
              <div
                key={doc.id}
                className="glass rounded-2xl p-5 hover:bg-white/[0.08] transition-all duration-200 group cursor-pointer"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-500/10 flex items-center justify-center">
                    <Icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteDocument(doc.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-white/30 hover:text-error hover:bg-error/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <h3 className="text-sm font-medium text-white/80 truncate mb-1">
                  {doc.name}
                </h3>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">
                    {doc.category}
                  </span>
                  <span className="text-[10px] text-white/20">
                    {formatSize(doc.size)}
                  </span>
                </div>
                {doc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {doc.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-white/30"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-white/20 mt-2">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDocs.map((doc) => {
            const Icon = getFileIcon(doc.name);
            return (
              <div
                key={doc.id}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/[0.06] transition-all group cursor-pointer"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-500/10 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-primary-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-white/80 truncate">
                    {doc.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-500/10 text-primary-400">
                      {doc.category}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {formatSize(doc.size)}
                    </span>
                    <span className="text-[10px] text-white/20">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      handleDeleteDocument(doc.id);
                    }}
                    className="p-2 rounded-lg text-white/30 hover:text-error hover:bg-error/10 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
