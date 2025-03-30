import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// Recursive function to delete a directory and its contents
function deleteFolderRecursive(folderPath: string) {
  if (fs.existsSync(folderPath)) {
    fs.readdirSync(folderPath).forEach((file) => {
      const curPath = path.join(folderPath, file);
      if (fs.lstatSync(curPath).isDirectory()) {
        // Recursive call for directories
        deleteFolderRecursive(curPath);
      } else {
        // Delete file
        fs.unlinkSync(curPath);
      }
    });
    // Delete the empty directory
    fs.rmdirSync(folderPath);
  }
}

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

    console.log(`Attempting to delete: ${fullPath}`);

    // Check if path exists
    if (!fs.existsSync(fullPath)) {
      return NextResponse.json({ error: "Path not found" }, { status: 404 });
    }

    // Check if it's a file or directory
    const stats = fs.statSync(fullPath);

    // Prevent deletion of protected system folders
    // This is optional but adds a safety layer
    const protectedPaths = [
      notesDir, // The root notes directory itself
      // Add other protected paths if needed
    ];

    if (protectedPaths.includes(fullPath)) {
      return NextResponse.json(
        {
          error: "Cannot delete protected system folder",
        },
        { status: 403 }
      );
    }

    if (stats.isDirectory()) {
      console.log(`Deleting directory: ${fullPath}`);
      // Delete directory and all its contents
      deleteFolderRecursive(fullPath);
      return NextResponse.json({ message: "Folder deleted successfully" });
    } else {
      console.log(`Deleting file: ${fullPath}`);
      // Delete the file
      fs.unlinkSync(fullPath);
      return NextResponse.json({ message: "Note deleted successfully" });
    }
  } catch (error) {
    console.error("Error deleting:", error);
    return NextResponse.json(
      {
        error:
          "Failed to delete. " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
