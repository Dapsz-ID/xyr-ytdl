import { Ytdl } from "@distube/ytdl-core";

const ytdl = new Ytdl();

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.end(JSON.stringify(data));
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return json(res, 405, { error: "Method tidak diizinkan." });
  }

  const query = String(req.query.q || "").trim();
  const page = Math.max(0, Math.min(5, Number.parseInt(req.query.page || "0", 10) || 0));

  if (!query) return json(res, 400, { error: "Masukkan judul lagu atau kata kunci." });
  if (query.length > 180) return json(res, 400, { error: "Kata kunci terlalu panjang." });

  try {
    const isUrl = /^https?:\/\/(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be)\//i.test(query);
    let results = [];
    let hasMore = false;

    if (isUrl) {
      const info = await ytdl.getInfo(query);
      const video = info.videoDetails;
      results = [{
        id: video.videoId,
        title: video.title,
        artist: video.author?.name || "YouTube",
        author: video.author?.name || "YouTube",
        thumbnail: video.thumbnails?.at(-1)?.url || `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`,
        duration: Number(video.lengthSeconds || 0),
        durationFormatted: formatDuration(Number(video.lengthSeconds || 0)),
        views: Number(video.viewCount || 0),
        url: `https://www.youtube.com/watch?v=${video.videoId}`
      }];
    } else {
      const found = await ytdl.search(query, { limit: 12 * (page + 1) });
      const start = page * 12;
      const selected = found.slice(start, start + 12);
      hasMore = found.length > start + 12;
      results = selected.map((video) => {
        const thumbnails = video.thumbnails || [];
        return {
          id: video.id || video.videoId,
          title: video.title || "Tanpa judul",
          artist: video.author?.name || video.author || "YouTube",
          author: video.author?.name || video.author || "YouTube",
          thumbnail: thumbnails.at(-1)?.url || `https://i.ytimg.com/vi/${video.id || video.videoId}/hqdefault.jpg`,
          duration: Number(video.duration || video.lengthSeconds || 0),
          durationFormatted: video.durationFormatted || formatDuration(Number(video.duration || video.lengthSeconds || 0)),
          views: Number(video.views || video.viewCount || 0),
          url: `https://www.youtube.com/watch?v=${video.id || video.videoId}`
        };
      }).filter((video) => video.id);
    }

    return json(res, 200, {
      query,
      results,
      total: results.length,
      page,
      nextPage: page + 1,
      hasMore
    });
  } catch (error) {
    console.error("Search error:", error?.message || error);
    return json(res, 502, {
      error: "YouTube gagal memberikan hasil. Coba lagi beberapa saat atau gunakan kata kunci lain."
    });
  }
}

function formatDuration(seconds) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`
    : `${minutes}:${String(remainder).padStart(2, "0")}`;
}
