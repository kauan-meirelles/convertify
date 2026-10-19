import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FORMATS, LOSSLESS } from "@/lib/api";

const PRESETS = [
  { id: "high", label: "Alta", bitrate: "320k" },
  { id: "medium", label: "Média", bitrate: "192k" },
  { id: "low", label: "Baixa", bitrate: "128k" },
];
const BITRATES = ["64k", "96k", "128k", "192k", "256k", "320k"];
const RATES = [["original", "Original"], ["22050", "22.05 kHz"], ["44100", "44.1 kHz"], ["48000", "48 kHz"], ["96000", "96 kHz"]];
const CHANNELS = [["original", "Original"], ["2", "Estéreo"], ["1", "Mono"]];

const Label = ({ children }) => (
  <p className="mb-2 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{children}</p>
);

const Pill = ({ active, children, ...p }) => (
  <button
    type="button"
    {...p}
    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-[background-color,border-color,color,transform] duration-150 active:scale-95 disabled:opacity-40 ${
      active ? "border-primary bg-primary text-primary-foreground shadow-[0_0_18px_hsl(var(--primary)/0.35)]" : "border-border bg-secondary/50 hover:border-primary/50"
    }`}
  >
    {children}
  </button>
);

const Field = ({ label, value, onChange, options, testid, disabled }) => (
  <div>
    <Label>{label}</Label>
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger data-testid={testid}><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map(([v, l]) => <SelectItem key={v} value={v} data-testid={`${testid}-option-${v}`}>{l}</SelectItem>)}
      </SelectContent>
    </Select>
  </div>
);

export const SettingsPanel = ({ settings, onChange, disabled }) => {
  const set = (k) => (v) => onChange({ ...settings, [k]: v });
  const lossless = LOSSLESS.includes(settings.format);
  return (
    <div className="space-y-5" data-testid="settings-panel">
      <div>
        <Label>Formato de saída</Label>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => (
            <Pill key={f} active={settings.format === f} onClick={() => set("format")(f)} disabled={disabled} data-testid={`format-select-${f}`}>
              {f.toUpperCase()}
            </Pill>
          ))}
        </div>
      </div>
      <div>
        <Label>Qualidade {lossless && <span className="normal-case tracking-normal">— sem perdas</span>}</Label>
        <div className="grid grid-cols-3 gap-2">
          {PRESETS.map((p) => (
            <Pill key={p.id} active={!lossless && settings.bitrate === p.bitrate} disabled={disabled || lossless} onClick={() => set("bitrate")(p.bitrate)} data-testid={`preset-${p.id}`}>
              {p.label}
            </Pill>
          ))}
        </div>
      </div>
      <Field label="Taxa de bits" value={settings.bitrate} onChange={set("bitrate")} disabled={disabled || lossless}
        options={BITRATES.map((b) => [b, `${b.replace("k", "")} kbps`])} testid="bitrate-select" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amostragem" value={settings.sampleRate} onChange={set("sampleRate")} disabled={disabled} options={RATES} testid="samplerate-select" />
        <Field label="Canais" value={settings.channels} onChange={set("channels")} disabled={disabled} options={CHANNELS} testid="channels-select" />
      </div>
    </div>
  );
};
