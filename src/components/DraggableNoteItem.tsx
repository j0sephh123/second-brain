import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { PencilIcon, TrashIcon, FolderIcon } from "@heroicons/react/24/outline";
import React from "react";
import path from "path";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

interface DraggableNoteItemProps {
  note: FileNode;
  selectedNote: string | null;
  onNoteClick: (path: string) => void;
  onRename: (note: { path: string; name: string }) => void;
  onDelete: (path: string) => void;
}

export default function DraggableNoteItem({
  note,
  selectedNote,
  onNoteClick,
  onRename,
  onDelete,
}: DraggableNoteItemProps) {
  const isFile = note.type === "file";
  const isDirectory = note.type === "directory";

  // Setup for draggable files
  const {
    attributes: dragAttributes,
    listeners: dragListeners,
    setNodeRef: setDraggableNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: note.path,
    data: { type: note.type, path: note.path },
    disabled: !isFile, // Only files are draggable
  });

  // Setup for droppable folders
  const { isOver, setNodeRef: setDroppableNodeRef } = useDroppable({
    id: note.path,
    data: { type: note.type, path: note.path },
    disabled: !isDirectory, // Only folders are droppable
  });

  // Combine refs
  const setNodeRef = React.useCallback(
    (node: HTMLElement | null) => {
      setDraggableNodeRef(node);
      if (isDirectory) {
        setDroppableNodeRef(node);
      }
    },
    [setDraggableNodeRef, setDroppableNodeRef, isDirectory]
  );

  const style = {
    transform: CSS.Translate.toString(transform), // Use Translate for draggable
    transition: isDragging ? "none" : "transform 0.2s ease", // Smooth transition back, none while dragging
    opacity: isDragging ? 0.5 : 1,
    cursor: isFile ? "grab" : "default", // Only files show grab cursor
    backgroundColor:
      isDirectory && isOver
        ? "rgba(0, 100, 255, 0.1)" // Blue for valid drop
        : "transparent",
    zIndex: isDragging ? 100 : "auto",
    padding: "2px",
    margin: "2px 0",
    borderRadius: "4px",
  };

  const displayName = note.name.replace(/\.md$/, "");

  // Combine listeners and attributes
  const attributes = isFile ? dragAttributes : {};
  const listeners = isFile ? dragListeners : {};

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`py-1 px-2 rounded ${
        selectedNote === note.path
          ? "bg-blue-100 dark:bg-blue-900"
          : "hover:bg-gray-100 dark:hover:bg-gray-700"
      } ${isDragging ? "shadow-lg" : ""} ${
        isDirectory && isOver ? "ring-2 ring-blue-300" : "" // Add ring for better visibility
      }`}
      {...attributes}
      {...listeners}
    >
      <div className="group flex items-center justify-between w-full">
        <button
          onClick={() => onNoteClick(note.path)}
          className="flex-1 text-left hover:text-blue-500 dark:hover:text-blue-400 text-sm flex items-center gap-1"
          disabled={isDragging} // Disable click while dragging
        >
          {isDirectory && <FolderIcon className="h-4 w-4 text-gray-500" />}
          {displayName}
        </button>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRename({ path: note.path, name: note.name });
            }}
            className="p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400"
          >
            <PencilIcon className="h-3 w-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.path);
            }}
            className={`p-1 ${
              isDirectory
                ? "text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30"
                : "text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
            } rounded-sm`}
            title={
              isDirectory ? "Delete folder and all its contents" : "Delete note"
            }
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
