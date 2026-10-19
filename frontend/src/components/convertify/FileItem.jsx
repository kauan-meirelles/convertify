import { useEffect, useMemo, useState } from "react";
import { Download, Play, Square, X, RotateCcw, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FORMAT_COLORS, downloadUrl, extOf, formatSize } from "@/lib/api";

const STATUS = {
  pending: { label: "Pendente", cls: "text-muted-foreground" },
  uploading: { label: "Enviando", cls: "text-accent" },
  converting: { label: "Convertendo", cls: "text-primary" },
  done: { label: "Concluído", cls: "text-emerald-500" },
  error: { label: "Erro", cls: "text-destructive" },
};

const FormatBadge = ({ ext }) => (
  <span className={`rounded-md border px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase ${FORMAT_COLORS[ext] || "border-border text-muted-foreground"}`}>
    {ext || "?"}
  </span>
);

const StatusLabel = ({ st, item, active, className, testid }) => (
  <span className={`items-center gap-1 font-mono text-[11px] uppercase tracking-wider ${st.cls} ${className}`} data-testid={testid}>
    {active && <Loader2 className="h-3 w-3 animate-spin" />}
    {item.status === "done" && <CheckCircle2 className="h-3 w-3" />}
    {item.status === "error" && <AlertCircle className="h-3 w-3" />}
    {st.label}{active && ` ${Math.round(item.progress)}%`}
  </span>
);

export const FileItem = ({ item, index, onRemove, onRetry, busy }) => {
  const [preview, setPreview] = useState(false);
  const ext = extOf(item.file.name);
  const st = STATUS[item.status];
  const active = item.status === "uploading" || item.status === "converting";
  const src = useMemo(
    () => (preview ? (item.status === "done" ? downloadUrl(item.jobId) : URL.createObjectURL(item.file)) : null),
    [preview, item.status, item.jobId, item.file]
  );
  useEffect(() => () => src?.startsWith("blob:") && URL.revokeObjectURL(src), [src]);

  return (
    <li data-testid={`file-item-${index}`} className="rise rounded-xl border border-border/60 bg-card p-4 transition-colors hover:border-border">
      <div className="flex items-center gap-3">
        <FormatBadge ext={ext} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={item.file.name} data-testid={`file-item-name-${index}`}>{item.file.name}</p>
          <StatusLabel st={st} item={item} active={active} className="mt-0.5 flex sm:hidden" testid={`file-item-status-mobile-${index}`} />
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
            {formatSize(item.file.size)}
            {item.status === "done" && (
              <><ArrowRight className="h-3 w-3" /><FormatBadge ext={item.format} /> {formatSize(item.sizeOut)}</>
            )}
          </p>
        </div>
        <StatusLabel st={st} item={item} active={active} className="hidden sm:flex" testid={`file-item-status-${index}`} />
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setPreview((p) => !p)} data-testid={`file-item-preview-button-${index}`} aria-label="Ouvir prévia">
            {preview ? <Square className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
          {item.status === "done" && (
            <Button asChild size="icon" className="h-8 w-8" data-testid={`file-item-download-button-${index}`}>
              <a href={downloadUrl(item.jobId)} aria-label="Baixar"><Download className="h-4 w-4" /></a>
            </Button>
          )}
          {item.status === "error" && (
            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onRetry} disabled={busy} data-testid={`file-item-retry-button-${index}`} aria-label="Tentar novamente">
              <RotateCcw className="h-4 w-4" />
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={onRemove} disabled={active} data-testid={`file-item-remove-button-${index}`} aria-label="Remover">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {(active || item.status === "done") && (
        <Progress value={item.progress} className="mt-3 h-1.5" data-testid={`file-item-progress-${index}`} />
      )}
      {item.status === "error" && <p className="mt-2 text-xs text-destructive" data-testid={`file-item-error-${index}`}>{item.error}</p>}
      {preview && <audio src={src} controls autoPlay className="mt-3 h-9 w-full" data-testid={`file-item-audio-${index}`} />}
    </li>
  );
};
