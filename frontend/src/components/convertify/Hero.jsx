const BARS = Array.from({ length: 28 }, (_, i) => i);

export const Hero = () => (
  <section className="relative grid gap-8 py-10 md:py-14 lg:grid-cols-12 lg:items-end">
    <div className="rise lg:col-span-8">
      <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-primary">Conversor de áudio · v2</p>
      <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl" data-testid="hero-title">
        Converta seus áudios<br />
        <span className="text-muted-foreground">sem perder</span> <span className="text-primary">qualidade.</span>
      </h1>
      <p className="mt-5 max-w-xl text-sm text-muted-foreground sm:text-base">
        Arraste vários arquivos, escolha o formato e a qualidade, e baixe tudo de uma vez.
        Processado por FFmpeg no servidor — nada para instalar.
      </p>
    </div>
    <div className="rise flex h-24 items-end gap-1 lg:col-span-4 lg:justify-end" style={{ animationDelay: "150ms" }} aria-hidden>
      {BARS.map((i) => (
        <span
          key={i}
          className="eq-bar w-1.5 rounded-full bg-gradient-to-t from-primary to-accent"
          style={{ height: `${30 + ((i * 37) % 70)}%`, animationDelay: `${(i * 90) % 1100}ms` }}
        />
      ))}
    </div>
  </section>
);
