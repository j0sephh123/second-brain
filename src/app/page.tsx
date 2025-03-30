"use client";

import { useState, useRef, useCallback } from "react";
import ChatInterface from "@/components/ChatInterface";
import NotesArea, { NotesAreaRef } from "@/components/NotesArea";
import Link from "next/link";

export default function Home() {
  // State for the currently selected note filename
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  // Ref to access NotesArea methods
  const notesAreaRef = useRef<NotesAreaRef>(null);

  const handleNoteCreated = useCallback(() => {
    notesAreaRef.current?.fetchFileTree();
  }, []);

  const handleNoteUpdated = useCallback((path: string) => {
    notesAreaRef.current?.fetchFileContentForEditor(path);
  }, []);

  return (
    <main className="flex h-screen bg-white dark:bg-gray-950">
      {/* Left Pane - Chat Interface */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        {/* Pass selectedNote and refresh callback to ChatInterface */}
        <ChatInterface
          selectedNote={selectedNote}
          onNoteCreated={handleNoteCreated}
          onNoteUpdated={handleNoteUpdated}
        />
      </div>

      {/* Middle Pane - Notes Area */}
      <div className="w-1/2 border-r border-gray-200 dark:border-gray-700">
        {/* Pass selectedNote and its setter to NotesArea */}
        <NotesArea
          ref={notesAreaRef}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
        />
      </div>

      {/* Graph Link Overlay */}
      <Link
        href="/graph"
        className="fixed bottom-4 right-4 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 shadow-lg transition-colors"
      >
        View Knowledge Graph
      </Link>
    </main>
  );
}
