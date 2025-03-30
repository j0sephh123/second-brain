import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("path");

    if (!filePath) {
      return NextResponse.json(
        { error: "File path is required" },
        { status: 400 }
      );
    }

    // Ensure the path is within the notes directory
    const fullPath = path.join(process.cwd(), "notes", filePath);
    const notesDir = path.join(process.cwd(), "notes");

    if (!fullPath.startsWith(notesDir) || !filePath.endsWith(".md")) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Error reading note content:", error);
    return NextResponse.json(
      { error: "Failed to read note content" },
      { status: 500 }
    );
  }
}
