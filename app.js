const $ = (selector) => document.querySelector(selector);

const searchForm = $("#searchForm");
const searchInput = $("#searchInput");
const searchButton = $("#searchButton");
const resultsGrid = $("#resultsGrid");
const statusPanel = $("#status");
const resultCaption = $("#resultCaption");
const resultCount = $("#resultCount");
const loadMoreWrap = $("#loadMoreWrap");
const loadMoreButton = $("#loadMore");
const audio = $("#audioPlayer");
const playerBar = $("#playerBar");
const playerPlay = $("#playerPlay");
const playerCover = $("#playerCover");
const playerTitle = $("#playerTitle");
const playerArtist = $("#playerArtist");
const progress = $("#progress");
const currentTime = $("#currentTime");
const duration = $("#duration");
const volume = $("#volume");
const toast = $("#toast");

let activeQuery = "";
let nextPage = 0;
let totalResults = 0;
let currentTrack = null;
let toastTimer;
let searchController;

$("#year").textContent = new Date().getFullYear();
audio.volume = Number(volume.value);

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60);
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function compactNumber(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "—";
  return new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(number);
}

function notify(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 3000);
}

function setStatus(title, message, type = "info") {
  statusPanel.classList.remove("hidden", "error");
  statusPanel.classList.toggle("error", type === "error");
  statusPanel.innerHTML = `
    <div class="status-icon"><i class="fa-solid ${type === "error" ? "fa-triangle-exclamation" : type === "loading" ? "fa-spinner fa-spin" : "fa-wave-square"}"></i></div>
    <h3>${escapeHtml(title)}</h3>
    <p>${escapeHtml(message)}</p>
  `;
}

function hideStatus() {
  statusPanel.classList.add("hidden");
}

function renderSong(song) {
  const id = escapeHtml(song.id);
  const title = escapeHtml(song.title || "Tanpa judul");
  const artist = escapeHtml(song.artist || song.author || "YouTube");
  const thumbnail = escapeHtml(song.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(song.id)}/hqdefault.jpg`);
  const length = escapeHtml(song.durationFormatted || formatTime(Number(song.duration)));
  const views = compactNumber(song.views);
  return `
    <article class="song-card" data-id="${id}">
      <div class="cover-wrap">
        <img src="${thumbnail}" alt="Cover ${title}" loading="lazy" referrerpolicy="no-referrer">
        <div class="cover-overlay">
          <button class="cover-play" type="button" data-action="play" data-id="${id}" aria-label="Putar ${title}"><i class="fa-solid fa-play"></i></button>
        </div>
        <span class="duration-pill">${length}</span>
      </div>
      <div class="song-info">
        <div class="song-title" title="${title}">${title}</div>
        <div class="song-channel">${artist}</div>
        <div class="song-meta">
          <span><i class="fa-regular fa-eye"></i> ${views} views</span>
          <span><i class="fa-regular fa-circle-play"></i> ${length}</span>
        </div>
        <div class="song-actions">
          <span class="format-tag"><i class="fa-solid fa-headphones"></i> Audio</span>
          <span class="format-tag"><i class="fa-solid fa-cloud-arrow-down"></i> WebM</span>
        </div>
        <button class="download-button" type="button" data-action="download" data-id="${id}">
          <i class="fa-solid fa-download"></i> Download Audio
        </button>
      </div>
    </article>
  `;
}

async function search(query, append = false) {
  const normalized = query.trim();
  if (!normalized) {
    searchInput.focus();
    return;
  }

  if (!append) {
    activeQuery = normalized;
    nextPage = 0;
    totalResults = 0;
    resultsGrid.innerHTML = "";
    resultCount.textContent = "Mencari...";
  }

  searchButton.disabled = true;
  loadMoreButton.disabled = true;
  searchButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Mencari</span>';
  setStatus("Sedang mencari lagu...", "Tunggu sebentar, kami sedang mengambil hasil dari YouTube.", "loading");

  if (searchController) searchController.abort();
  searchController = new AbortController();

  try {
    const response = await fetch(`/api/search?q=${encodeURIComponent(normalized)}&page=${append ? nextPage : 0}`, {
      signal: searchController.signal
    });
    const data = await response.json();

    if (!response.ok) throw new Error(data.error || "Pencarian gagal. Coba lagi.");
    const songs = Array.isArray(data.results) ? data.results : [];

    if (!append) resultsGrid.innerHTML = "";
    if (!songs.length && !append) {
      resultCount.textContent = "0 hasil";
      resultCaption.textContent = `Tidak ada hasil untuk "${normalized}".`;
      setStatus("Lagu tidak ditemukan", "Coba kata kunci lain atau tempel URL video YouTube yang valid.");
      loadMoreWrap.classList.add("hidden");
      return;
    }

    resultsGrid.insertAdjacentHTML("beforeend", songs.map(renderSong).join(""));
    hideStatus();
    totalResults = Number(data.total || resultsGrid.children.length);
    resultCount.textContent = `${compactNumber(totalResults)} hasil`;
    resultCaption.textContent = `Hasil pencarian untuk "${normalized}"`;
    nextPage = Number(data.nextPage ?? nextPage + 1);
    loadMoreWrap.classList.toggle("hidden", !data.hasMore);
  } catch (error) {
    if (error.name === "AbortError") return;
    if (!append) resultsGrid.innerHTML = "";
    resultCount.textContent = "Gagal";
    setStatus("Pencarian gagal", error.message || "Terjadi masalah saat menghubungi server.", "error");
    loadMoreWrap.classList.add("hidden");
  } finally {
    searchButton.disabled = false;
    loadMoreButton.disabled = false;
    searchButton.innerHTML = '<i class="fa-solid fa-magnifying-glass"></i><span>Search</span>';
  }
}

function updatePlayIcon() {
  const playing = !audio.paused;
  playerPlay.innerHTML = `<i class="fa-solid fa-${playing ? "pause" : "play"}"></i>`;
  document.querySelectorAll('[data-action="play"]').forEach((button) => {
    const isCurrent = currentTrack && button.dataset.id === currentTrack.id;
    button.innerHTML = `<i class="fa-solid fa-${isCurrent && playing ? "pause" : "play"}"></i>`;
  });
}

async function playSong(id) {
  const card = resultsGrid.querySelector(`.song-card[data-id="${CSS.escape(id)}"]`);
  if (!card) return;
  const title = card.querySelector(".song-title")?.textContent || "Audio YouTube";
  const artist = card.querySelector(".song-channel")?.textContent || "YouTube";
  const cover = card.querySelector("img")?.src || "";

  if (currentTrack?.id === id && !audio.paused) {
    audio.pause();
    updatePlayIcon();
    return;
  }

  currentTrack = { id, title, artist, cover };
  playerTitle.textContent = title;
  playerArtist.textContent = artist;
  playerCover.src = cover;
  playerBar.hidden = false;
  playerBar.classList.add("is-active");
  audio.pause();
  audio.src = `/api/stream?id=${encodeURIComponent(id)}&mode=play`;
  audio.load();

  try {
    await audio.play();
    updatePlayIcon();
  } catch {
    notify("Browser menolak autoplay. Tekan tombol play sekali lagi.");
    updatePlayIcon();
  }
}

async function downloadSong(id, button) {
  const original = button.innerHTML;
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menyiapkan...';

  try {
    const url = `/api/stream?id=${encodeURIComponent(id)}&mode=download`;
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.rel = "noopener";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    notify("Permintaan download audio dikirim ke server.");
  } catch (error) {
    notify(error.message || "Download gagal. Coba lagi.");
  } finally {
    setTimeout(() => {
      button.disabled = false;
      button.innerHTML = original;
    }, 1200);
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  search(searchInput.value);
});

loadMoreButton.addEventListener("click", () => search(activeQuery, true));

resultsGrid.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;
  if (button.dataset.action === "play") playSong(button.dataset.id);
  if (button.dataset.action === "download") downloadSong(button.dataset.id, button);
});

playerPlay.addEventListener("click", async () => {
  if (!currentTrack) {
    notify("Cari dan pilih lagu terlebih dahulu.");
    return;
  }
  if (audio.paused) {
    try {
      await audio.play();
    } catch {
      notify("Audio belum bisa diputar. Coba pilih lagunya kembali.");
    }
  } else {
    audio.pause();
  }
  updatePlayIcon();
});

audio.addEventListener("play", updatePlayIcon);
audio.addEventListener("pause", updatePlayIcon);
audio.addEventListener("ended", updatePlayIcon);
audio.addEventListener("loadedmetadata", () => {
  duration.textContent = formatTime(audio.duration);
});
audio.addEventListener("timeupdate", () => {
  currentTime.textContent = formatTime(audio.currentTime);
  duration.textContent = formatTime(audio.duration);
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    progress.value = String(Math.round((audio.currentTime / audio.duration) * 1000));
  }
});
audio.addEventListener("error", () => {
  if (currentTrack) notify("Stream gagal diputar. Coba lagu lain atau ulangi beberapa saat lagi.");
  updatePlayIcon();
});
progress.addEventListener("input", () => {
  if (Number.isFinite(audio.duration) && audio.duration > 0) {
    audio.currentTime = (Number(progress.value) / 1000) * audio.duration;
  }
});
volume.addEventListener("input", () => {
  audio.volume = Number(volume.value);
});
