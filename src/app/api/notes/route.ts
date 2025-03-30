import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define the path to the notes directory
const notesDir = path.join(process.cwd(), "notes");

async function readDir(dirPath: string, basePath: string = ""): Promise<any[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const nodes = [];

  // Try to read the metadata file to get the order
  let order: string[] = [];
  try {
    const metadataPath = path.join(notesDir, ".metadata.json");
    const metadataContent = await fs.readFile(metadataPath, "utf-8");
    const metadata = JSON.parse(metadataContent);
    order = metadata.order || [];
  } catch (error) {
    // If metadata file doesn't exist or is invalid, continue without order
    console.log("No metadata file found, using default order");
  }

  // Create a map for order lookup
  const orderMap = new Map(order.map((item, index) => [item, index]));

  for (const entry of entries) {
    const nodePath = path.join(basePath, entry.name);
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const children = await readDir(fullPath, nodePath);
      if (children.length > 0) {
        nodes.push({
          name: entry.name,
          path: nodePath,
          type: "directory",
          children,
        });
      }
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      nodes.push({
        name: entry.name,
        path: nodePath,
        type: "file",
      });
    }
  }

  // Sort nodes based on the order map
  return nodes.sort((a, b) => {
    const orderA = orderMap.get(a.path) ?? Number.MAX_SAFE_INTEGER;
    const orderB = orderMap.get(b.path) ?? Number.MAX_SAFE_INTEGER;
    return orderA - orderB;
  });
}

export async function GET() {
  try {
    const tree = await readDir(notesDir);
    return NextResponse.json(tree);
  } catch (error) {
    console.error("Error reading notes directory:", error);
    return NextResponse.json(
      { error: "Failed to read notes directory" },
      { status: 500 }
    );
  }
}
