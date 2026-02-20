"use client";

import { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageLoader } from "@/components/PageLoader";

interface Document {
  id: string;
  title: string;
  source: string;
  chunk_count: number;
  created_at: string;
}

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadDocuments();
  }, []);

  async function loadDocuments() {
    const res = await fetch("/api/documents");
    if (res.ok) {
      const data = await res.json();
      setDocuments(data);
    }
    setLoading(false);
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadProgress(`Processing "${file.name}"...`);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        showToast(
          `"${data.title}" uploaded — ${data.chunk_count} chunks created`,
          "success"
        );
        await loadDocuments();
      } else {
        const err = await res.json();
        showToast(`Upload failed: ${err.error}`, "error");
      }
    } catch {
      showToast("Upload failed. Please try again.", "error");
    }

    setUploading(false);
    setUploadProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Delete "${title}" and all its chunks?`)) return;

    const res = await fetch("/api/documents", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      showToast(`"${title}" deleted`, "success");
      await loadDocuments();
    } else {
      showToast("Failed to delete document", "error");
    }
  }

  return (
    <div className="animate-fade-in-up">
      <h2 className="font-serif text-2xl font-bold mb-6">Documents</h2>

      {/* Upload area */}
      <div className="rounded-lg border border-dashed border-ui bg-ui-1 p-8 mb-6 text-center transition-all duration-300 hover-border-ui-strong hover-bg-ui-2">
        <p className="text-foreground/50 text-sm mb-4">
          Upload a PDF or text file to add to the knowledge base
        </p>
        <label
          className={`group inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/85 hover:shadow-[0_0_14px_rgba(255,255,255,0.15)] cursor-pointer ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:-translate-y-0.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              Choose File
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.txt,.md"
            onChange={handleUpload}
            disabled={uploading}
            className="hidden"
          />
        </label>
        {uploadProgress && (
          <p className="mt-3 text-sm text-foreground/50 animate-pulse">
            {uploadProgress}
          </p>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <PageLoader label="Loading documents" />
      ) : documents.length === 0 ? (
        <p className="text-foreground/40 text-sm">
          No documents uploaded yet. Upload your first document above.
        </p>
      ) : (
        <div className="rounded-lg border border-ui bg-ui-1 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ui text-foreground/40 text-left">
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">File</th>
                <th className="px-4 py-3 font-medium">Chunks</th>
                <th className="px-4 py-3 font-medium hidden sm:table-cell">Uploaded</th>
                <th className="px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-ui last:border-0 transition-colors duration-200 ui-row-hover"
                >
                  <td className="px-4 py-3">{doc.title}</td>
                  <td className="px-4 py-3 text-foreground/50 hidden sm:table-cell">
                    {doc.source}
                  </td>
                  <td className="px-4 py-3 text-foreground/50">
                    {doc.chunk_count}
                  </td>
                  <td className="px-4 py-3 text-foreground/50 hidden sm:table-cell">
                    {new Date(doc.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(doc.id, doc.title)}
                      className="text-red-400/60 text-xs transition-all duration-200 hover:text-red-400 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
