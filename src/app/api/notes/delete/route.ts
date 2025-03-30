import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function POST(request: Request) {
  try {
    const { path: notePath } = await request.json();

    // Validate path
    if (!notePath) {
      return NextResponse.json({ error: "Path is required" }, { status: 400 });
    }

    // Ensure path is within the notes directory
    const notesDir = path.join(process.cwd(), "notes");
    const fullPath = path.join(notesDir, notePath);

    // Check if file exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Delete the file
    fs.unlinkSync(fullPath);

    return NextResponse.json({ message: "Note deleted successfully" });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
