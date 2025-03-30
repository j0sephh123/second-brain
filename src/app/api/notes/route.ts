import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

interface FileNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileNode[];
}

function buildFileTree(dirPath: string, relativePath: string = ""): FileNode[] {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const nodes: FileNode[] = [];

  entries.forEach((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    const relativeNodePath = path.join(relativePath, entry.name);

    if (entry.isDirectory()) {
      nodes.push({
        name: entry.name,
        path: relativeNodePath,
        type: "directory",
        children: buildFileTree(fullPath, relativeNodePath),
      });
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      nodes.push({
        name: entry.name,
        path: relativeNodePath,
        type: "file",
      });
    }
  });

  return nodes.sort((a, b) => {
    // Directories come before files
    if (a.type !== b.type) {
      return a.type === "directory" ? -1 : 1;
    }
    // Alphabetical order
    return a.name.localeCompare(b.name);
  });
}

export async function GET() {
  try {
    const notesDir = path.join(process.cwd(), "notes");
    const fileTree = buildFileTree(notesDir);
    return NextResponse.json(fileTree);
  } catch (error) {
    console.error("Error reading notes directory:", error);
    return NextResponse.json(
      { error: "Failed to read notes directory" },
      { status: 500 }
    );
  }
}
