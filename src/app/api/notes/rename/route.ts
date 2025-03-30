import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { oldPath, newPath } = await request.json();

    // Validate paths
    if (!oldPath || !newPath) {
      return NextResponse.json(
        { error: "Old path and new path are required" },
        { status: 400 }
      );
    }

    // Ensure paths are within the notes directory
    const notesDir = path.join(process.cwd(), "notes");
    const oldFullPath = path.join(notesDir, oldPath);
    const newFullPath = path.join(notesDir, newPath);

    // Check if old file exists
    if (!fs.existsSync(oldFullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Check if new path already exists
    if (fs.existsSync(newFullPath)) {
      return NextResponse.json(
        { error: "File already exists" },
        { status: 409 }
      );
    }

    // Rename the file
    fs.renameSync(oldFullPath, newFullPath);

    return NextResponse.json({ message: "Note renamed successfully" });
  } catch (error) {
    console.error("Error renaming note:", error);
    return NextResponse.json(
      { error: "Failed to rename note" },
      { status: 500 }
    );
  }
}
