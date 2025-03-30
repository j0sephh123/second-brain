import React, { useState, useEffect } from "react";
import Modal from "./Modal";

interface RenameModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newName: string) => void;
  currentName: string;
}

export default function RenameModal({
  isOpen,
  onClose,
  onConfirm,
  currentName,
}: RenameModalProps) {
  const [newName, setNewName] = useState(currentName.replace(/\.md$/, ""));

  useEffect(() => {
    if (isOpen) {
      setNewName(currentName.replace(/\.md$/, ""));
    }
  }, [isOpen, currentName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onConfirm(newName.trim() + ".md");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Rename Note">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="newName"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            New Name
          </label>
          <input
            type="text"
            id="newName"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full px-3 py-2 text-sm border rounded-md dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
            autoFocus
            placeholder="Enter new name"
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
            disabled={
              !newName.trim() || newName === currentName.replace(/\.md$/, "")
            }
            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Rename
          </button>
        </div>
      </form>
    </Modal>
  );
}
