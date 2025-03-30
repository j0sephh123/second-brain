"use client";

import { useState, useRef, useCallback } from "react";
import ChatInterface from "@/components/ChatInterface";
import NotesArea, { NotesAreaRef } from "@/components/NotesArea";
import VisualizationArea from "@/components/VisualizationArea";

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
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        {/* Pass selectedNote and refresh callback to ChatInterface */}
        <ChatInterface
          selectedNote={selectedNote}
          onNoteCreated={handleNoteCreated}
          onNoteUpdated={handleNoteUpdated}
        />
      </div>

      {/* Middle Pane - Notes Area */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        {/* Pass selectedNote and its setter to NotesArea */}
        <NotesArea
          ref={notesAreaRef}
          selectedNote={selectedNote}
          setSelectedNote={setSelectedNote}
        />
      </div>

      {/* Right Pane - Visualization Area */}
      <div className="w-1/3">
        <VisualizationArea />
      </div>
    </main>
  );
}
