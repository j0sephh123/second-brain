import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define the path to the notes directory
const notesDir = path.join(process.cwd(), "notes");

interface NoteNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: { label: string };
}

interface NoteEdge {
  id: string;
  source: string;
  target: string;
}

export async function GET() {
  try {
    // Read all markdown files from the notes directory
    const files = await fs.readdir(notesDir);
    const markdownFiles = files.filter((file) => file.endsWith(".md"));

    // Create nodes for each markdown file
    const nodes: NoteNode[] = markdownFiles.map((file, index) => ({
      id: file,
      type: "default",
      position: {
        x: Math.random() * 800, // Random initial positions
        y: Math.random() * 600,
      },
      data: { label: file.replace(/\.md$/, "") },
    }));

    // Create edges based on content similarity (placeholder for now)
    const edges: NoteEdge[] = [];
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        // For now, create random connections
        if (Math.random() > 0.7) {
          edges.push({
            id: `${nodes[i].id}-${nodes[j].id}`,
            source: nodes[i].id,
            target: nodes[j].id,
          });
        }
      }
    }

    return NextResponse.json({ nodes, edges });
  } catch (error) {
    console.error("Error generating graph data:", error);
    return NextResponse.json(
      { error: "Failed to generate graph data" },
      { status: 500 }
    );
  }
}
