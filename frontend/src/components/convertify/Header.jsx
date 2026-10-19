import { Moon, Sun, AudioWaveform } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Header = ({ dark, onToggle }) => (
  <header className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl">
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-8">
      <div className="flex items-center gap-3" data-testid="app-logo">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_0_24px_hsl(var(--primary)/0.45)]">
          <AudioWaveform className="h-5 w-5" />
        </div>
        <span className="font-display text-lg font-extrabold tracking-tight">Convertify</span>
        <span className="hidden rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground sm:inline">
          FFmpeg · Lote · ZIP
        </span>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggle}
        data-testid="theme-toggle-button"
        aria-label="Alternar tema"
        className="rounded-full"
      >
        {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>
    </div>
  </header>
);