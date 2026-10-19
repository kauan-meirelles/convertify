import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileItem } from "./FileItem";

export const FileQueue = ({ items, onRemove, onRetry, onClear, running }) => {
  if (!items.length) return null;
  const done = items.filter((i) => i.status === "done").length;
  return (
    <section data-testid="file-queue">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Fila de arquivos{" "}
          <span className="font-mono text-sm font-normal text-muted-foreground" data-testid="queue-count">
            {done}/{items.length}
          </span>
        </h3>
        <Button variant="ghost" size="sm" onClick={onClear} disabled={running} data-testid="clear-queue-button" className="text-muted-foreground">
          <Trash2 className="mr-1.5 h-4 w-4" /> Limpar
        </Button>
      </div>
      <ul className="space-y-2.5">
        {items.map((it, i) => (
          <FileItem key={it.id} item={it} index={i} busy={running} onRemove={() => onRemove(it.id)} onRetry={() => onRetry(it)} />
        ))}
      </ul>
    </section>
  );
};
