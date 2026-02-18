"use client";

import { useEffect, useState, useRef } from "react";
import { useToast } from "@/components/ui/Toast";

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
    <div>
      <h2 className="font-serif text-2xl font-bold mb-6">Documents</h2>

      {/* Upload area */}
      <div className="rounded-lg border border-dashed border-foreground/20 p-8 mb-6 text-center">
        <p className="text-foreground/50 text-sm mb-3">
          Upload a PDF or text file to add to the knowledge base
        </p>
        <label
          className={`inline-block rounded-md bg-accent px-4 py-2 text-sm font-medium text-background hover:bg-accent/90 cursor-pointer ${
            uploading ? "opacity-50 pointer-events-none" : ""
          }`}
        >
          {uploading ? "Processing..." : "Choose File"}
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
          <p className="mt-3 text-sm text-accent animate-pulse">
            {uploadProgress}
          </p>
        )}
      </div>

      {/* Document list */}
      {loading ? (
        <p className="text-foreground/40 text-sm">Loading documents...</p>
      ) : documents.length === 0 ? (
        <p className="text-foreground/40 text-sm">
          No documents uploaded yet. Upload your first document above.
        </p>
      ) : (
        <div className="rounded-lg border border-foreground/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-foreground/10 text-foreground/50 text-left">
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
                  className="border-b border-foreground/5 last:border-0"
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
                      className="text-red-400/70 hover:text-red-400 text-xs"
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
