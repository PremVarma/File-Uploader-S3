import React from "react";
import { FileUploader } from "./components/FileUploader";
import { Toaster } from "react-hot-toast";
import { HardDrive } from "lucide-react";

function App() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Toaster position="top-right" />
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <HardDrive className="w-12 h-12 text-blue-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">File Uploader</h1>
          <p className="mt-2 text-gray-600">
            Upload your files and get shareable links instantly
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <FileUploader />
        </div>
      </div>
    </div>
  );
}

export default App;
