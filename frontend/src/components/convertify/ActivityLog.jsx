import { useEffect, useRef, useState } from "react";
import { ChevronDown, Terminal } from "lucide-react";

export const ActivityLog = ({ logs, onClear }) => {
  const [open, setOpen] = useState(true);
  const box = useRef(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [logs, open]);

  return (
    <div className="overflow-hidden rounded-2xl border border-emerald-500/20 bg-slate-950">
      <div className="flex items-center justify-between px-4 py-2.5">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-emerald-400" data-testid="activity-log-toggle">
          <Terminal className="h-3.5 w-3.5" /> Log de atividade
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        <button onClick={onClear} className="font-mono text-[10px] uppercase tracking-wider text-slate-500 hover:text-slate-300" data-testid="activity-log-clear">
          limpar
        </button>
      </div>
      {open && (
        <div ref={box} className="max-h-56 overflow-y-auto border-t border-emerald-500/10 px-4 py-3 font-mono text-[11px] leading-relaxed text-emerald-400" data-testid="activity-log">
          {logs.map((l, i) => (
            <div key={i} className="break-words"><span className="text-slate-500">{l.t}</span> <span className="text-slate-600">›</span> {l.msg}</div>
          ))}
          <span className="animate-pulse">▌</span>
        </div>
      )}
    </div>
  );
};
