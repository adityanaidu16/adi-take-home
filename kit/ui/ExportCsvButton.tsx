"use client";

import { Button, MessageBar, MessageBarBody } from "@fluentui/react-components";
import { DocumentTableRegular } from "@fluentui/react-icons";
import { useState } from "react";
import type { ExportResult } from "@/app/apps/[slug]/actions";

export function ExportCsvButton({ exportCsv }: { exportCsv: () => Promise<ExportResult> }) {
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    setExporting(true);
    try {
      const result = await exportCsv();
      setError(result.ok ? null : result.message);
      if (result.ok && result.csv) {
        const url = URL.createObjectURL(new Blob([result.csv], { type: "text/csv" }));
        const link = document.createElement("a");
        link.href = url;
        link.download = result.filename ?? "export.csv";
        link.click();
        URL.revokeObjectURL(url);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 8, justifyItems: "start", marginBottom: 12 }}>
      <Button icon={<DocumentTableRegular />} disabled={exporting} onClick={download}>
        {exporting ? "Exporting…" : "Export CSV"}
      </Button>
      {error ? (
        <MessageBar intent="error">
          <MessageBarBody>{error}</MessageBarBody>
        </MessageBar>
      ) : null}
    </div>
  );
}
