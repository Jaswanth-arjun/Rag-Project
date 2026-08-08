"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type {
  Document,
  Memory,
  ChatConversation,
  ChatMessage,
  ReferralContact,
  JobApplication,
  SearchResult,
} from "@/types";

interface AppContextType {
  // Navigation
  activePage: string;
  setActivePage: (page: string) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Documents
  documents: Document[];
  addDocument: (doc: Document) => void;
  removeDocument: (id: string) => void;

  // Memories
  memories: Memory[];
  addMemory: (memory: Memory) => void;
  removeMemory: (id: string) => void;

  // Chats
  conversations: ChatConversation[];
  activeConversation: ChatConversation | null;
  setActiveConversation: (conv: ChatConversation | null) => void;
  createConversation: () => ChatConversation;
  addMessage: (convId: string, message: ChatMessage) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (results: SearchResult[]) => void;

  // Referrals
  referralContacts: ReferralContact[];
  addReferralContact: (contact: ReferralContact) => void;

  // Job Applications
  jobApplications: JobApplication[];
  addJobApplication: (app: JobApplication) => void;

  // API
  apiKey: string;
  setApiKey: (key: string) => void;
  backendUrl: string;
  setBackendUrl: (url: string) => void;

  // Theme
  theme: "dark" | "light";
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<ChatConversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [referralContacts, setReferralContacts] = useState<ReferralContact[]>([]);
  const [jobApplications, setJobApplications] = useState<JobApplication[]>([]);
  const [apiKey, setApiKey] = useState("");
  const [backendUrl, setBackendUrl] = useState("http://localhost:8000");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  const addDocument = useCallback((doc: Document) => {
    setDocuments((prev) => [doc, ...prev]);
  }, []);

  const removeDocument = useCallback((id: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addMemory = useCallback((memory: Memory) => {
    setMemories((prev) => [memory, ...prev]);
  }, []);

  const removeMemory = useCallback((id: string) => {
    setMemories((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const createConversation = useCallback(() => {
    const conv: ChatConversation = {
      id: crypto.randomUUID(),
      title: "New Chat",
      messages: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setConversations((prev) => [conv, ...prev]);
    setActiveConversation(conv);
    return conv;
  }, []);

  const addMessage = useCallback((convId: string, message: ChatMessage) => {
    setConversations((prev) =>
      prev.map((conv) => {
        if (conv.id === convId) {
          const updated = {
            ...conv,
            messages: [...conv.messages, message],
            updatedAt: new Date().toISOString(),
            title:
              conv.messages.length === 0 && message.role === "user"
                ? message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
                : conv.title,
          };
          return updated;
        }
        return conv;
      })
    );
    setActiveConversation((prev) => {
      if (prev && prev.id === convId) {
        return {
          ...prev,
          messages: [...prev.messages, message],
          updatedAt: new Date().toISOString(),
          title:
            prev.messages.length === 0 && message.role === "user"
              ? message.content.slice(0, 50) + (message.content.length > 50 ? "..." : "")
              : prev.title,
        };
      }
      return prev;
    });
  }, []);

  const addReferralContact = useCallback((contact: ReferralContact) => {
    setReferralContacts((prev) => [contact, ...prev]);
  }, []);

  const addJobApplication = useCallback((app: JobApplication) => {
    setJobApplications((prev) => [app, ...prev]);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  return (
    <AppContext.Provider
      value={{
        activePage,
        setActivePage,
        sidebarOpen,
        setSidebarOpen,
        documents,
        addDocument,
        removeDocument,
        memories,
        addMemory,
        removeMemory,
        conversations,
        activeConversation,
        setActiveConversation,
        createConversation,
        addMessage,
        searchQuery,
        setSearchQuery,
        searchResults,
        setSearchResults,
        referralContacts,
        addReferralContact,
        jobApplications,
        addJobApplication,
        apiKey,
        setApiKey,
        backendUrl,
        setBackendUrl,
        theme,
        toggleTheme,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
}
