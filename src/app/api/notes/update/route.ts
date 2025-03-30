import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Define the path to the notes directory using resolve for consistency
const notesDir = path.resolve(process.cwd(), "notes");

// Function to sanitize and validate the file path relative to notesDir
function validateNotePath(relativePath: string): string {
  // Basic sanitization: remove potentially harmful characters but keep directory separators
  // This is less aggressive than the create route, assuming the path comes from our trusted tree view
  const cleanRelativePath = relativePath.replace(/[\*\?\"<>\|]/g, ""); // Allow / and \

  // Resolve the intended absolute path relative to notesDir
  const intendedPath = path.resolve(notesDir, cleanRelativePath);

  // Security Check: Ensure the resolved path is *within* or *is* the notesDir
  if (
    !intendedPath.startsWith(notesDir + path.sep) &&
    intendedPath !== notesDir
  ) {
    console.error(
      `Path traversal attempt detected: Relative='${relativePath}', Resolved='${intendedPath}', NotesDir='${notesDir}'`
    );
    throw new Error("Invalid file path: Path traversal attempt detected.");
  }

  // Further check to prevent accessing '.' or '..' directly if somehow constructed
  if (
    path.basename(cleanRelativePath) === "." ||
    path.basename(cleanRelativePath) === ".."
  ) {
    throw new Error("Invalid file path component.");
  }

  // Check if the path tries to escape via intermediate '..'
  if (path.normalize(cleanRelativePath).includes("..")) {
    throw new Error("Invalid file path component ('..') detected.");
  }

  // Return the resolved, validated absolute path
  return intendedPath;
}

export async function POST(request: Request) {
  try {
    // Add action to the expected body type, make it optional
    let body: {
      filename: unknown;
      content: unknown;
      action?: "append" | "overwrite";
    };
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Validate input types
    if (typeof body.filename !== "string" || body.filename.trim() === "") {
      return NextResponse.json(
        { error: "Filename must be a non-empty string" },
        { status: 400 }
      );
    }
    // Allow empty string content for overwriting/clearing a file
    if (typeof body.content !== "string") {
      return NextResponse.json(
        { error: "Content must be a string" },
        { status: 400 }
      );
    }

    // Determine action, default to overwrite
    const action = body.action === "append" ? "append" : "overwrite";

    // Validate the path - use the NEW function and assign to validatedFilePath
    let validatedFilePath: string;
    try {
      validatedFilePath = validateNotePath(body.filename); // Correct function call
    } catch (error: any) {
      console.error("Path validation failed:", error.message);
      return NextResponse.json(
        { error: error.message || "Invalid filename path" },
        { status: 400 }
      );
    }

    // Check if the target *directory* exists before writing.
    // writeFile will create the file, but not directories.
    const dirOfFile = path.dirname(validatedFilePath);
    try {
      await fs.access(dirOfFile);
    } catch (e: any) {
      // If the directory doesn't exist and it's within notesDir, maybe create it?
      // For now, we'll assume the directory structure comes from the file tree/creation.
      // If directory check fails (ENOENT), it implies an issue unless we create dirs.
      console.error(`Directory access error for '${dirOfFile}':`, e.code);
      if (e.code === "ENOENT") {
        if (action === "overwrite") {
          // Allow creating file in root notes dir even if it didn't exist before
          if (dirOfFile !== notesDir) {
            return NextResponse.json(
              { error: "Parent directory not found" },
              { status: 404 }
            );
          }
          // If it's the root, writeFile will create it.
        } else {
          // action === 'append'
          return NextResponse.json(
            { error: "Parent directory not found for append" },
            { status: 404 }
          );
        }
      }
      return NextResponse.json(
        { error: "Cannot access file path" },
        { status: 500 }
      );
    }

    // --- Perform action ---
    let successMessage = "";

    if (action === "append") {
      // For append, we MUST check if the file exists first
      try {
        const stats = await fs.stat(validatedFilePath);
        if (!stats.isFile()) {
          return NextResponse.json(
            { error: "Target path is not a file (cannot append)" },
            { status: 400 }
          );
        }
      } catch (e: any) {
        if (e.code === "ENOENT") {
          return NextResponse.json(
            { error: "File not found (cannot append)" },
            { status: 404 }
          );
        }
        console.error(
          `File access/stat error for APPEND '${validatedFilePath}':`,
          e.code
        );
        return NextResponse.json(
          { error: "File not found or inaccessible for append" },
          { status: 404 }
        );
      }

      // Append the content (add a newline before the new content)
      const contentToAppend = `\n${body.content}`;
      await fs.appendFile(validatedFilePath, contentToAppend, "utf-8");
      successMessage = "Content appended successfully";
    } else {
      // action === 'overwrite'
      // Write (overwrite) the file content
      await fs.writeFile(validatedFilePath, body.content, "utf-8"); // Use writeFile
      successMessage = "Note saved successfully (overwritten)";
    }

    return NextResponse.json({ message: successMessage });
  } catch (error: any) {
    console.error(
      `Error during ${body?.action || "save"} note operation:`,
      error
    );
    if (error.code === "EACCES") {
      return NextResponse.json({ error: "Permission denied" }, { status: 500 });
    }
    // ENOENT might still happen if the directory check fails unexpectedly
    if (error.code === "ENOENT") {
      return NextResponse.json(
        { error: "File or directory not found during write/append" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: `Failed to ${body?.action || "save"} note` },
      { status: 500 }
    );
  }
}
