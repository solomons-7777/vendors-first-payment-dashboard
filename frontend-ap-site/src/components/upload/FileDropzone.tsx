"use client";

import { useRef, useState } from "react";
import clsx from "clsx";
import { FileSpreadsheet, UploadCloud } from "lucide-react";

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  selectedFile: File | null;
  disabled?: boolean;
}

export function FileDropzone({
  onFileSelected,
  selectedFile,
  disabled,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={disabled}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          inputRef.current?.click();
        }
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={clsx(
        "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-12 text-center transition-colors",
        disabled && "cursor-not-allowed opacity-60",
        isDragging
          ? "border-brand bg-brand-soft"
          : "border-border-strong bg-surface-sunken hover:border-brand"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        disabled={disabled}
        onChange={(e) => handleFiles(e.target.files)}
      />
      {selectedFile ? (
        <>
          <FileSpreadsheet size={32} className="text-brand" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-text-primary">
            {selectedFile.name}
          </p>
          <p className="mt-1 text-xs text-text-muted">
            {(selectedFile.size / 1024).toFixed(0)} KB · click to choose a different file
          </p>
        </>
      ) : (
        <>
          <UploadCloud size={32} className="text-text-muted" strokeWidth={1.5} />
          <p className="mt-3 text-sm font-medium text-text-primary">
            Drag and drop your workbook here
          </p>
          <p className="mt-1 text-xs text-text-muted">
            or click to browse — .xlsx only
          </p>
        </>
      )}
    </div>
  );
}
