import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "AI Second Brain — Your Personal Knowledge Assistant",
  description:
    "Upload documents, images & files. Store memories. Retrieve anything instantly with natural language.",
  keywords: ["AI", "RAG", "chatbot", "knowledge base", "personal assistant"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="theme-color" content="#030712" />
      </head>
      <body>
        <AppProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              style: {
                background: "rgba(15, 23, 42, 0.92)",
                color: "#fff",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(99, 102, 241, 0.2)",
                borderRadius: "12px",
                fontSize: "14px",
              },
            }}
          />
        </AppProvider>
      </body>
    </html>
  );
}
