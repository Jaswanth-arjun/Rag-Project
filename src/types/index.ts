export interface Document {
  id: string;
  name: string;
  type: string;
  category: string;
  size: number;
  uploadedAt: string;
  summary?: string;
  tags: string[];
  extractedText?: string;
  metadata?: Record<string, string>;
}

export interface Memory {
  id: string;
  content: string;
  category: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  source?: string;
  relatedDocIds?: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  sources?: DocumentSource[];
  attachments?: FileAttachment[];
}

export interface DocumentSource {
  docId: string;
  docName: string;
  snippet: string;
  relevance: number;
}

export interface FileAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ReferralContact {
  id: string;
  name: string;
  company: string;
  designation: string;
  linkedinUrl: string;
  email: string;
  skills: string[];
  location: string;
  notes: string;
  referralStatus: "pending" | "contacted" | "referred" | "declined" | "none";
  lastContactDate: string;
  followUpDate: string;
  priority: "high" | "medium" | "low";
  tags: string[];
}

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  resumeVersion: string;
  appliedDate: string;
  status: "applied" | "screening" | "interview" | "assessment" | "offer" | "rejected" | "accepted" | "withdrawn";
  assessmentDate?: string;
  interviewDate?: string;
  result?: string;
  offerAmount?: string;
  notes: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  techStack: string[];
  githubUrl?: string;
  images: string[];
  tasks: ProjectTask[];
  progress: number;
  status: "active" | "completed" | "paused" | "planned";
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTask {
  id: string;
  title: string;
  completed: boolean;
  deadline?: string;
}

export interface StudyNote {
  id: string;
  title: string;
  subject: string;
  topic: string;
  content: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  tags: string[];
  bookmarked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResult {
  type: "document" | "memory" | "chat" | "note" | "contact" | "project" | "job";
  id: string;
  title: string;
  snippet: string;
  relevance: number;
  category?: string;
  timestamp: string;
}

export type CategoryType =
  | "Personal Documents"
  | "Education"
  | "Certificates"
  | "Projects"
  | "Resume"
  | "Interview Experiences"
  | "Companies"
  | "Job Applications"
  | "LinkedIn Contacts"
  | "Study Notes"
  | "Books"
  | "Research"
  | "Personal Notes"
  | "Medical"
  | "Finance"
  | "Bills"
  | "Receipts"
  | "Images"
  | "Videos"
  | "Audio"
  | "Miscellaneous";

export const CATEGORIES: CategoryType[] = [
  "Personal Documents",
  "Education",
  "Certificates",
  "Projects",
  "Resume",
  "Interview Experiences",
  "Companies",
  "Job Applications",
  "LinkedIn Contacts",
  "Study Notes",
  "Books",
  "Research",
  "Personal Notes",
  "Medical",
  "Finance",
  "Bills",
  "Receipts",
  "Images",
  "Videos",
  "Audio",
  "Miscellaneous",
];

export const CATEGORY_ICONS: Record<string, string> = {
  "Personal Documents": "📄",
  Education: "🎓",
  Certificates: "📜",
  Projects: "🚀",
  Resume: "📋",
  "Interview Experiences": "💼",
  Companies: "🏢",
  "Job Applications": "✉️",
  "LinkedIn Contacts": "🔗",
  "Study Notes": "📚",
  Books: "📖",
  Research: "🔬",
  "Personal Notes": "📝",
  Medical: "🏥",
  Finance: "💰",
  Bills: "🧾",
  Receipts: "🧾",
  Images: "🖼️",
  Videos: "🎥",
  Audio: "🎵",
  Miscellaneous: "📦",
};
