# Convertify

Conversor de áudio em lote. Arraste vários arquivos, escolha o formato e a qualidade, e baixe tudo de uma vez — individualmente ou em um ZIP. A conversão é feita com FFmpeg no servidor.

**Formatos de saída:** MP3, WAV, M4A, OGG, FLAC, OPUS
**Entrada:** mp3, wav, m4a, ogg, flac, aac, wma, opus, aiff, webm, mp4 (até 200 MB por arquivo)

## Stack

- **Frontend:** React 19, Tailwind CSS, shadcn/ui, craco
- **Backend:** FastAPI, MongoDB (motor), FFmpeg via `imageio-ffmpeg`
- **Armazenamento:** arquivos salvos localmente em `backend/storage/`

## Como rodar

### Backend

```bash
cd backend
pip install fastapi==0.110.1 uvicorn==0.25.0 motor==3.7.1 python-dotenv python-multipart imageio-ffmpeg dnspython
cp .env.example .env   # preencha MONGO_URL com sua conexão do MongoDB
python -m uvicorn server:app --reload --port 8001
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

Abra http://localhost:3000.

## API

| Método | Rota | Descrição |
| --- | --- | --- |
| `POST` | `/api/jobs` | Envia um arquivo e inicia a conversão |
| `GET` | `/api/jobs/{id}` | Status, progresso e log da conversão |
| `GET` | `/api/jobs/{id}/download` | Baixa o arquivo convertido |
| `POST` | `/api/jobs/zip` | Baixa vários arquivos convertidos em ZIP |
| `DELETE` | `/api/jobs/{id}` | Remove uma conversão |
