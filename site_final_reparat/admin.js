const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

let settings = null;
let buttons = [];
let selectedButton = null;
let selectedContent = null;

document.addEventListener("DOMContentLoaded", boot);

async function boot() {
  const { data: { session }, error } = await db.auth.getSession();

  if (error) console.error(error);

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  registerEvents();
  $("adminPanel").classList.remove("hidden");
  await loadSettings();
  await loadButtons();
}

function registerEvents() {
  $("logoutBtn").addEventListener("click", logout);
  $("addButtonBtn").addEventListener("click", addButton);
  $("saveSettingsBtn").addEventListener("click", saveSettings);
  $("addImageUrlBtn").addEventListener("click", addImageUrl);
  $("saveButtonContentBtn").addEventListener("click", () => saveCurrentContent(true));
}

async function logout() {
  await db.auth.signOut();
  window.location.href = "login.html";
}

async function loadSettings() {
  const { data, error } = await db
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    showStatus("settingsStatus", "Eroare: " + error.message, true);
    return;
  }

  settings = data || {
    id: 1,
    client_title: "Bine ai venit!",
    client_button_text: "Intră în meniu",
    background_image_url: null
  };

  $("clientTitle").value = settings.client_title || "";
  $("clientButtonText").value = settings.client_button_text || "";
  $("backgroundUrl").value = settings.background_image_url || "";

  $("welcomeTopTextInput").value =
    settings.welcome_top_text || "Un mesaj frumos pentru tine.";

  $("welcomeSecondTitleInput").value =
    settings.welcome_second_title || "Descoperă surprizele pregătite";

  $("welcomeBottomTextInput").value =
    settings.welcome_bottom_text ||
    "Apasă pe buton pentru a intra în meniul principal.";

  $("welcomeBackgroundColorInput").value =
    settings.welcome_background_color || "#d319b7";

  $("contentBackgroundColorInput").value =
    settings.content_background_color || "#d319b7";

  renderBackgroundPreview();
}

function renderBackgroundPreview() {
  const box = $("backgroundInfo");
  box.innerHTML = "";

  if (!settings?.background_image_url) {
    box.textContent = "Nu există imagine de fundal salvată.";
    return;
  }

  const img = document.createElement("img");
  img.src = settings.background_image_url;
  img.alt = "Imagine de fundal";
  img.className = "preview-img";
  img.onerror = () => {
    box.textContent = "URL-ul este salvat, dar imaginea nu poate fi încărcată.";
  };

  box.appendChild(img);
}

async function saveSettings() {
  const backgroundUrl = $("backgroundUrl").value.trim() || null;

  if (backgroundUrl && !isValidUrl(backgroundUrl)) {
    showStatus("settingsStatus", "URL imagine invalid.", true);
    return;
  }

  showStatus("settingsStatus", "Se salvează...");

  const { data, error } = await db
    .from("site_settings")
    .upsert({
      id: 1,
      client_title: $("clientTitle").value.trim() || "Bine ai venit!",
      client_button_text: $("clientButtonText").value.trim() || "Intră în meniu",
      background_image_url: backgroundUrl,
      welcome_top_text: $("welcomeTopTextInput").value.trim(),
      welcome_second_title: $("welcomeSecondTitleInput").value.trim(),
      welcome_bottom_text: $("welcomeBottomTextInput").value.trim(),
      welcome_background_color: $("welcomeBackgroundColorInput").value,
      content_background_color: $("contentBackgroundColorInput").value,
      updated_at: new Date().toISOString()
    }, { onConflict: "id" })
    .select("*")
    .single();

  if (error) {
    showStatus("settingsStatus", "Eroare: " + error.message, true);
    return;
  }

  settings = data;
  renderBackgroundPreview();
  showStatus("settingsStatus", "Setările au fost salvate.");
}

async function loadButtons() {
  const { data, error } = await db
    .from("main_buttons")
    .select("*")
    .order("position", { ascending: true });

  if (error) {
    showStatus("editorStatus", "Eroare: " + error.message, true);
    return;
  }

  buttons = data || [];
  renderButtonList();
}

function renderButtonList() {
  const list = $("buttonList");
  list.innerHTML = "";

  if (!buttons.length) {
    list.innerHTML = '<p class="muted">Nu ai încă butoane.</p>';
    return;
  }

  buttons.forEach((btn) => {
    const row = document.createElement("div");
    row.className = "button-row";

    const label = document.createElement("span");
    label.textContent = btn.label;

    const actions = document.createElement("div");

    const edit = document.createElement("button");
    edit.className = "small-btn";
    edit.type = "button";
    edit.textContent = "Edit";
    edit.addEventListener("click", () => selectButton(btn.id));

    const remove = document.createElement("button");
    remove.className = "danger-btn";
    remove.type = "button";
    remove.textContent = "Șterge";
    remove.addEventListener("click", () => deleteButton(btn.id));

    actions.append(edit, remove);
    row.append(label, actions);
    list.appendChild(row);
  });
}

async function addButton() {
  const label = prompt("Textul butonului nou:");
  if (!label?.trim()) return;

  const { data, error } = await db
    .from("main_buttons")
    .insert({
      label: label.trim(),
      position: buttons.length
    })
    .select("*")
    .single();

  if (error) {
    alert("Eroare: " + error.message);
    return;
  }

  const { error: contentError } = await db
    .from("button_content")
    .upsert({
      button_id: data.id,
      image_urls: [],
      custom_text: "",
      youtube_url: ""
    }, { onConflict: "button_id" });

  if (contentError) {
    alert("Buton creat, dar conținutul inițial nu a putut fi creat: " + contentError.message);
  }

  await loadButtons();
  await selectButton(data.id);
}

async function selectButton(id) {
  selectedButton = buttons.find((b) => b.id === id);
  if (!selectedButton) return;

  const { data, error } = await db
    .from("button_content")
    .select("*")
    .eq("button_id", id)
    .maybeSingle();

  if (error) {
    showStatus("editorStatus", "Eroare: " + error.message, true);
    return;
  }

  selectedContent = data || {
    button_id: id,
    image_urls: [],
    custom_text: "",
    youtube_url: ""
  };

  selectedContent.image_urls = normalizeImageUrls(selectedContent.image_urls);

  $("noSelectedText").classList.add("hidden");
  $("editor").classList.remove("hidden");
  $("buttonLabel").value = selectedButton.label || "";
  $("customText").value = selectedContent.custom_text || "";
  $("youtubeUrl").value = selectedContent.youtube_url || "";
  $("imageUrlInput").value = "";

  renderImages();
  showStatus("editorStatus", "");
}

function addImageUrl() {
  if (!selectedContent) {
    showStatus("editorStatus", "Selectează mai întâi un buton.", true);
    return;
  }

  const url = $("imageUrlInput").value.trim();

  if (!isValidUrl(url)) {
    showStatus("editorStatus", "URL imagine invalid.", true);
    return;
  }

  const urls = normalizeImageUrls(selectedContent.image_urls);

  if (!urls.includes(url)) {
    urls.push(url);
  }

  selectedContent.image_urls = urls;
  $("imageUrlInput").value = "";
  renderImages();

  showStatus(
    "editorStatus",
    "Imaginea a fost adăugată. Apasă «Salvează acest buton»."
  );
}

function renderImages() {
  const list = $("imageList");
  list.innerHTML = "";

  const urls = normalizeImageUrls(selectedContent?.image_urls);

  if (!urls.length) {
    list.innerHTML = '<p class="muted">Nu există imagini.</p>';
    return;
  }

  urls.forEach((url, index) => {
    const item = document.createElement("div");
    item.className = "image-item";

    const img = document.createElement("img");
    img.src = url;
    img.alt = `Imagine ${index + 1}`;
    img.onerror = () => {
      img.alt = "Imagine indisponibilă";
    };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Șterge imaginea";
    remove.addEventListener("click", () => {
      selectedContent.image_urls.splice(index, 1);
      renderImages();
      showStatus("editorStatus", "Imagine eliminată. Salvează butonul.");
    });

    item.append(img, remove);
    list.appendChild(item);
  });
}

async function saveCurrentContent(showMessage = true) {
  if (!selectedButton || !selectedContent) return;

  const label = $("buttonLabel").value.trim() || "Buton fără titlu";

  const { error: buttonError } = await db
    .from("main_buttons")
    .update({
      label,
      updated_at: new Date().toISOString()
    })
    .eq("id", selectedButton.id);

  if (buttonError) {
    showStatus("editorStatus", "Eroare: " + buttonError.message, true);
    return;
  }

  const { data, error } = await db
    .from("button_content")
    .upsert({
      button_id: selectedButton.id,
      image_urls: normalizeImageUrls(selectedContent.image_urls),
      custom_text: $("customText").value,
      youtube_url: $("youtubeUrl").value.trim(),
      updated_at: new Date().toISOString()
    }, { onConflict: "button_id" })
    .select("*")
    .single();

  if (error) {
    showStatus("editorStatus", "Eroare: " + error.message, true);
    return;
  }

  selectedContent = {
    ...data,
    image_urls: normalizeImageUrls(data.image_urls)
  };

  await loadButtons();
  renderImages();

  if (showMessage) {
    showStatus("editorStatus", "Conținutul a fost salvat.");
  }
}

async function deleteButton(id) {
  if (!confirm("Sigur ștergi acest buton?")) return;

  const { error } = await db
    .from("main_buttons")
    .delete()
    .eq("id", id);

  if (error) {
    alert("Eroare: " + error.message);
    return;
  }

  if (selectedButton?.id === id) {
    selectedButton = null;
    selectedContent = null;
    $("editor").classList.add("hidden");
    $("noSelectedText").classList.remove("hidden");
  }

  await loadButtons();
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value) return [];

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
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

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function showStatus(id, message, isError = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.classList.toggle("error", isError);
}
