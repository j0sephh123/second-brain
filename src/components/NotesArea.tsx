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
  EyeIcon,
  EyeSlashIcon,
} from "@heroicons/react/24/outline";
import path from "path";
import { useToast } from "@/hooks/useToast";
import ConfirmModal from "./ConfirmModal";
import RenameModal from "./RenameModal";
import NewNoteModal from "./NewNoteModal";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import {
  DndContext,
  rectIntersection,
  closestCenter,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from "@dnd-kit/core";
import DraggableNoteItem from "./DraggableNoteItem";

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
    const [isEditing, setIsEditing] = useState(false);

    // Configure sensors for drag and drop
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 5, // Only start dragging after moving 5px - helps with accidental drags
        },
      }),
      useSensor(KeyboardSensor)
    );

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
        toast({
          title: "Error",
          description: "No note selected to save.",
          variant: "destructive",
        });
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
        toast({
          title: "Success",
          description: "Note saved successfully!",
          variant: "success",
        });
        setHasChanges(false);
      } catch (error: unknown) {
        console.error("Error saving note:", error);
        toast({
          title: "Error",
          description: `Error saving note: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
    };

    const handleRename = async (oldPath: string, newName: string) => {
      // Ensure the new name has .md extension if it's missing
      const finalNewName = newName.endsWith(".md") ? newName : `${newName}.md`;
      const newPath = oldPath.replace(/[^/]+$/, finalNewName);

      if (oldPath === newPath) {
        setNoteToRename(null); // Close modal if name didn't change
        return;
      }

      try {
        const response = await fetch("/api/notes/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ oldPath, newPath }),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to rename note");
        }

        await fetchFileTree();
        setNoteToRename(null);
        toast({
          title: "Success",
          description: "Note renamed successfully",
        });
        // Update selected note if it was the one renamed
        if (selectedNote === oldPath) {
          setSelectedNote(newPath);
        }
      } catch (error: unknown) {
        console.error("Error renaming note:", error);
        toast({
          title: "Error",
          description: `Failed to rename note: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      } finally {
        setNoteToRename(null); // Ensure modal closes even on error
      }
    };

    const handleConfirmRename = (newName: string) => {
      if (!noteToRename) return;
      handleRename(noteToRename.path, newName);
    };

    const handleDelete = async (path: string) => {
      setNoteToDelete(path);
    };

    const handleConfirmDelete = async () => {
      if (!noteToDelete) return;

      try {
        // Find the item in the file tree to know its type
        const isFolder =
          findNodeTypeInTree(fileTree, noteToDelete) === "directory";

        const response = await fetch("/api/notes/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: noteToDelete }),
        });

        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to delete");
        }

        await fetchFileTree();
        if (
          selectedNote === noteToDelete ||
          (selectedNote && selectedNote.startsWith(noteToDelete + "/"))
        ) {
          // If selected note is the deleted one or is inside the deleted folder
          setSelectedNote(null);
          setEditorContent("");
        }
        toast({
          title: "Success",
          description: isFolder
            ? "Folder deleted successfully"
            : "Note deleted successfully",
          variant: "success",
        });
      } catch (error: unknown) {
        console.error("Error deleting:", error);
        toast({
          title: "Error",
          description: `Failed to delete: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      } finally {
        setNoteToDelete(null);
      }
    };

    // Helper function to find a node's type in the file tree
    const findNodeTypeInTree = (
      nodes: FileNode[],
      targetPath: string
    ): "file" | "directory" | null => {
      for (const node of nodes) {
        if (node.path === targetPath) {
          return node.type;
        }
        if (node.children) {
          const found = findNodeTypeInTree(node.children, targetPath);
          if (found) return found;
        }
      }
      return null;
    };

    // Handle drag end
    const handleDragEnd = async (event: any) => {
      const { active, over } = event;

      console.log("Drag End Event:", event);
      console.log("Active:", active);
      console.log("Over:", over);

      // If dropped outside a droppable area (folder)
      if (!over) {
        console.log("Dropped outside any droppable area.");
        return;
      }

      const activeId = active.id as string; // Path of the dragged item (should be a file)
      const overId = over.id as string; // Path of the drop target (folder)

      console.log(`Attempting Drag: activeId=${activeId}, overId=${overId}`);
      console.log("Over Data:", over.data?.current);
      console.log("Active Data:", active.data?.current);

      // Cannot drop on self
      if (activeId === overId) {
        console.log("Cannot drop on self.");
        return;
      }

      // Check if dragging a file (we only support dragging files)
      if (active.data.current?.type !== "file") {
        console.log("Cannot drag item of type:", active.data.current?.type);
        return;
      }

      // Check if target is a folder
      const isOverFolder = over.data.current?.type === "directory";
      if (!isOverFolder) {
        console.log("Invalid drop target (not a folder).");
        return; // Only allow dropping onto folders
      }

      const targetFolder = overId;
      console.log(`Target is FOLDER: ${targetFolder}`);

      // Check if trying to drop into the same parent folder
      const activeParentPath = path.dirname(activeId);
      console.log(
        `File's parent folder: ${activeParentPath}, Target folder: ${targetFolder}`
      );

      if (activeParentPath === targetFolder) {
        console.log("Cannot drop into the same folder as source.");
        toast({
          title: "Invalid Drop",
          description: "Cannot move a file to the folder it's already in",
          variant: "destructive",
        });
        return;
      }

      try {
        console.log(`Moving file: ${activeId} to target: ${targetFolder}`);

        const response = await fetch("/api/notes/move", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            sourcePath: activeId, // The file being dragged
            targetFolder: targetFolder, // The folder path
          }),
        });

        // Log the raw response for debugging
        const responseText = await response.text();
        console.log("Raw API response:", responseText);

        // Parse the response as JSON
        let result;
        try {
          result = JSON.parse(responseText);
        } catch (e) {
          console.error("Failed to parse response as JSON:", e);
          throw new Error("Invalid response format from server");
        }

        if (!response.ok) {
          // Use error message from API if available
          throw new Error(result.error || "Failed to move note");
        }

        setFileTree(result.tree); // Update tree from response
        toast({
          title: "Success",
          description: result.message || "Note moved successfully",
        });

        // Update selection if the moved note was selected
        if (selectedNote === activeId) {
          const baseName = path.basename(activeId);
          const newPath = path.join(targetFolder, baseName);
          console.log(
            `Updating selected note from ${selectedNote} to ${newPath}`
          );
          setSelectedNote(newPath);
          // No need to fetch content again, editor state persists unless component remounts
        }
      } catch (error: unknown) {
        console.error("Error moving note:", error);
        toast({
          title: "Error",
          description: `Failed to move note: ${
            error instanceof Error ? error.message : String(error)
          }`,
          variant: "destructive",
        });
      }
    };

    const renderFileTree = (nodes: FileNode[], level: number = 0) => {
      return nodes.map((node) => (
        <div key={node.path} style={{ paddingLeft: `${level * 1.5}rem` }}>
          <DraggableNoteItem
            note={node}
            selectedNote={selectedNote}
            onNoteClick={handleFileClick}
            onRename={setNoteToRename}
            onDelete={handleDelete}
          />
          {node.children && renderFileTree(node.children, level + 1)}
        </div>
      ));
    };

    return (
      <div className="flex h-full">
        {/* File Tree Pane */}
        <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col relative">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            {/* Container for the File Tree */}
            <div className="flex-grow overflow-y-auto">
              {isLoadingTree ? (
                <p className="text-gray-500 dark:text-gray-400 animate-pulse px-2">
                  Loading notes...
                </p>
              ) : fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400 text-sm">
                  No notes yet. Create one using the "New Note" button.
                </div>
              )}
            </div>
          </DndContext>
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
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsEditing(!isEditing)}
                    title={isEditing ? "Preview Note" : "Edit Note"}
                    className="p-2 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    {isEditing ? (
                      <EyeIcon className="h-5 w-5" />
                    ) : (
                      <EyeSlashIcon className="h-5 w-5" />
                    )}
                  </button>
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
              </div>
              {isEditing ? (
                <textarea
                  key={selectedNote}
                  value={editorContent}
                  onChange={handleEditorChange}
                  placeholder="Start writing your note..."
                  className="w-full h-full flex-grow p-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono text-sm"
                />
              ) : (
                <div className="w-full h-full flex-grow p-3 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 overflow-y-auto prose dark:prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                  >
                    {editorContent}
                  </ReactMarkdown>
                </div>
              )}
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
          title={
            noteToDelete &&
            findNodeTypeInTree(fileTree, noteToDelete) === "directory"
              ? "Delete Folder"
              : "Delete Note"
          }
          message={
            noteToDelete
              ? `Are you sure you want to delete "${path.basename(
                  noteToDelete
                )}"?${
                  findNodeTypeInTree(fileTree, noteToDelete) === "directory"
                    ? " This will delete the folder and ALL its contents."
                    : ""
                } This action cannot be undone.`
              : ""
          }
          confirmText="Delete"
          cancelText="Cancel"
        />

        {/* Rename Modal */}
        <RenameModal
          isOpen={noteToRename !== null}
          onClose={() => setNoteToRename(null)}
          onConfirm={handleConfirmRename}
          currentName={
            noteToRename
              ? path.basename(noteToRename.name).replace(/\\.md$/, "")
              : ""
          }
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
