import { useState } from "react";
import Modal from "./Modal";

interface NewNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (filename: string) => void;
}

export default function NewNoteModal({
  isOpen,
  onClose,
  onConfirm,
}: NewNoteModalProps) {
  const [filename, setFilename] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (filename.trim()) {
      onConfirm(filename.trim());
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="filename"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Note Name
          </label>
          <input
            type="text"
            id="filename"
            value={filename.replace(/\.md$/, "")}
            onChange={(e) => setFilename(e.target.value + ".md")}
            className="w-full px-3 py-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            placeholder="Enter note name"
          />
        </div>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!filename.trim()}
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Create Note
          </button>
        </div>
      </form>
    </Modal>
  );
}
