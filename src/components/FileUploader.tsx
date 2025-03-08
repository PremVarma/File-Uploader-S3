"use client";

import React, { useCallback, useRef, useState } from "react";
import { Upload, X, Link as LinkIcon, Settings } from "lucide-react";
import toast from "react-hot-toast";

const BASE_URL = "https://d11w9f5bh2eg3a.cloudfront.net/";

interface UploadingFile {
  file: File;
  progress: number;
  stage: "processing" | "uploading" | "completed" | "error";
  url?: string;
}

export const FileUploader: React.FC = () => {
  const [isDragging, setIsDragging] = useState(false);
  const [currentUpload, setCurrentUpload] = useState<UploadingFile | null>(
    null
  );
  const [processFiles, setProcessFiles] = useState(true);
  const [processingType] = useState<"ffmpeg" | "sharp">("ffmpeg");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(e.type === "dragenter" || e.type === "dragover");
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) await handleUpload(e.dataTransfer.files[0]);
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      await handleUpload(e.target.files[0]);
      // Reset the input so the same file can be selected again.
      e.target.value = "";
    }
  };

  const handleUpload = async (file: File) => {
    setCurrentUpload({ file, progress: 0, stage: "processing" });

    // Simulate processing stage (0-50%)
    const processingInterval = setInterval(() => {
      setCurrentUpload((prev) => {
        if (!prev) return prev;
        if (prev.progress < 50) {
          return { ...prev, progress: prev.progress + 3 };
        } else {
          clearInterval(processingInterval);
          return prev;
        }
      });
    }, 500);

    let response;
    try {
      response = await fetch("/api/upload", {
        method: "POST",
        body: (() => {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("process", processFiles.toString());
          formData.append("processor", processingType);
          return formData;
        })(),
      });
    } catch (err) {
      clearInterval(processingInterval);
      setCurrentUpload((prev) =>
        prev ? { ...prev, stage: "error", progress: 0 } : null
      );
      toast.error("Error connecting to server");
      return;
    }

    clearInterval(processingInterval);
    // Switch to uploading stage and set progress to 50%.
    setCurrentUpload((prev) =>
      prev ? { ...prev, stage: "uploading", progress: 50 } : prev
    );

    const uploadingInterval = setInterval(() => {
      setCurrentUpload((prev) => {
        if (!prev) return prev;
        if (prev.progress < 95) {
          return { ...prev, progress: prev.progress + 2 };
        } else {
          clearInterval(uploadingInterval);
          return prev;
        }
      });
    }, 500);

    if (!response.ok) {
      clearInterval(uploadingInterval);
      setCurrentUpload((prev) =>
        prev ? { ...prev, stage: "error", progress: 0 } : null
      );
      toast.error("Upload failed");
      return;
    }
    const data = await response.json();
    clearInterval(uploadingInterval);
    const finalUrl = `${BASE_URL}${data.fileName}`;
    setCurrentUpload((prev) =>
      prev
        ? { ...prev, stage: "completed", progress: 100, url: finalUrl }
        : null
    );
    toast.success("File uploaded successfully!");
    setTimeout(() => setCurrentUpload(null), 10000);
  };

  const getStageMessage = () => {
    if (!currentUpload) return "";
    switch (currentUpload.stage) {
      case "processing":
        return "Processing your video...";
      case "uploading":
        return "Uploading your video...";
      case "completed":
        return "Upload complete!";
      case "error":
        return "Upload failed.";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-600" />
          <span className="text-sm font-medium">Processing Options</span>
        </div>
        <label className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Enable Processing</span>
          <input
            type="checkbox"
            checked={processFiles}
            onChange={(e) => setProcessFiles(e.target.checked)}
            className="toggle toggle-sm"
          />
        </label>
      </div>

      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 bg-gray-50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          accept="image/*,video/*"
          onClick={(e) => e.stopPropagation()}
        />
        <div className="flex flex-col items-center gap-4 pointer-events-none">
          <Upload className="w-12 h-12 text-gray-400" />
          <div>
            <p className="font-medium text-gray-700">Drag files here</p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
            <p className="text-xs text-gray-400 mt-2">
              Supported formats: JPEG, PNG, MP4, MOV
            </p>
          </div>
        </div>
      </div>

      {currentUpload && (
        <div className="bg-white rounded-lg border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium truncate">
              {currentUpload.file.name}
            </span>
            {currentUpload.stage !== "completed" && (
              <button
                onClick={() => setCurrentUpload(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="relative pt-1">
            <div className="flex mb-2 items-center justify-between">
              <div className="text-xs text-gray-500">{getStageMessage()}</div>
              <div className="text-xs text-gray-500">
                {(currentUpload.file.size / 1024 / 1024).toFixed(1)} MB
              </div>
            </div>
            <div className="overflow-hidden h-2 bg-gray-200 rounded-full">
              <div
                className={`h-2 rounded-full transition-all duration-300 ${
                  currentUpload.stage === "error"
                    ? "bg-red-500"
                    : currentUpload.stage === "completed"
                    ? "bg-green-500"
                    : currentUpload.stage === "processing"
                    ? "bg-orange-500"
                    : "bg-blue-500"
                }`}
                style={{ width: `${currentUpload.progress}%` }}
              />
            </div>
          </div>

          {currentUpload.url && (
            <div className="mt-4 flex items-center gap-2">
              <input
                value={currentUpload.url}
                readOnly
                className="flex-1 text-sm p-2 border rounded bg-gray-50 truncate"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(currentUpload.url!);
                  toast.success("Copied to clipboard!");
                }}
                className="btn btn-sm btn-outline"
              >
                <LinkIcon className="w-4 h-4 mr-2" />
                Copy
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
