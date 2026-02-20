"use client";

import { useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/Toast";
import { PageLoader } from "@/components/PageLoader";

type ImageMode = "standard" | "image";

interface UIImage {
  id: string;
  type: "background" | "sidebar";
  file_path: string;
  is_active: boolean;
  uploaded_at: string;
  url: string;
}

interface Settings {
  background_mode: ImageMode;
  sidebar_mode: ImageMode;
}

export default function ImagesPage() {
  const [images, setImages] = useState<UIImage[]>([]);
  const [settings, setSettings] = useState<Settings>({
    background_mode: "standard",
    sidebar_mode: "standard",
  });
  // Pending local state (before Save)
  const [bgMode, setBgMode] = useState<ImageMode>("standard");
  const [sidebarMode, setSidebarMode] = useState<ImageMode>("standard");
  const [activeBgId, setActiveBgId] = useState<string | null>(null);
  const [activeSidebarId, setActiveSidebarId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [uploadingSidebar, setUploadingSidebar] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const bgInputRef = useRef<HTMLInputElement>(null);
  const sidebarInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const res = await fetch("/api/admin/images");
    if (res.ok) {
      const data = await res.json();
      setImages(data.images);
      setSettings(data.settings);
      setBgMode(data.settings.background_mode);
      setSidebarMode(data.settings.sidebar_mode);

      const activeBg = data.images.find(
        (i: UIImage) => i.type === "background" && i.is_active
      );
      const activeSb = data.images.find(
        (i: UIImage) => i.type === "sidebar" && i.is_active
      );
      setActiveBgId(activeBg?.id ?? null);
      setActiveSidebarId(activeSb?.id ?? null);
    }
    setLoading(false);
  }

  async function handleUpload(
    type: "background" | "sidebar",
    file: File
  ) {
    const setUploading = type === "background" ? setUploadingBg : setUploadingSidebar;
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);

    const res = await fetch("/api/admin/images?action=upload", {
      method: "POST",
      body: formData,
    });

    if (res.ok) {
      const { id, url } = await res.json();
      const newImg: UIImage = {
        id,
        type,
        file_path: "",
        is_active: false,
        uploaded_at: new Date().toISOString(),
        url,
      };
      setImages((prev) => [newImg, ...prev]);
      // Auto-select the newly uploaded image
      if (type === "background") {
        setActiveBgId(id);
        setBgMode("image");
      } else {
        setActiveSidebarId(id);
        setSidebarMode("image");
      }
      showToast("Image uploaded", "success");
    } else {
      const err = await res.json().catch(() => ({ error: "Upload failed" }));
      const msg = err.error || "Upload failed";
      console.error("Upload error:", msg, "status:", res.status);
      showToast(msg, "error");
    }

    setUploading(false);
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/admin/images?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setImages((prev) => prev.filter((i) => i.id !== id));
      if (activeBgId === id) setActiveBgId(null);
      if (activeSidebarId === id) setActiveSidebarId(null);
    } else {
      showToast("Failed to delete image", "error");
    }
    setDeletingId(null);
  }

  async function handleSave() {
    setSaving(true);
    try {
      // 1. Save modes
      await fetch("/api/admin/images?action=set-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          background_mode: bgMode,
          sidebar_mode: sidebarMode,
        }),
      });

      // 2. Activate selected images (only if mode is 'image')
      if (bgMode === "image" && activeBgId) {
        await fetch("/api/admin/images?action=activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeBgId }),
        });
      }
      if (sidebarMode === "image" && activeSidebarId) {
        await fetch("/api/admin/images?action=activate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: activeSidebarId }),
        });
      }

      // Refresh server state
      setSettings({ background_mode: bgMode, sidebar_mode: sidebarMode });
      showToast("Settings saved", "success");
    } catch {
      showToast("Failed to save settings", "error");
    }
    setSaving(false);
  }

  function FileUploadArea({
    type,
    uploading,
    inputRef,
  }: {
    type: "background" | "sidebar";
    uploading: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
  }) {
    return (
      <div>
        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(type, file);
            e.target.value = "";
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full rounded-lg border-2 border-dashed border-foreground/20 py-6 text-center text-sm text-foreground/40 transition-colors hover:border-accent/50 hover:text-foreground/60 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {uploading ? (
            <span className="inline-flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Uploading...
            </span>
          ) : (
            <>
              <span className="block text-2xl mb-1">↑</span>
              Click to upload · jpg, png, webp · max 5 MB
            </>
          )}
        </button>
      </div>
    );
  }

  function ImageGrid({
    type,
    activeId,
    onSelect,
  }: {
    type: "background" | "sidebar";
    activeId: string | null;
    onSelect: (id: string) => void;
  }) {
    const typeImages = images.filter((i) => i.type === type);
    if (typeImages.length === 0) return null;

    return (
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 mt-3">
        {typeImages.map((img) => {
          const isSelected = img.id === activeId;
          const isDeleting = deletingId === img.id;
          return (
            <div key={img.id} className="relative group">
              <button
                onClick={() => onSelect(img.id)}
                className={`w-full aspect-video rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                  isSelected
                    ? "border-accent shadow-[0_0_12px_rgba(212,160,23,0.4)]"
                    : "border-foreground/10 hover:border-foreground/30"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover"
                />
              </button>
              {isSelected && (
                <div className="absolute top-1 left-1 bg-accent text-background text-[10px] font-bold px-1 rounded">
                  ✓
                </div>
              )}
              <button
                onClick={() => handleDelete(img.id)}
                disabled={isDeleting}
                className="absolute top-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[10px] text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
              >
                {isDeleting ? "…" : "✕"}
              </button>
            </div>
          );
        })}
      </div>
    );
  }

  const hasUnsavedChanges =
    bgMode !== settings.background_mode ||
    sidebarMode !== settings.sidebar_mode;

  if (loading) {
    return <PageLoader label="Loading customization" />;
  }

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl font-bold">UI Customization</h2>
          {hasUnsavedChanges && (
            <p className="text-xs text-accent/80 mt-0.5">Unsaved changes</p>
          )}
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="group rounded-md bg-accent px-4 py-2 text-sm font-medium text-background transition-all duration-300 hover:bg-accent/85 hover:shadow-[0_0_14px_rgba(255,255,255,0.15)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span className="inline-flex items-center gap-1.5">
            {saving ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </>
            ) : (
              "Save Changes"
            )}
          </span>
        </button>
      </div>

      <div className="space-y-8">
        {/* ── Background ──────────────────────────────────────────────── */}
        <section className="rounded-lg border border-foreground/10 p-6">
          <h3 className="font-semibold text-base mb-4">Background Image</h3>

          <div className="space-y-3 mb-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="bg_mode"
                value="standard"
                checked={bgMode === "standard"}
                onChange={() => setBgMode("standard")}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium">Standard theme</span>
                <p className="text-xs text-foreground/40">
                  Follows the dark / light mode toggle
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="bg_mode"
                value="image"
                checked={bgMode === "image"}
                onChange={() => setBgMode("image")}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium">Custom image</span>
                <p className="text-xs text-foreground/40">
                  Fill the chat area with a background photo
                </p>
              </div>
            </label>
          </div>

          {bgMode === "image" && (
            <div>
              <FileUploadArea
                type="background"
                uploading={uploadingBg}
                inputRef={bgInputRef}
              />
              <ImageGrid
                type="background"
                activeId={activeBgId}
                onSelect={(id) => setActiveBgId(id)}
              />
              {images.filter((i) => i.type === "background").length > 0 &&
                !activeBgId && (
                  <p className="text-xs text-amber-500 mt-2">
                    Select an image above to use as background
                  </p>
                )}
            </div>
          )}
        </section>

        {/* ── Sidebar Logo ─────────────────────────────────────────────── */}
        <section className="rounded-lg border border-foreground/10 p-6">
          <h3 className="font-semibold text-base mb-4">Sidebar Logo</h3>

          <div className="space-y-3 mb-5">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="sidebar_mode"
                value="standard"
                checked={sidebarMode === "standard"}
                onChange={() => setSidebarMode("standard")}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium">Standard logo</span>
                <p className="text-xs text-foreground/40">
                  Shows the &quot;Socratic.sg&quot; gradient text
                </p>
              </div>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="radio"
                name="sidebar_mode"
                value="image"
                checked={sidebarMode === "image"}
                onChange={() => setSidebarMode("image")}
                className="accent-accent"
              />
              <div>
                <span className="text-sm font-medium">Custom image</span>
                <p className="text-xs text-foreground/40">
                  Replace the logo with an uploaded image (max height 80 px)
                </p>
              </div>
            </label>
          </div>

          {sidebarMode === "image" && (
            <div>
              <FileUploadArea
                type="sidebar"
                uploading={uploadingSidebar}
                inputRef={sidebarInputRef}
              />
              <ImageGrid
                type="sidebar"
                activeId={activeSidebarId}
                onSelect={(id) => setActiveSidebarId(id)}
              />
              {images.filter((i) => i.type === "sidebar").length > 0 &&
                !activeSidebarId && (
                  <p className="text-xs text-amber-500 mt-2">
                    Select an image above to use as logo
                  </p>
                )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
