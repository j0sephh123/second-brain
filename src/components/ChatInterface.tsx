"use client";

import { useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";
import Modal from "./Modal"; // Import the Modal component
import { useToast } from "@/hooks/useToast";

// Interface for a single message
interface Message {
  id: string; // Unique ID for the message
  content: string;
  isAI: boolean;
}

// Type for storing message branches
// Maps branch IDs to an array of messages in that branch
interface ChatBranches {
  [branchId: string]: Message[];
}

// Type for tracking the parent message of each branch
// Maps branch IDs to the ID of the message they branched from
interface BranchTree {
  [branchId: string]: string; // branchId -> parentMessageId
}

// --- Component Props --- //

interface ChatInterfaceProps {
  selectedNote: string | null;
  onNoteCreated?: () => void;
  onNoteUpdated?: (path: string) => void;
}

// --- Modal State Types --- //
type ModalStep = "initial" | "newFileName" | "confirmOverwrite";
interface ModalState {
  isOpen: boolean;
  step: ModalStep;
  messageToSave: Message | null;
  error?: string;
  fileNameToConfirm?: string;
}

// --- Component --- //

export default function ChatInterface({
  selectedNote,
  onNoteCreated,
  onNoteUpdated,
}: ChatInterfaceProps) {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [isSavingToNote, setIsSavingToNote] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    step: "initial",
    messageToSave: null,
  });
  const [newNoteNameInput, setNewNoteNameInput] = useState("");

  // --- Save to Note Modal Logic --- //

  const openSaveNoteModal = () => {
    if (!input.trim()) {
      toast({
        title: "Error",
        description: "Cannot save empty content.",
        variant: "destructive",
      });
      return;
    }
    setModalState({
      isOpen: true,
      step: "initial",
      messageToSave: { id: "current", content: input, isAI: false },
    });
    setNewNoteNameInput("");
  };

  const closeModal = () => {
    setModalState({
      isOpen: false,
      step: "initial",
      messageToSave: null,
      error: undefined,
    });
    setIsSavingToNote(false);
  };

  const proceedWithSave = async (
    action: "append" | "overwrite",
    targetFilename: string | null
  ) => {
    if (!modalState.messageToSave || !targetFilename) {
      setModalState((prev) => ({
        ...prev,
        error: "Missing content or filename.",
      }));
      return;
    }

    setIsSavingToNote(true);
    setModalState((prev) => ({ ...prev, error: undefined }));

    try {
      const response = await fetch("/api/notes/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: targetFilename,
          content: modalState.messageToSave.content,
          action: action,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `API error! status: ${response.status}`
        );
      }

      toast({
        title: "Success",
        description: `${result.message} in ${targetFilename}`,
      });
      closeModal();
      setInput(""); // Clear input after successful save

      if (onNoteCreated) {
        onNoteCreated();
      }
      if (onNoteUpdated) {
        onNoteUpdated(targetFilename);
      }
    } catch (error: unknown) {
      console.error("Error saving note:", error);
      setModalState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }));
    } finally {
      setIsSavingToNote(false);
    }
  };

  const handleCreateNewNoteAndSave = async () => {
    if (!newNoteNameInput || newNoteNameInput.trim() === "") {
      setModalState((prev) => ({
        ...prev,
        error: "New filename cannot be empty",
      }));
      return;
    }
    if (!modalState.messageToSave) return;

    setIsSavingToNote(true);
    setModalState((prev) => ({ ...prev, error: undefined }));

    let targetFilename = newNoteNameInput;

    try {
      const createResponse = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: targetFilename }),
      });
      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        if (createResponse.status === 409) {
          setModalState((prev) => ({
            ...prev,
            step: "confirmOverwrite",
            fileNameToConfirm: createResult.filename || targetFilename,
          }));
          setIsSavingToNote(false);
          return;
        } else {
          throw new Error(createResult.error || "Failed to prepare new note");
        }
      }

      targetFilename = createResult.filename;
      await proceedWithSave("overwrite", targetFilename);
    } catch (error: unknown) {
      console.error("Error during new note creation/saving:", error);
      setModalState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }));
      setIsSavingToNote(false);
    }
  };

  const handleConfirmOverwrite = async () => {
    if (!modalState.fileNameToConfirm) {
      setModalState((prev) => ({
        ...prev,
        error: "Cannot determine filename to overwrite.",
      }));
      return;
    }

    setIsSavingToNote(true);
    try {
      const createResponse = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: modalState.fileNameToConfirm }),
      });
      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        throw new Error(
          createResult.error || "Failed to prepare note for overwrite"
        );
      }

      await proceedWithSave(
        "overwrite",
        createResult.filename || modalState.fileNameToConfirm
      );

      if (onNoteCreated) {
        onNoteCreated();
      }
    } catch (error: unknown) {
      console.error("Error during note overwrite:", error);
      setModalState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }));
    } finally {
      setIsSavingToNote(false);
    }
  };

  const renderModalContent = () => {
    switch (modalState.step) {
      case "newFileName":
        return (
          <div>
            <label
              htmlFor="newNoteName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Enter filename for new note:
            </label>
            <input
              type="text"
              id="newNoteName"
              value={newNoteNameInput.replace(/\.md$/, "")}
              onChange={(e) => setNewNoteNameInput(e.target.value + ".md")}
              placeholder="e.g., my-note"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 dark:bg-gray-700 dark:text-gray-100"
            />
            {modalState.error && (
              <p className="text-red-500 text-sm mt-2">
                Error: {modalState.error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateNewNoteAndSave}
                disabled={isSavingToNote}
                className="px-4 py-2 text-sm rounded bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50"
              >
                {isSavingToNote ? "Creating..." : "Create & Save"}
              </button>
            </div>
          </div>
        );
      case "confirmOverwrite":
        return (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Note named{" "}
              <strong className="font-semibold">
                {modalState.fileNameToConfirm || "this file"}
              </strong>{" "}
              already exists. Do you want to overwrite it?
            </p>
            {modalState.error && (
              <p className="text-red-500 text-sm mt-2">
                Error: {modalState.error}
              </p>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() =>
                  setModalState((prev) => ({
                    ...prev,
                    step: "newFileName",
                    error: undefined,
                  }))
                }
                className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100"
              >
                Choose Different Name
              </button>
              <button
                onClick={handleConfirmOverwrite}
                disabled={isSavingToNote}
                className="px-4 py-2 text-sm rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50"
              >
                {isSavingToNote ? "Overwriting..." : "Yes, Overwrite"}
              </button>
            </div>
          </div>
        );
      case "initial":
      default:
        return (
          <div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
              Where would you like to save this content?
            </p>
            {modalState.error && (
              <p className="text-red-500 text-sm mb-2">
                Error: {modalState.error}
              </p>
            )}
            <div className="space-y-2">
              <button
                onClick={() => proceedWithSave("append", selectedNote)}
                disabled={!selectedNote || isSavingToNote}
                title={
                  !selectedNote
                    ? "Select a note first"
                    : "Append to end of selected note"
                }
                className="w-full px-4 py-2 text-sm text-left rounded bg-blue-500 hover:bg-blue-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Append to: {selectedNote || "(No Note Selected)"}
              </button>
              <button
                onClick={() => proceedWithSave("overwrite", selectedNote)}
                disabled={!selectedNote || isSavingToNote}
                title={
                  !selectedNote
                    ? "Select a note first"
                    : "Overwrite entire selected note"
                }
                className="w-full px-4 py-2 text-sm text-left rounded bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Overwrite: {selectedNote || "(No Note Selected)"}
              </button>
              <button
                onClick={() =>
                  setModalState((prev) => ({
                    ...prev,
                    step: "newFileName",
                    error: undefined,
                  }))
                }
                disabled={isSavingToNote}
                className="w-full px-4 py-2 text-sm text-left rounded bg-green-500 hover:bg-green-600 text-white disabled:opacity-50"
              >
                Save to New Note...
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm rounded bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 text-gray-800 dark:text-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700">
        <span className="text-gray-600 dark:text-gray-400">Markdown Input</span>
      </div>

      {/* Input Area */}
      <div className="flex-1 p-4">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Paste your markdown content here..."
          className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 resize-none font-mono text-sm"
        />
      </div>

      {/* Save Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={openSaveNoteModal}
          disabled={!input.trim() || isSavingToNote}
          className="w-full bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
        >
          {isSavingToNote ? "Saving..." : "Save to Notes"}
        </button>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title="Save Content to Note"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
