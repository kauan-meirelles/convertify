import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const FORMATS = ["mp3", "wav", "m4a", "ogg", "flac", "opus"];
export const LOSSLESS = ["wav", "flac"];
export const ACCEPT = ".mp3,.wav,.m4a,.ogg,.flac,.aac,.wma,.opus,.aiff,.webm,.mp4";

export const FORMAT_COLORS = {
  mp3: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
  wav: "bg-sky-500/15 text-sky-500 border-sky-500/30",
  flac: "bg-violet-500/15 text-violet-500 border-violet-500/30",
  m4a: "bg-orange-500/15 text-orange-500 border-orange-500/30",
  ogg: "bg-pink-500/15 text-pink-500 border-pink-500/30",
  opus: "bg-amber-500/15 text-amber-500 border-amber-500/30",
};

export const formatSize = (b) =>
  b < 1024 * 1024 ? `${(b / 1024).toFixed(1)} KB` : `${(b / 1024 / 1024).toFixed(2)} MB`;

export const extOf = (name) => (name.split(".").pop() || "").toLowerCase();

export const downloadUrl = (jobId) => `${API}/jobs/${jobId}/download`;

export const uploadJob = (file, settings, onUpload) => {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("format", settings.format);
  fd.append("bitrate", settings.bitrate);
  fd.append("sample_rate", settings.sampleRate);
  fd.append("channels", settings.channels);
  return axios
    .post(`${API}/jobs`, fd, {
      onUploadProgress: (e) => e.total && onUpload(Math.round((e.loaded / e.total) * 100)),
    })
    .then((r) => r.data);
};

export const getJob = (id) => axios.get(`${API}/jobs/${id}`).then((r) => r.data);

export const downloadZip = async (ids) => {
  const r = await axios.post(`${API}/jobs/zip`, { ids }, { responseType: "blob" });
  const url = URL.createObjectURL(r.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = "convertify.zip";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
};
