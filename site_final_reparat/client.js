const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

let buttons = [];
let contents = [];
let siteSettings = null;

let youtubeApiPromise = null;
let youtubePlayer = null;

document.addEventListener("DOMContentLoaded", () => {
  $("enterMenuBtn").addEventListener("click", showMenu);
  $("backHomeBtn").addEventListener("click", showMenu);
  loadClient();
});

async function loadClient() {
  await loadSettings();
  await loadMenu();
}

async function loadSettings() {
  const { data, error } = await db
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    console.error("Eroare la citirea setărilor:", error);
    return;
  }

  if (!data) return;

  siteSettings = data;

  $("clientTitle").textContent =
    data.client_title || "Bine ai venit!";

  $("enterMenuBtn").textContent =
    data.client_button_text || "Intră în meniu";

  $("welcomeTopText").textContent =
    data.welcome_top_text || "Un mesaj frumos pentru tine.";

  $("welcomeSecondTitle").textContent =
    data.welcome_second_title || "Descoperă surprizele pregătite";

  $("welcomeBottomText").textContent =
    data.welcome_bottom_text ||
    "Apasă pe buton pentru a intra în meniul principal.";

  $("welcomeColorSection").style.backgroundColor =
    data.welcome_background_color || "#d319b7";

  $("contentScreen").style.backgroundColor =
    data.content_background_color || "#d319b7";

  if (data.background_image_url) {
    const background =
      `linear-gradient(rgba(0,0,0,.18), rgba(0,0,0,.42)), ` +
      `url("${data.background_image_url}")`;

    $("welcomeImageSection").style.backgroundImage = background;
    $("menuScreen").style.backgroundImage = background;
  }
}

async function loadMenu() {
  const [buttonResult, contentResult] = await Promise.all([
    db
      .from("main_buttons")
      .select("*")
      .order("position", { ascending: true }),

    db
      .from("button_content")
      .select("*")
  ]);

  if (buttonResult.error) {
    console.error("Eroare butoane:", buttonResult.error);
    return;
  }

  if (contentResult.error) {
    console.error("Eroare conținut:", contentResult.error);
    return;
  }

  buttons = buttonResult.data || [];
  contents = contentResult.data || [];

  renderMenu();
}

function renderMenu() {
  const box = $("menuButtons");
  box.innerHTML = "";

  if (!buttons.length) {
    box.innerHTML = "<p>Momentan nu există butoane configurate.</p>";
    return;
  }

  buttons.forEach((btn) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "menu-button";
    button.textContent = btn.label;

    button.addEventListener("click", () => showContent(btn));
    box.appendChild(button);
  });
}

function showMenu() {
  destroyYoutubePlayer();

  $("startScreen").classList.add("hidden");
  $("contentScreen").classList.add("hidden");
  $("menuScreen").classList.remove("hidden");
  $("backHomeBox").classList.add("hidden");

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showContent(btn) {
  const content =
    contents.find(
      (item) => String(item.button_id) === String(btn.id)
    ) || {};

  $("startScreen").classList.add("hidden");
  $("menuScreen").classList.add("hidden");
  $("contentScreen").classList.remove("hidden");
  $("backHomeBox").classList.remove("hidden");

  $("contentTitle").textContent = btn.label;

  renderContentImages(content.image_urls, btn.label);
  renderText(content.custom_text);
  renderYoutube(content.youtube_url);

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderContentImages(value, label) {
  const container = $("imagesContainer");
  container.innerHTML = "";

  const urls = normalizeImageUrls(value);

  urls.forEach((url, index) => {
    const img = document.createElement("img");
    img.src = url;
    img.alt = `${label} - imagine ${index + 1}`;
    img.loading = "lazy";

    img.onerror = () => {
      console.error("Imagine indisponibilă:", url);
      img.remove();
    };

    container.appendChild(img);
  });
}

function renderText(text) {
  const container = $("textContainer");
  container.innerHTML = "";

  if (!text) return;

  const textBox = document.createElement("div");
  textBox.className = "client-custom-text-box";

  const p = document.createElement("p");
  p.textContent = text;

  textBox.appendChild(p);
  container.appendChild(textBox);
}

function loadYoutubeApi() {
  if (window.YT && window.YT.Player) {
    return Promise.resolve(window.YT);
  }

  if (youtubeApiPromise) return youtubeApiPromise;

  youtubeApiPromise = new Promise((resolve, reject) => {
    const previousCallback = window.onYouTubeIframeAPIReady;

    window.onYouTubeIframeAPIReady = () => {
      if (typeof previousCallback === "function") {
        previousCallback();
      }

      resolve(window.YT);
    };

    if (!document.getElementById("youtube-iframe-api")) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;

      script.onerror = () => {
        reject(new Error("API-ul YouTube nu a putut fi încărcat."));
      };

      document.body.appendChild(script);
    }
  });

  return youtubeApiPromise;
}

async function renderYoutube(url) {
  const container = $("youtubeContainer");
  container.innerHTML = "";

  destroyYoutubePlayer();

  const videoId = getYoutubeVideoId(url);
  if (!videoId) return;

  const playerElement = document.createElement("div");
  playerElement.id = `youtubePlayer-${Date.now()}`;
  playerElement.className = "hidden-youtube-player";

  const musicButton = document.createElement("button");
  musicButton.type = "button";
  musicButton.className = "music-button";
  musicButton.textContent = "▶ Pornește muzica";
  musicButton.disabled = true;

  const status = document.createElement("p");
  status.className = "music-status";
  status.textContent = "Se încarcă playerul...";

  container.append(playerElement, musicButton, status);

  try {
    await loadYoutubeApi();

    youtubePlayer = new window.YT.Player(playerElement.id, {
      height: "1",
      width: "1",
      videoId,

      playerVars: {
        autoplay: 0,
        controls: 0,
        rel: 0,
        modestbranding: 1,
        playsinline: 1,
        loop: 1,
        playlist: videoId
      },

      events: {
        onReady: () => {
          musicButton.disabled = false;
          status.textContent = "";
        },

        onStateChange: (event) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            musicButton.textContent = "⏸ Pauză muzică";
          } else if (
            event.data === window.YT.PlayerState.PAUSED ||
            event.data === window.YT.PlayerState.ENDED
          ) {
            musicButton.textContent = "▶ Pornește muzica";
          }
        },

        onError: (event) => {
          console.error("Eroare YouTube:", event.data);
          status.textContent = "Melodia nu poate fi redată.";
          status.classList.add("error");
          musicButton.disabled = true;
        }
      }
    });

    musicButton.addEventListener("click", () => {
      if (!youtubePlayer) return;

      const state = youtubePlayer.getPlayerState();

      if (state === window.YT.PlayerState.PLAYING) {
        youtubePlayer.pauseVideo();
      } else {
        youtubePlayer.playVideo();
      }
    });
  } catch (error) {
    console.error(error);
    status.textContent = error.message;
    status.classList.add("error");
    musicButton.disabled = true;
  }
}

function destroyYoutubePlayer() {
  if (
    youtubePlayer &&
    typeof youtubePlayer.destroy === "function"
  ) {
    youtubePlayer.destroy();
  }

  youtubePlayer = null;
}

function getYoutubeVideoId(url) {
  if (!url) return "";

  try {
    const parsed = new URL(url.trim());
    const host = parsed.hostname
      .replace("www.", "")
      .replace("m.", "");

    if (host === "youtu.be") {
      return parsed.pathname.split("/").filter(Boolean)[0] || "";
    }

    if (
      host === "youtube.com" ||
      host === "music.youtube.com"
    ) {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v") || "";
      }

      if (
        parsed.pathname.startsWith("/shorts/") ||
        parsed.pathname.startsWith("/embed/") ||
        parsed.pathname.startsWith("/live/")
      ) {
        return parsed.pathname.split("/").filter(Boolean)[1] || "";
      }
    }
  } catch (error) {
    console.error("Link YouTube invalid:", error);
  }

  return "";
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      return value
        .replace(/^\{|\}$/g, "")
        .split(",")
        .map((url) => url.trim().replace(/^"|"$/g, ""))
        .filter(Boolean);
    }
  }

  return [];
}
