import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { ACCEPT, extOf, getJob, uploadJob } from "@/lib/api";

const MAX_SIZE = 200 * 1024 * 1024;
const POLL_MS = 700;
const ALLOWED = ACCEPT.split(",").map((e) => e.slice(1));

const now = () => new Date().toLocaleTimeString("pt-BR", { hour12: false });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errorMessage = (e) => e?.response?.data?.detail || e?.message || "Erro desconhecido";

export const useConverter = () => {
  const [items, setItems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [running, setRunning] = useState(false);
  const itemsRef = useRef(items);
  itemsRef.current = items;

  const log = useCallback((msg) => setLogs((l) => [...l.slice(-199), { t: now(), msg }]), []);

  const patch = useCallback((id, fields) => {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...fields } : it)));
  }, []);

  const addFiles = useCallback((fileList) => {
    const accepted = [];
    for (const file of Array.from(fileList || [])) {
      if (!ALLOWED.includes(extOf(file.name))) {
        toast.error(`${file.name}: formato não suportado`);
      } else if (file.size > MAX_SIZE) {
        toast.error(`${file.name}: excede 200 MB`);
      } else {
        accepted.push({ id: crypto.randomUUID(), file, status: "pending", progress: 0, jobId: null, format: null, sizeOut: 0, error: null });
      }
    }
    if (!accepted.length) return;
    setItems((list) => [...list, ...accepted]);
    log(`${accepted.length} arquivo(s) adicionado(s) à fila`);
  }, [log]);

  const convertOne = useCallback(async (item, settings) => {
    const name = item.file.name;
    patch(item.id, { status: "uploading", progress: 0, error: null, jobId: null });
    log(`Enviando ${name}...`);
    try {
      const job = await uploadJob(item.file, settings, (pct) => patch(item.id, { progress: pct }));
      patch(item.id, { status: "converting", progress: 0, jobId: job.id, format: job.format });
      let seen = 0;
      while (true) {
        await sleep(POLL_MS);
        const j = await getJob(job.id);
        j.log.slice(seen).forEach((line) => log(`[${name}] ${line}`));
        seen = j.log.length;
        if (j.status === "done") {
          patch(item.id, { status: "done", progress: 100, sizeOut: j.size_out });
          return true;
        }
        if (j.status === "error") {
          patch(item.id, { status: "error", error: j.error || "Falha na conversão" });
          return false;
        }
        patch(item.id, { progress: j.progress });
      }
    } catch (e) {
      const msg = errorMessage(e);
      patch(item.id, { status: "error", error: msg });
      log(`[${name}] Erro: ${msg}`);
      return false;
    }
  }, [log, patch]);

  const convertAll = useCallback(async (settings) => {
    const queue = itemsRef.current.filter((it) => it.status !== "done");
    if (!queue.length) {
      toast.info("Nenhum arquivo pendente");
      return;
    }
    setRunning(true);
    log(`Convertendo ${queue.length} arquivo(s) para ${settings.format.toUpperCase()}`);
    let ok = 0;
    for (const item of queue) {
      if (!itemsRef.current.some((it) => it.id === item.id)) continue;
      if (await convertOne(item, settings)) ok++;
    }
    setRunning(false);
    const failed = queue.length - ok;
    if (failed) toast.error(`${ok} convertido(s), ${failed} com erro`);
    else toast.success(`${ok} arquivo(s) convertido(s)`);
  }, [convertOne, log]);

  const retry = useCallback(async (item, settings) => {
    setRunning(true);
    const ok = await convertOne(item, settings);
    setRunning(false);
    if (ok) toast.success(`${item.file.name} convertido`);
  }, [convertOne]);

  const remove = useCallback((id) => setItems((list) => list.filter((it) => it.id !== id)), []);
  const clearAll = useCallback(() => setItems([]), []);
  const clearLogs = useCallback(() => setLogs([]), []);

  return { items, logs, running, addFiles, convertAll, retry, remove, clearAll, clearLogs };
};
