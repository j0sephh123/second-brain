import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define the path to the notes directory
const notesDir = path.join(process.cwd(), "notes");

// Function to sanitize filename
function sanitizeFilename(filename: string): string {
  // Remove potentially harmful characters and path components
  let sanitized = filename.replace(/[\/\\:\*\?\"<>\|]/g, "");
  // Remove leading/trailing dots or spaces
  sanitized = sanitized
    .trim()
    .replace(/^\.+|\.+$/g, "")
    .trim();
  // Ensure it ends with .md
  if (!sanitized.endsWith(".md")) {
    sanitized += ".md";
  }
  // Ensure it's not empty after sanitization
  if (!sanitized || sanitized === ".md") {
    throw new Error("Invalid or empty filename after sanitization");
  }
  return sanitized;
}

export async function POST(request: Request) {
  try {
    // Ensure the notes directory exists
    await fs.mkdir(notesDir, { recursive: true });

    // Parse the request body
    let body: { filename: unknown };
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate filename type
    if (typeof body.filename !== "string" || body.filename.trim() === "") {
      return NextResponse.json(
        { error: "Filename must be a non-empty string" },
        { status: 400 }
      );
    }

    // Sanitize the filename
    let sanitizedFilename: string;
    try {
      sanitizedFilename = sanitizeFilename(body.filename);
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || "Invalid filename" },
        { status: 400 }
      );
    }

    // Construct the full path
    const filePath = path.join(notesDir, sanitizedFilename);

    // Check if file already exists (optional, writeFile with 'wx' flag handles this)
    // try {
    //   await fs.access(filePath)
    //   return NextResponse.json({ error: 'File already exists' }, { status: 409 })
    // } catch {
    //   // File doesn't exist, proceed
    // }

    // Create the file with empty content
    // Using the 'wx' flag ensures writeFile fails if the file already exists.
    await fs.writeFile(filePath, "", { flag: "wx" });

    // Return success response
    return NextResponse.json(
      { message: "Note created successfully", filename: sanitizedFilename },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating note:", error);

    // Handle specific error codes
    if (error.code === "EEXIST") {
      return NextResponse.json(
        { error: "File already exists" },
        { status: 409 }
      );
    }
    if (error.code === "ENOENT") {
      // This might happen if process.cwd() is weird, but mkdir should handle it
      return NextResponse.json(
        { error: "Parent directory issue" },
        { status: 500 }
      );
    }
    if (error.code === "EACCES") {
      return NextResponse.json({ error: "Permission denied" }, { status: 500 });
    }

    // Generic internal server error
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
