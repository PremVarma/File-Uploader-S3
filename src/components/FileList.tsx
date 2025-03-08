'use client';

import React, { useEffect, useState } from 'react';
import { Download, Link, Trash2, AlertCircle } from 'lucide-react';
import { storage } from '../lib/storage';
import { StorageFile } from '../lib/storage/types';
import toast from 'react-hot-toast';

export const FileList: React.FC = () => {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadFiles = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await storage.listFiles();
      setFiles(data);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load files';
      setError(message);
      console.error('Error loading files:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
    const handleFileUploaded = () => loadFiles();
    window.addEventListener('filesuploaded', handleFileUploaded);
    return () => window.removeEventListener('filesuploaded', handleFileUploaded);
  }, []);

  const handleDelete = async (key: string) => {
    try {
      await storage.deleteFile(key);
      toast.success('File deleted successfully');
      loadFiles();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete file';
      toast.error(message);
      console.error('Delete error:', error);
    }
  };

  const handleDownload = async (key: string) => {
    try {
      const url = await storage.getSignedUrl(key);
      window.open(url, '_blank');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate download link';
      toast.error(message);
      console.error('Download error:', error);
    }
  };

  const handleCopyLink = async (key: string) => {
    try {
      const url = await storage.getSignedUrl(key);
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to copy link';
      toast.error(message);
      console.error('Copy link error:', error);
    }
  };

  if (error) {
    return (
      <div className="mt-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Configuration Error</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-8">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <h2 className="text-xl font-semibold mb-4">Uploaded Files</h2>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {files.length === 0 ? (
          <p className="text-center py-8 text-gray-500">No files uploaded yet</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {files.map((file) => (
              <li
                key={file.key}
                className="p-4 flex items-center justify-between hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {file.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {file.lastModified.toLocaleDateString()}
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleCopyLink(file.key)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Link className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDownload(file.key)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(file.key)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};