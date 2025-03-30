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
  selectedNote: string | null; // Receive selected note from parent
  onNoteCreated?: () => void; // Callback to refresh notes list
  onNoteUpdated?: (path: string) => void; // Callback to refresh note content
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
  // State: All message branches
  const [chatBranches, setChatBranches] = useState<ChatBranches>({ root: [] });
  // State: ID of the currently active/displayed branch
  const [currentBranchId, setCurrentBranchId] = useState<string>("root");
  // State: Tree structure tracking branch parent messages
  const [branchTree, setBranchTree] = useState<BranchTree>({});
  // State: Simple counter for generating unique branch IDs
  const [branchCounter, setBranchCounter] = useState(0);
  // State: User input
  const [input, setInput] = useState("");
  // State: Loading state for save
  const [isSavingToNote, setIsSavingToNote] = useState(false);

  // New Modal State
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    step: "initial",
    messageToSave: null,
  });
  // State for the new filename input in the modal
  const [newNoteNameInput, setNewNoteNameInput] = useState("");

  // --- Event Handlers --- //

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const timestamp = Date.now();

    // Create user message
    const userMessage: Message = {
      id: `msg_${timestamp}_user`,
      content: input,
      isAI: false,
    };

    // Create simulated AI response
    const aiMessage: Message = {
      id: `msg_${timestamp + 1}_ai`,
      content: `Simulated response to: "${input}"`,
      isAI: true,
    };

    // Add messages to the *current* branch
    setChatBranches((prevBranches) => ({
      ...prevBranches,
      [currentBranchId]: [
        ...(prevBranches[currentBranchId] || []), // Handle potentially new branch
        userMessage,
        aiMessage,
      ],
    }));

    setInput(""); // Clear input field
  };

  // Handler for clicking the "Branch from this" button
  const handleBranchClick = (parentMessageId: string) => {
    // 1. Generate a new unique branch ID
    const newBranchId = `branch_${branchCounter + 1}`;
    setBranchCounter(branchCounter + 1);

    // 2. Find the parent branch and the index of the parent message
    const parentBranchMessages = chatBranches[currentBranchId] || [];
    const parentMessageIndex = parentBranchMessages.findIndex(
      (msg) => msg.id === parentMessageId
    );

    if (parentMessageIndex === -1) {
      console.error("Parent message not found in current branch!");
      return;
    }

    // 3. Get messages from the parent branch up to (and including) the branching point
    const messagesForNewBranch = parentBranchMessages.slice(
      0,
      parentMessageIndex + 1
    );

    // 4. Add the new branch to chatBranches state
    setChatBranches((prevBranches) => ({
      ...prevBranches,
      [newBranchId]: messagesForNewBranch,
    }));

    // 5. Record the branching point in the branchTree state
    setBranchTree((prevTree) => ({
      ...prevTree,
      [newBranchId]: parentMessageId,
    }));

    // 6. Switch to the new branch
    setCurrentBranchId(newBranchId);

    // 7. Log the action
    console.log(
      "Created new branch:",
      newBranchId,
      "from message:",
      parentMessageId,
      "in branch:",
      currentBranchId // Note: currentBranchId is the *parent* branch here
    );

    // Future improvement: Could add visual indication of switching branches
  };

  // --- Save to Note Modal Logic --- //

  // 1. Open Modal Initial Step
  const openSaveNoteModal = (messageId: string) => {
    const currentMessages = chatBranches[currentBranchId] || [];
    const messageToSave = currentMessages.find((msg) => msg.id === messageId);
    if (!messageToSave) {
      toast({
        title: "Error",
        description: "Could not find message content.",
        variant: "destructive",
      });
      return;
    }
    setModalState({ isOpen: true, step: "initial", messageToSave });
    setNewNoteNameInput(""); // Reset input
  };

  // 2. Close Modal
  const closeModal = () => {
    setModalState({
      isOpen: false,
      step: "initial",
      messageToSave: null,
      error: undefined,
    });
    setIsSavingToNote(false); // Ensure loading state is reset
  };

  // 3. Proceed with Save Action (called from modal buttons)
  const proceedWithSave = async (
    action: "append" | "overwrite",
    targetFilename: string | null
  ) => {
    if (!modalState.messageToSave || !targetFilename) {
      setModalState((prev) => ({
        ...prev,
        error: "Missing message or filename.",
      }));
      return;
    }

    setIsSavingToNote(true);
    setModalState((prev) => ({ ...prev, error: undefined })); // Clear previous errors

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
      closeModal(); // Close modal on success

      // Call the refresh callbacks if they exist
      if (onNoteCreated) {
        onNoteCreated();
      }
      if (onNoteUpdated) {
        onNoteUpdated(targetFilename);
      }
    } catch (error: unknown) {
      console.error("Error saving note:", error);
      // Display error within the modal
      setModalState((prev) => ({
        ...prev,
        error:
          error instanceof Error ? error.message : "An unknown error occurred",
      }));
    } finally {
      setIsSavingToNote(false);
    }
  };

  // 4. Handle Creating a New Note (from modal)
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

    let targetFilename = newNoteNameInput; // API will sanitize

    try {
      // Call create first
      const createResponse = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: targetFilename }),
      });
      const createResult = await createResponse.json();

      if (!createResponse.ok) {
        if (createResponse.status === 409) {
          // File exists, need to confirm overwrite in the modal
          setModalState((prev) => ({
            ...prev,
            step: "confirmOverwrite",
            fileNameToConfirm: createResult.filename || targetFilename,
          }));
          // Don't proceed further until confirmed
          setIsSavingToNote(false);
          return;
        } else {
          throw new Error(createResult.error || "Failed to prepare new note");
        }
      }

      targetFilename = createResult.filename; // Use sanitized name
      // File created, now overwrite it with content
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

  // 5. Handle confirmed overwrite (from modal)
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
      // Call create first to ensure the file exists
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

      // Now proceed with the overwrite
      await proceedWithSave(
        "overwrite",
        createResult.filename || modalState.fileNameToConfirm
      );

      // Call the refresh callback if it exists
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

  // Handler for switching branches via dropdown
  const handleBranchSwitch = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setCurrentBranchId(event.target.value);
  };

  // --- Rendering Logic --- //

  // Get messages for the currently selected branch
  const currentMessages = chatBranches[currentBranchId] || [];
  // Get a list of all available branch IDs
  const availableBranchIds = Object.keys(chatBranches);

  // --- Modal Content Rendering --- //
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
              placeholder="e.g., chat-summary"
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
              already exists. Do you want to overwrite it with the chat message
              content?
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
              Where would you like to save this message?
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
      {/* Header with Branch Selector */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Chat Branch:</span>
        <select
          value={currentBranchId}
          onChange={handleBranchSwitch}
          disabled={isSavingToNote} // Disable branch switch during save
          className="ml-2 p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
        >
          {availableBranchIds.map((branchId) => (
            <option key={branchId} value={branchId}>
              {branchId}
            </option>
          ))}
        </select>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {currentMessages.map((message) => (
          <div
            key={message.id} // Use message ID as key
            className={`flex flex-col ${
              message.isAI ? "items-start" : "items-end"
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-3 shadow-sm ${
                message.isAI
                  ? "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  : "bg-blue-500 dark:bg-blue-600 text-white"
              }`}
            >
              <p>{message.content}</p>
              {message.isAI && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleBranchClick(message.id)}
                    disabled={isSavingToNote} // Disable branching during save
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                  >
                    Branch from this
                  </button>
                  <button
                    onClick={() => openSaveNoteModal(message.id)} // Open the modal instead
                    disabled={isSavingToNote}
                    className={`text-xs px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-green-400 ${
                      isSavingToNote
                        ? "bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-400 cursor-wait"
                        : "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                    }`}
                    title={
                      isSavingToNote
                        ? "Saving..."
                        : "Save this message to a note"
                    }
                  >
                    {isSavingToNote ? "Saving..." : "Save to Notes"}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Input Area */}
      <form
        onSubmit={handleSubmit}
        className="p-4 border-t border-gray-200 dark:border-gray-700"
      >
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            disabled={isSavingToNote} // Disable input during save
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isSavingToNote} // Disable send during save
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 disabled:opacity-50"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Render the Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={closeModal}
        title="Save Message to Note"
      >
        {renderModalContent()}
      </Modal>
    </div>
  );
}
