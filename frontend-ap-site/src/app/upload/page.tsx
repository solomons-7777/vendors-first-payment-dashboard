"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { PageShell } from "@/components/layout/PageShell";
import { FileDropzone } from "@/components/upload/FileDropzone";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { useRequireAuth } from "@/lib/use-require-auth";
import { uploadWorkbook, ApiError } from "@/lib/api";
import { saveWorkbook } from "@/lib/workbook-store";

export default function UploadPage() {
  const router = useRouter();
  const { ready } = useRequireAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!ready) return null;

  async function handleUpload() {
    if (!file) return;
    setIsUploading(true);
    setError(null);
    try {
      const workbook = await uploadWorkbook(file);
      saveWorkbook(workbook, file.name);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <PageShell>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Upload dataset</h1>
          <p className="mt-1 text-sm text-text-secondary">
            Upload the Invoice_Late_Payment_Analysis workbook to run it through the
            risk model and populate the dashboard.
          </p>
        </div>

        <Card>
          <CardBody className="flex flex-col gap-4">
            <FileDropzone
              onFileSelected={(f) => {
                setFile(f);
                setError(null);
              }}
              selectedFile={file}
              disabled={isUploading}
            />

            {error && (
              <div className="flex items-start gap-2 rounded-md bg-status-critical-soft px-3 py-2.5 text-sm text-status-critical">
                <TriangleAlert size={16} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="w-full"
            >
              {isUploading && <Loader2 size={15} className="animate-spin" />}
              {isUploading ? "Running analytics engine…" : "Run analysis"}
            </Button>
          </CardBody>
        </Card>
      </div>
    </PageShell>
  );
}
