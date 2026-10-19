import { useEffect, useState } from "react";
import "@/App.css";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Wand2, PackageOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/convertify/Header";
import { Hero } from "@/components/convertify/Hero";
import { Dropzone } from "@/components/convertify/Dropzone";
import { FileQueue } from "@/components/convertify/FileQueue";
import { SettingsPanel } from "@/components/convertify/SettingsPanel";
import { ActivityLog } from "@/components/convertify/ActivityLog";
import { useConverter } from "@/hooks/useConverter";
import { downloadZip } from "@/lib/api";

const useTheme = () => {
  const [dark, setDark] = useState(() => localStorage.getItem("convertify-theme") !== "light");
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("convertify-theme", dark ? "dark" : "light");
  }, [dark]);
  return [dark, () => setDark((d) => !d)];
};

function App() {
  const [dark, toggle] = useTheme();
  const [settings, setSettings] = useState({ format: "mp3", bitrate: "192k", sampleRate: "original", channels: "original" });
  const [zipping, setZipping] = useState(false);
  const c = useConverter();
  const doneIds = c.items.filter((i) => i.status === "done").map((i) => i.jobId);

  const zip = async () => {
    setZipping(true);
    try {
      await downloadZip(doneIds);
      toast.success("ZIP baixado");
    } catch {
      toast.error("Falha ao gerar o ZIP");
    }
    setZipping(false);
  };

  return (
    <div className="grain relative min-h-screen">
      <div className="grid-bg pointer-events-none absolute inset-x-0 top-0 h-[520px]" />
      <Header dark={dark} onToggle={toggle} />
      <main className="relative z-10 mx-auto max-w-7xl px-4 pb-16 md:px-8">
        <Hero />
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 space-y-6 lg:col-span-8">
            <Dropzone onFiles={c.addFiles} compact={c.items.length > 0} />
            <FileQueue items={c.items} running={c.running} onRemove={c.remove} onClear={c.clearAll} onRetry={(it) => c.retry(it, settings)} />
          </div>
          <aside className="col-span-12 space-y-6 lg:col-span-4">
            <div className="rise rounded-2xl border border-border/60 bg-card p-5 lg:sticky lg:top-20" style={{ animationDelay: "200ms" }}>
              <h3 className="mb-5 text-lg font-semibold">Configurações de saída</h3>
              <SettingsPanel settings={settings} onChange={setSettings} disabled={c.running} />
              <div className="mt-6 space-y-2.5">
                <Button className="h-12 w-full text-base font-semibold" onClick={() => c.convertAll(settings)} disabled={c.running || !c.items.length} data-testid="convert-all-button">
                  {c.running ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                  {c.running ? "Convertendo..." : "Converter todos"}
                </Button>
                <Button variant="outline" className="h-11 w-full" onClick={zip} disabled={doneIds.length < 1 || zipping} data-testid="download-zip-button">
                  {zipping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageOpen className="mr-2 h-4 w-4" />}
                  Baixar em ZIP {doneIds.length > 0 && `(${doneIds.length})`}
                </Button>
              </div>
            </div>
            <ActivityLog logs={c.logs} onClear={c.clearLogs} />
          </aside>
        </div>
      </main>
      <Toaster position="top-center" theme={dark ? "dark" : "light"} />
    </div>
  );
}

export default App;
