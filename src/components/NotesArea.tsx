"use client";

import {
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  FolderIcon,
  ArrowDownTrayIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import path from "path";
import { useToast } from "@/hooks/useToast";
import ConfirmModal from "./ConfirmModal";
import RenameModal from "./RenameModal";
import NewNoteModal from "./NewNoteModal";

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

export interface NotesAreaRef {
  fetchFileTree: () => Promise<void>;
  fetchFileContentForEditor: (path: string) => Promise<void>;
}

const NotesArea = forwardRef<NotesAreaRef, NotesAreaProps>(
  ({ selectedNote, setSelectedNote }, ref) => {
    const [fileTree, setFileTree] = useState<FileNode[]>([]);
    const [isLoadingTree, setIsLoadingTree] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<string | null>(null);
    const [noteToRename, setNoteToRename] = useState<{
      path: string;
      name: string;
    } | null>(null);
    const [isNewNoteModalOpen, setIsNewNoteModalOpen] = useState(false);
    const { toast } = useToast();

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

    const fetchFileContentForEditor = useCallback(async (path: string) => {
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
    }, []);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      fetchFileTree,
      fetchFileContentForEditor,
    }));

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

    const handleCreateNewNote = async () => {
      if (
        hasChanges &&
        !window.confirm(
          "You have unsaved changes. Discard them and create a new note?"
        )
      ) {
        return;
      }
      setIsNewNoteModalOpen(true);
    };

    const handleNewNoteConfirm = async (filename: string) => {
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
        toast({
          title: "Success",
          description: `Note "${result.filename}" created.`,
        });
        await fetchFileTree();
        setSelectedNote(result.filename);
      } catch (error: unknown) {
        console.error("Error creating note:", error);
        toast({
          title: "Error",
          description: `Error creating note: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      } finally {
        setIsNewNoteModalOpen(false);
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
      } catch (error: unknown) {
        console.error("Error saving note:", error);
        alert(
          `Error saving note: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      } finally {
        setIsSaving(false);
      }
    };

    const handleRename = async (oldPath: string, newPath: string) => {
      try {
        const response = await fetch("/api/notes/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPath, newPath }),
        });

        if (!response.ok) {
          throw new Error("Failed to rename note");
        }

        await fetchFileTree();
        setNoteToRename(null);
        toast({
          title: "Success",
          description: "Note renamed successfully",
        });
      } catch (error) {
        console.error("Error renaming note:", error);
        toast({
          title: "Error",
          description: "Failed to rename note",
          variant: "destructive",
        });
      }
    };

    const handleConfirmRename = (newName: string) => {
      if (!noteToRename) return;
      const newPath = noteToRename.path.replace(/[^/]+$/, newName);
      handleRename(noteToRename.path, newPath);
    };

    const handleDelete = async (path: string) => {
      setNoteToDelete(path);
    };

    const handleConfirmDelete = async () => {
      if (!noteToDelete) return;

      try {
        const response = await fetch("/api/notes/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: noteToDelete }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete note");
        }

        await fetchFileTree();
        if (selectedNote === noteToDelete) {
          setSelectedNote(null);
          setEditorContent("");
        }
        toast({
          title: "Success",
          description: "Note deleted successfully",
          variant: "success",
        });
      } catch (error) {
        console.error("Error deleting note:", error);
        toast({
          title: "Error",
          description: "Failed to delete note",
          variant: "destructive",
        });
      } finally {
        setNoteToDelete(null);
      }
    };

    const renderFileTree = (nodes: FileNode[], level: number = 0) => {
      return nodes.map((node) => (
        <div key={node.path} style={{ marginLeft: `${level * 1.5}rem` }}>
          {node.type === "directory" ? (
            <div className="flex items-center gap-1 text-gray-600 dark:text-gray-300 py-1">
              <FolderIcon className="h-4 w-4" />
              <span>{node.name}</span>
            </div>
          ) : (
            <div
              className={`py-1 px-2 rounded ${
                selectedNote === node.path
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {renderNoteItem(node)}
            </div>
          )}
          {node.children && renderFileTree(node.children, level + 1)}
        </div>
      ));
    };

    const renderNoteItem = (note: FileNode) => {
      const displayName = note.name.replace(/\.md$/, "");
      return (
        <div className="group flex items-center justify-between w-full">
          <button
            onClick={() => handleFileClick(note.path)}
            className="flex-1 text-left hover:text-blue-500 dark:hover:text-blue-400 text-sm"
          >
            {displayName}
          </button>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNoteToRename({ path: note.path, name: note.name });
              }}
              className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <PencilIcon className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(note.path);
              }}
              className="p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
            >
              <TrashIcon className="h-3 w-3" />
            </button>
          </div>
        </div>
      );
    };

    return (
      <div className="flex h-full">
        {/* File Tree */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4 flex-shrink-0">
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
                  {path.basename(selectedNote).replace(/\.md$/, "")}
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

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={noteToDelete !== null}
          onClose={() => setNoteToDelete(null)}
          onConfirm={handleConfirmDelete}
          title="Delete Note"
          message="Are you sure you want to delete this note? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
        />

        {/* Rename Modal */}
        <RenameModal
          isOpen={noteToRename !== null}
          onClose={() => setNoteToRename(null)}
          onConfirm={handleConfirmRename}
          currentName={noteToRename?.name || ""}
        />

        {/* New Note Modal */}
        <NewNoteModal
          isOpen={isNewNoteModalOpen}
          onClose={() => setIsNewNoteModalOpen(false)}
          onConfirm={handleNewNoteConfirm}
        />
      </div>
    );
  }
);

NotesArea.displayName = "NotesArea";

export default NotesArea;
