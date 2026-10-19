from fastapi import FastAPI, APIRouter, UploadFile, File, Form, HTTPException
from fastapi.responses import Response, StreamingResponse
from urllib.parse import quote
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from pathlib import Path
from datetime import datetime, timezone
import imageio_ffmpeg
import asyncio
import logging
import os
import re
import uuid
import io
import zipfile
import shutil
import tempfile

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
STORAGE_DIR = Path(os.environ.get("STORAGE_DIR") or ROOT_DIR / "storage").resolve()
APP_NAME = "convertify"
MAX_SIZE = 200 * 1024 * 1024

FORMATS = {
    "mp3": {"codec": "libmp3lame", "lossy": True, "mime": "audio/mpeg"},
    "wav": {"codec": "pcm_s16le", "lossy": False, "mime": "audio/wav"},
    "m4a": {"codec": "aac", "lossy": True, "mime": "audio/mp4"},
    "ogg": {"codec": "libvorbis", "lossy": True, "mime": "audio/ogg"},
    "flac": {"codec": "flac", "lossy": False, "mime": "audio/flac"},
    "opus": {"codec": "libopus", "lossy": True, "mime": "audio/opus"},
}
BITRATES = {"64k", "96k", "128k", "192k", "256k", "320k"}
SAMPLE_RATES = {"original", "22050", "44100", "48000", "96000"}
CHANNELS = {"original", "1", "2"}
VORBIS_Q = {"64k": 1, "96k": 2, "128k": 4, "192k": 6, "256k": 8, "320k": 10}
TASKS = set()


def friendly_error(lines: List[str], code: int) -> str:
    text = " ".join(lines).lower()
    if "invalid data" in text or "does not contain any stream" in text or "could not find codec" in text:
        return "Arquivo inválido ou corrompido: não foi possível ler o áudio."
    if "output file is empty" in text or "nothing was written" in text:
        return "O arquivo não contém áudio para converter."
    if "sample rate" in text or "bitrate" in text or "not supported" in text:
        return "Combinação de qualidade não suportada para este formato. Tente outras opções."
    return f"Falha na conversão (FFmpeg código {code})."

@asynccontextmanager
async def lifespan(app: FastAPI):
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Storage em {STORAGE_DIR}")
    yield
    client.close()


app = FastAPI(lifespan=lifespan)
api_router = APIRouter(prefix="/api")
logger = logging.getLogger("convertify")
logging.basicConfig(level=logging.INFO)


def _storage_path(path: str) -> Path:
    full = (STORAGE_DIR / path).resolve()
    if not full.is_relative_to(STORAGE_DIR):
        raise ValueError(f"Caminho inválido: {path}")
    return full


def put_object(path: str, data: bytes, content_type: str) -> dict:
    full = _storage_path(path)
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_bytes(data)
    return {"path": path}


def get_object(path: str) -> bytes:
    return _storage_path(path).read_bytes()


class Job(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    original_name: str
    output_name: str
    format: str
    bitrate: str
    sample_rate: str
    channels: str
    size_in: int
    input_path: str = ""
    output_path: str = ""
    size_out: int = 0
    duration: float = 0
    status: str = "pending"
    progress: float = 0
    error: Optional[str] = None
    log: List[str] = []
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class ZipRequest(BaseModel):
    ids: List[str]


def parse_time(t: str) -> float:
    h, m, s = t.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def build_cmd(job: Job, src: Path, dst: Path) -> List[str]:
    fmt = FORMATS[job.format]
    cmd = [FFMPEG, "-y", "-hide_banner", "-i", str(src), "-vn", "-c:a", fmt["codec"]]
    kbps = int(job.bitrate[:-1])
    if job.format == "ogg":
        cmd += ["-q:a", str(VORBIS_Q[job.bitrate])]
    elif job.format == "opus":
        cmd += ["-b:a", f"{min(kbps, 256 if job.channels == '1' else 510)}k"]
    elif fmt["lossy"]:
        cmd += ["-b:a", job.bitrate]
    sr = job.sample_rate
    if job.format == "opus" and sr not in ("original", "48000"):
        sr = "48000"
    if job.format == "mp3" and sr == "96000":
        sr = "48000"
    if sr != "original":
        cmd += ["-ar", sr]
    if job.channels != "original":
        cmd += ["-ac", job.channels]
    return cmd + ["-progress", "pipe:1", "-nostats", str(dst)]


async def update(job_id: str, **fields):
    await db.jobs.update_one({"id": job_id}, {"$set": fields})


async def push_log(job_id: str, line: str):
    await db.jobs.update_one({"id": job_id}, {"$push": {"log": {"$each": [line], "$slice": -60}}})


async def run_conversion(job: Job):
    tmp = Path(tempfile.mkdtemp(prefix="convertify-"))
    src = tmp / "input"
    dst = tmp / f"output.{job.format}"
    await update(job.id, status="converting")
    await push_log(job.id, f"Iniciando conversão para {job.format.upper()}...")
    try:
        src.write_bytes(await asyncio.to_thread(get_object, job.input_path))
        proc = await asyncio.create_subprocess_exec(
            *build_cmd(job, src, dst),
            stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.STDOUT,
        )
        duration, last_progress, errors = 0.0, -1.0, []
        async for raw in proc.stdout:
            line = raw.decode(errors="ignore").strip()
            if "Duration:" in line and not duration:
                m = re.search(r"Duration:\s*(\d+:\d+:\d+\.\d+)", line)
                if m:
                    duration = parse_time(m.group(1))
                    await update(job.id, duration=duration)
                    await push_log(job.id, f"Duração detectada: {m.group(1)}")
            elif line.startswith("out_time_us=") and duration:
                try:
                    pct = min(99.0, int(line.split("=")[1]) / 1e6 / duration * 100)
                except ValueError:
                    continue
                if pct - last_progress >= 2:
                    last_progress = pct
                    await update(job.id, progress=round(pct, 1))
            elif "=" not in line or " " in line:
                errors = (errors + [line])[-15:]
        code = await proc.wait()
        if code != 0 or not dst.exists():
            msg = friendly_error(errors, code)
            await update(job.id, status="error", error=msg)
            await push_log(job.id, f"Erro: {msg}")
            return
        size = dst.stat().st_size
        await push_log(job.id, "Salvando arquivo convertido...")
        out_path = f"{APP_NAME}/outputs/{job.id}.{job.format}"
        res = await asyncio.to_thread(put_object, out_path, dst.read_bytes(), FORMATS[job.format]["mime"])
        await update(job.id, status="done", progress=100, size_out=size, output_path=res["path"])
        await push_log(job.id, f"Concluído: {job.output_name} ({size / 1024 / 1024:.2f} MB)")
    except Exception as e:
        logger.exception("conversion failed")
        await update(job.id, status="error", error=str(e))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


@api_router.get("/")
async def root():
    return {"message": "Convertify API"}


@api_router.get("/formats")
async def formats():
    return {"formats": list(FORMATS.keys()), "bitrates": sorted(BITRATES, key=lambda b: int(b[:-1])),
            "sample_rates": sorted(SAMPLE_RATES), "channels": sorted(CHANNELS)}


@api_router.post("/jobs")
async def create_job(
    file: UploadFile = File(...),
    format: str = Form(...),
    bitrate: str = Form("192k"),
    sample_rate: str = Form("original"),
    channels: str = Form("original"),
):
    if format not in FORMATS:
        raise HTTPException(400, "Formato de saída inválido")
    if bitrate not in BITRATES or sample_rate not in SAMPLE_RATES or channels not in CHANNELS:
        raise HTTPException(400, "Opções de qualidade inválidas")
    stem = Path(file.filename or "audio").stem or "audio"
    job = Job(original_name=file.filename or "audio", output_name=f"{stem}.{format}", format=format,
              bitrate=bitrate, sample_rate=sample_rate, channels=channels, size_in=0)
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(413, "Arquivo excede 200 MB")
    if not data:
        raise HTTPException(400, "Arquivo vazio")
    job.size_in = len(data)
    ext = Path(job.original_name).suffix.lstrip(".") or "bin"
    res = await asyncio.to_thread(put_object, f"{APP_NAME}/inputs/{job.id}.{ext}", data,
                                  file.content_type or "application/octet-stream")
    job.input_path = res["path"]
    await db.jobs.insert_one(job.model_dump())
    task = asyncio.create_task(run_conversion(job))
    TASKS.add(task)
    task.add_done_callback(TASKS.discard)
    return job.model_dump()


@api_router.get("/jobs/{job_id}")
async def get_job(job_id: str):
    doc = await db.jobs.find_one({"id": job_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Conversão não encontrada")
    return Job(**doc).model_dump()


@api_router.get("/jobs/{job_id}/download")
async def download(job_id: str):
    doc = await db.jobs.find_one({"id": job_id, "is_deleted": {"$ne": True}}, {"_id": 0})
    if not doc or doc["status"] != "done":
        raise HTTPException(404, "Arquivo não disponível")
    data = await asyncio.to_thread(get_object, doc["output_path"])
    return Response(content=data, media_type=FORMATS[doc["format"]]["mime"],
                    headers={"Content-Disposition": f"attachment; filename*=UTF-8''{quote(doc['output_name'])}"})


@api_router.post("/jobs/zip")
async def download_zip(req: ZipRequest):
    docs = await db.jobs.find({"id": {"$in": req.ids}, "status": "done", "is_deleted": {"$ne": True}}, {"_id": 0}).to_list(500)
    buf = io.BytesIO()
    used = set()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_STORED) as zf:
        for d in docs:
            name, i = d["output_name"], 1
            while name in used:
                name = f"{Path(d['output_name']).stem} ({i}){Path(d['output_name']).suffix}"
                i += 1
            used.add(name)
            zf.writestr(name, await asyncio.to_thread(get_object, d["output_path"]))
    if not used:
        raise HTTPException(404, "Nenhum arquivo convertido disponível")
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip",
                             headers={"Content-Disposition": 'attachment; filename="convertify.zip"'})


@api_router.delete("/jobs/{job_id}")
async def delete_job(job_id: str):
    await db.jobs.update_one({"id": job_id}, {"$set": {"is_deleted": True}})
    return {"ok": True}


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
