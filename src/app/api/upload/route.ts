import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import ffmpeg from "fluent-ffmpeg";
import { storage } from "@/lib/storage";
import { S3StorageProvider } from "@/lib/storage/s3-provider";

export async function POST(request: NextRequest) {
  // Define the temporary folder and subdirectories.
  const tmpDir = path.join(process.cwd(), "tmp");
  const inputDir = path.join(tmpDir, "input");
  const outputDir = path.join(tmpDir, "output");

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const processFile = formData.get("process") === "true";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Ensure temporary directories exist.
    await fs.mkdir(inputDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });

    // Define paths for the input and (if processing) output files.
    const inputPath = path.join(inputDir, file.name);
    const outputFileName = `processed-${file.name}`;
    const outputPath = path.join(outputDir, outputFileName);

    // Save the uploaded file to disk.
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(inputPath, buffer);

    let finalBuffer: Buffer;

    if (file.type.startsWith("video/") && processFile) {
      // Process the video using FFmpeg.
      await new Promise((resolve, reject) => {
        ffmpeg(inputPath)
          .videoFilter("scale=720:-2")
          .videoCodec("libx264")
          .addOption("-profile:v", "baseline")
          .addOption("-level", "3.1")
          .addOption("-preset", "slow")
          .addOption("-crf", "30")
          .addOption("-movflags", "faststart")
          .audioCodec("aac")
          .audioBitrate("128k")
          .on("end", resolve)
          .on("error", reject)
          .save(outputPath);
      });
      finalBuffer = await fs.readFile(outputPath);
    } else {
      // If not processing, use the original file.
      finalBuffer = await fs.readFile(inputPath);
    }

    // Upload the (processed or original) file to S3.
    // We use uploadUint8Array to send the data in memory.
    const key = await new S3StorageProvider().uploadUint8Array(
      new Uint8Array(finalBuffer),
      file.name,
      file.type
    );

    // Clean up: delete the entire temporary folder.
    await fs.rm(tmpDir, { recursive: true, force: true });

    return NextResponse.json({ success: true, fileName: key });
  } catch (error) {
    console.error("Upload error:", error);
    // Attempt to clean up tmp directory even on error.
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Error cleaning tmp directory:", cleanupError);
    }
    return NextResponse.json(
      { error: "Failed to process upload" },
      { status: 500 }
    );
  }
}
