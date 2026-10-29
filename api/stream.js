import { Ytdl, Quality } from "@distube/ytdl-core";

const ytdl = new Ytdl();

function sendError(res, status, message) {
  if (res.headersSent) return res.end();
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify({ error: message }));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return sendError(res, 405, "Method tidak diizinkan.");
  }

  const id = String(req.query.id || "").trim();
  const mode = req.query.mode === "download" ? "download" : "play";

  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
    return sendError(res, 400, "ID video YouTube tidak valid.");
  }

  try {
    const url = `https://www.youtube.com/watch?v=${id}`;
    const info = await ytdl.getInfo(url);
    const title = sanitizeFilename(info.videoDetails.title || "xyr-ytdl");
    const stream = ytdl.download(info, {
      quality: Quality.HighestAudio,
      filter: { hasAudio: true, hasVideo: false }
    });

    res.setHeader("Content-Type", "audio/webm");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", `${mode === "download" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(title)}.webm`);

    stream.on("error", (error) => {
      console.error("Audio stream error:", error?.message || error);
      if (!res.headersSent) sendError(res, 502, "Stream audio gagal dibuat. Coba lagi atau pilih lagu lain.");
      else res.destroy(error);
    });

    res.on("close", () => {
      if (!res.writableEnded) stream.destroy();
    });

    stream.pipe(res);
  } catch (error) {
    console.error("Stream setup error:", error?.message || error);
    return sendError(res, 502, "Audio tidak tersedia untuk diputar atau diunduh saat ini.");
  }
}

function sanitizeFilename(value) {
  return value.replace(/[\\/:*?"<>|]/g, "").replace(/\s+/g, " ").trim().slice(0, 120) || "xyr-ytdl";
}
