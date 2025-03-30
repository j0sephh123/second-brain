"use client";

import { useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/solid";

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
}

// --- Component --- //

export default function ChatInterface({ selectedNote }: ChatInterfaceProps) {
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

  // Updated handler for Save to Notes
  const handleSaveToNotesClick = async (messageId: string) => {
    // 1. Check if a note is selected
    if (!selectedNote) {
      alert("Please select a note in the middle pane first.");
      return;
    }

    // 2. Find the message content
    const currentMessages = chatBranches[currentBranchId] || [];
    const messageToSave = currentMessages.find((msg) => msg.id === messageId);

    if (!messageToSave) {
      console.error("Message not found for saving.");
      alert("Error: Could not find message content.");
      return;
    }

    const contentToAppend = messageToSave.content;

    // 3. Call the API
    try {
      const response = await fetch("/api/notes/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: selectedNote, // Use the selected note filename
          content: contentToAppend,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || `HTTP error! status: ${response.status}`
        );
      }

      console.log("Successfully appended content to note:", selectedNote);
      alert(`Content saved to ${selectedNote}`);
      // Optional: Trigger refresh of NotesArea content if needed,
      // but appendFile doesn't usually require UI refresh unless viewing the file.
    } catch (error: any) {
      console.error("Error saving to note:", error);
      alert(`Error saving to note: ${error.message}`);
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

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900">
      {/* Header with Branch Selector */}
      <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between text-sm">
        <span className="text-gray-600 dark:text-gray-400">Chat Branch:</span>
        <select
          value={currentBranchId}
          onChange={handleBranchSwitch}
          className="ml-2 p-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
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
                    onClick={() => handleBranchClick(message.id)} // Use the new handler
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    Branch from this
                  </button>
                  <button
                    onClick={() => handleSaveToNotesClick(message.id)}
                    disabled={!selectedNote} // Disable if no note is selected
                    className={`text-xs px-2 py-1 rounded focus:outline-none focus:ring-2 focus:ring-green-400 ${
                      !selectedNote
                        ? "bg-gray-400 dark:bg-gray-600 text-gray-700 dark:text-gray-400 cursor-not-allowed"
                        : "bg-green-500 dark:bg-green-600 text-white hover:bg-green-600 dark:hover:bg-green-700"
                    }`}
                    title={
                      !selectedNote
                        ? "Select a note first"
                        : "Save this message to the selected note"
                    }
                  >
                    Save to Notes
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
            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white rounded-lg px-4 py-2 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </form>
    </div>
  );
}
