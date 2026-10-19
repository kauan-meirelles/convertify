import { useRef, useState } from "react";
import { UploadCloud, Plus } from "lucide-react";
import { ACCEPT } from "@/lib/api";

export const Dropzone = ({ onFiles, compact }) => {
  const [drag, setDrag] = useState(false);
  const input = useRef(null);

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    onFiles(e.dataTransfer.files);
  };

  return (
    <div
      data-testid="audio-dropzone"
      role="button"
      tabIndex={0}
      onClick={() => input.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
      className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-[border-color,background-color,transform] duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        drag ? "scale-[1.01] border-primary bg-primary/10" : "border-border/70 bg-card/60 hover:border-primary/60"
      } ${compact ? "px-6 py-5" : "px-6 py-14 md:py-20"}`}
    >
      <input
        ref={input}
        type="file"
        multiple
        accept={ACCEPT}
        className="hidden"
        data-testid="file-upload-input"
        onChange={(e) => { onFiles(e.target.files); e.target.value = ""; }}
      />
      {compact ? (
        <div className="flex items-center gap-3 text-sm">
          <Plus className="h-5 w-5 text-primary" />
          <span className="font-medium">Adicionar mais arquivos</span>
          <span className="text-muted-foreground">ou arraste aqui</span>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center md:gap-8">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary transition-transform duration-300 group-hover:-translate-y-1">
            <UploadCloud className="h-8 w-8" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Arraste seus arquivos aqui</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              ou clique para selecionar · vários arquivos de uma vez · até 200 MB cada
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground/80">
              mp3 · wav · m4a · ogg · flac · aac · wma · opus · aiff
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
