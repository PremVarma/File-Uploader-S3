import React, { useCallback, useState } from "react";
import { Upload, X, Link as LinkIcon } from "lucide-react";
import { storage } from "../lib/storage";
import toast from "react-hot-toast";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "completed" | "error";
  url?: string;
}

export const FileUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<UploadingFile | null>(
    null
  );

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      await handleUpload(files[0]); // Only handle the first file
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      await handleUpload(files[0]); // Only handle the first file
    }
  };

  const updateProgress = (
    progress: number,
    status: UploadingFile["status"],
    url?: string
  ) => {
    setCurrentUpload((prev) =>
      prev ? { ...prev, progress, status, url } : null
    );
  };

  const clearUpload = () => {
    setCurrentUpload(null);
  };

  const handleCopyLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const handleUpload = async (file: File) => {
    // Initialize upload state
    setCurrentUpload({
      file,
      progress: 0,
      status: "uploading",
    });

    try {
      // Start progress simulation
      const progressInterval = setInterval(() => {
        setCurrentUpload((prev) => {
          if (prev && prev.status === "uploading" && prev.progress < 90) {
            return { ...prev, progress: Math.min(90, prev.progress + 10) };
          }
          return prev;
        });
      }, 500);

      // Perform actual upload
      const key = await storage.uploadFile(file);

      // Get the file URL
      const url = await storage.getSignedUrl(key);

      // Clear interval and mark as complete
      clearInterval(progressInterval);
      updateProgress(100, "completed", url);

      // Clear upload after delay if successful
      setTimeout(clearUpload, 5000);

      toast.success("File uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      updateProgress(0, "error");
      toast.error("Failed to upload file");
    }
  };

  return (
    <div className="space-y-4">
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center ${
          isDragging ? "border-blue-500 bg-blue-50" : "border-gray-300"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        />
        <div className="flex flex-col items-center">
          <Upload className="w-12 h-12 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-700">
            Drag and drop your file here
          </p>
          <p className="text-sm text-gray-500 mt-2">
            or click to select a file
          </p>
        </div>
      </div>

      {/* Current Upload Progress */}
      {currentUpload && (
        <div className="bg-white rounded-lg border p-3">
          <div className="flex-1">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-gray-900">
                {currentUpload.file.name}
              </span>
              {currentUpload.status === "uploading" && (
                <button
                  onClick={clearUpload}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  currentUpload.status === "error"
                    ? "bg-red-500"
                    : currentUpload.status === "completed"
                    ? "bg-green-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${currentUpload.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-1">
              <span className="text-xs text-gray-500">
                {currentUpload.status === "error"
                  ? "Upload failed"
                  : currentUpload.status === "completed"
                  ? "Upload complete"
                  : `${currentUpload.progress}%`}
              </span>
              <span className="text-xs text-gray-500">
                {(currentUpload.file.size / 1024 / 1024).toFixed(2)} MB
              </span>
            </div>

            {/* Show copy link button when upload is complete */}
            {currentUpload.status === "completed" && currentUpload.url && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-sm text-gray-500 truncate flex-1 mr-4">
                  {currentUpload.url}
                </span>
                <button
                  onClick={() => handleCopyLink(currentUpload.url!)}
                  className="flex items-center text-blue-500 hover:text-blue-600 text-sm"
                >
                  <LinkIcon className="w-4 h-4 mr-1" />
                  Copy Link
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
