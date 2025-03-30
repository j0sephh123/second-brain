"use client";

import { useState } from "react";
import ChatInterface from "@/components/ChatInterface";
import NotesArea from "@/components/NotesArea";
import VisualizationArea from "@/components/VisualizationArea";

export default function Home() {
  // State for the currently selected note filename
  const [selectedNote, setSelectedNote] = useState<string | null>(null);

  return (
    <main className="flex h-screen bg-white dark:bg-gray-950">
      {/* Left Pane - Chat Interface */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        {/* Pass selectedNote to ChatInterface */}
        <ChatInterface selectedNote={selectedNote} />
      </div>

      {/* Middle Pane - Notes Area */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700">
        {/* Pass selectedNote and its setter to NotesArea */}
        <NotesArea
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
