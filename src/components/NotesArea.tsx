"use client";

import { useState, useEffect, useCallback } from "react";
import {
  FolderIcon,
  DocumentIcon,
  ArrowDownTrayIcon,
} from "@heroicons/react/24/outline";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import path from "path";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface NotesAreaProps {
  selectedNote: string | null;
  setSelectedNote: (path: string | null) => void;
}

export default function NotesArea({
  selectedNote,
  setSelectedNote,
}: NotesAreaProps) {
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [isLoadingTree, setIsLoadingTree] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [editorContent, setEditorContent] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);

  const fetchFileTree = useCallback(async () => {
    setIsLoadingTree(true);
    try {
      const response = await fetch("/api/notes");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setFileTree(data);
    } catch (error) {
      console.error("Error fetching file tree:", error);
      alert("Failed to load notes tree.");
    } finally {
      setIsLoadingTree(false);
    }
  }, []);

  useEffect(() => {
    fetchFileTree();
  }, [fetchFileTree]);

  useEffect(() => {
    if (selectedNote) {
      fetchFileContentForEditor(selectedNote);
    } else {
      setEditorContent("");
      setHasChanges(false);
    }
  }, [selectedNote]);

  const fetchFileContentForEditor = async (path: string) => {
    try {
      const response = await fetch(
        `/api/notes/content?path=${encodeURIComponent(path)}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setEditorContent(data.content);
      setHasChanges(false);
    } catch (error) {
      console.error("Error fetching file content:", error);
      setEditorContent("Error loading file content.");
      setHasChanges(false);
    }
  };

  const handleCreateNewNote = async () => {
    if (
      hasChanges &&
      !window.confirm(
        "You have unsaved changes. Discard them and create a new note?"
      )
    ) {
      return;
    }
    const filename = window.prompt(
      "Filename (e.g., my-note.md):",
      "new-note.md"
    );
    if (!filename) return;
    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ filename }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! ${response.status}`);
      }
      alert(`Note "${result.filename}" created.`);
      await fetchFileTree();
      setSelectedNote(result.filename);
    } catch (error: any) {
      console.error("Error creating note:", error);
      alert(`Error creating note: ${error.message}`);
    }
  };

  const handleFileClick = (path: string) => {
    if (
      hasChanges &&
      !window.confirm(
        "You have unsaved changes. Discard them and load the selected note?"
      )
    ) {
      return;
    }
    setSelectedNote(path);
  };

  const handleEditorChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setEditorContent(event.target.value);
    setHasChanges(true);
  };

  const handleSaveNote = async () => {
    if (!selectedNote) {
      alert("No note selected to save.");
      return;
    }
    setIsSaving(true);
    try {
      const response = await fetch("/api/notes/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedNote,
          content: editorContent,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || `HTTP error! ${response.status}`);
      }
      alert("Note saved successfully!");
      setHasChanges(false);
    } catch (error: any) {
      console.error("Error saving note:", error);
      alert(`Error saving note: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const renderFileTree = (nodes: FileNode[], level: number = 0) => {
    return nodes.map((node) => (
      <div key={node.path} style={{ marginLeft: `${level * 1}rem` }}>
        <button
          onClick={() => {
            if (node.type === "file") {
              handleFileClick(node.path);
            }
          }}
          className={`flex items-center gap-1 p-1 w-full text-left rounded transition-colors ${
            selectedNote === node.path
              ? "bg-blue-100 dark:bg-blue-900 text-blue-900 dark:text-blue-100"
              : "hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-900 dark:text-gray-100"
          }`}
        >
          {node.type === "directory" ? (
            <FolderIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          ) : (
            <DocumentIcon className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
          )}
          <span className="text-sm truncate ml-1">{node.name}</span>
        </button>
        {node.children &&
          node.children.length > 0 &&
          renderFileTree(node.children, level + 1)}
      </div>
    ));
  };

  return (
    <div className="flex h-full">
      {/* File Tree */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 flex flex-col">
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Notes
          </h2>
          <button
            onClick={handleCreateNewNote}
            className="text-sm bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50"
            disabled={isLoadingTree || isSaving}
          >
            New Note
          </button>
        </div>
        <div className="flex-grow overflow-y-auto">
          {isLoadingTree ? (
            <p className="text-gray-500 dark:text-gray-400 animate-pulse">
              Loading notes...
            </p>
          ) : fileTree.length > 0 ? (
            renderFileTree(fileTree)
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              No notes found in ./notes
            </p>
          )}
        </div>
      </div>

      {/* Editor Area */}
      <div className="flex-1 flex flex-col p-4">
        {selectedNote ? (
          <>
            <div className="flex justify-between items-center mb-2 flex-shrink-0">
              <h3
                className="text-lg font-medium text-gray-800 dark:text-gray-200 truncate"
                title={selectedNote}
              >
                {path.basename(selectedNote)}
              </h3>
              <button
                onClick={handleSaveNote}
                disabled={!hasChanges || isSaving}
                className={`flex items-center gap-1 text-sm px-3 py-1 rounded ${
                  !hasChanges || isSaving
                    ? "bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                    : "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                }`}
              >
                <ArrowDownTrayIcon className="h-4 w-4" />
                {isSaving ? "Saving..." : "Save Note"}
              </button>
            </div>
            <textarea
              key={selectedNote}
              value={editorContent}
              onChange={handleEditorChange}
              placeholder="Start writing your note..."
              className="w-full h-full flex-grow p-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
            />
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            Select or create a note to view/edit
          </div>
        )}
      </div>
    </div>
  );
}
