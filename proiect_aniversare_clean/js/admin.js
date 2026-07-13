const db = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

const $ = (id) => document.getElementById(id);

let settings = null;
let buttons = [];
let selectedButton = null;
let selectedContent = null;

document.addEventListener("DOMContentLoaded", checkAdminLogin);

async function checkAdminLogin() {
  const {
    data: { session },
    error
  } = await db.auth.getSession();

  if (error) {
    console.error(error);
  }

  if (!session) {
    window.location.href = "login.html";
    return;
  }

  $("adminPanel")?.classList.remove("hidden");

  registerEvents();
  await initAdmin();
}

function registerEvents() {
  $("logoutBtn")?.addEventListener("click", logout);
  $("addButtonBtn")?.addEventListener("click", addButton);
  $("saveSettingsBtn")?.addEventListener("click", saveSettings);
  $("addImageUrlBtn")?.addEventListener("click", addImageUrl);

  $("saveButtonContentBtn")?.addEventListener("click", () => {
    saveCurrentContent(true);
  });
}

async function logout() {
  await db.auth.signOut();
  window.location.href = "login.html";
}

async function initAdmin() {
  await loadSettings();
  await loadButtons();
}

async function loadSettings() {
  const { data, error } = await db
    .from("site_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    showStatus(
      "settingsStatus",
      "Eroare la citirea setărilor: " + error.message,
      true
    );

    return;
  }

  settings = data || {
    id: 1,
    client_title: "Bine ai venit!",
    client_button_text: "Intră în meniu",
    background_image_url: null
  };

  $("clientTitle").value =
    settings.client_title || "";

  $("clientButtonText").value =
    settings.client_button_text || "";

  $("backgroundUrl").value =
    settings.background_image_url || "";

  renderBackgroundPreview();
}

function renderBackgroundPreview() {
  const info = $("backgroundInfo");

  if (!info) {
    return;
  }

  info.innerHTML = "";

  if (!settings?.background_image_url) {
    info.textContent =
      "Nu există imagine de fundal salvată.";

    return;
  }

  const text = document.createElement("p");
  text.textContent =
    "Imagine de fundal salvată:";

  const image = document.createElement("img");
  image.src = settings.background_image_url;
  image.alt = "Imagine de fundal";
  image.className = "preview-img";

  image.onerror = () => {
    image.alt = "Link imagine invalid";
    console.error(
      "Imaginea nu poate fi încărcată:",
      settings.background_image_url
    );
  };

  info.appendChild(text);
  info.appendChild(image);
}

async function saveSettings() {
  const backgroundUrl =
    $("backgroundUrl").value.trim() || null;

  if (
    backgroundUrl &&
    !isValidSupabaseImageUrl(backgroundUrl)
  ) {
    showStatus(
      "settingsStatus",
      "Introdu un link public valid din Supabase Storage.",
      true
    );

    return;
  }

  const { data, error } = await db
    .from("site_settings")
    .upsert(
      {
        id: 1,
        client_title:
          $("clientTitle").value.trim() ||
          "Bine ai venit!",

        client_button_text:
          $("clientButtonText").value.trim() ||
          "Intră în meniu",

        background_image_url: backgroundUrl,
        updated_at: new Date().toISOString()
      },
      {
        onConflict: "id"
      }
    )
    .select("*")
    .single();

  if (error) {
    showStatus(
      "settingsStatus",
      "Eroare la salvare: " + error.message,
      true
    );

    return;
  }

  settings = data;
  renderBackgroundPreview();

  showStatus(
    "settingsStatus",
    "Setările și linkul imaginii au fost salvate."
  );
}

async function loadButtons() {
  const { data, error } = await db
    .from("main_buttons")
    .select("*")
    .order("position", {
      ascending: true
    });

  if (error) {
    showStatus(
      "editorStatus",
      "Eroare la citirea butoanelor: " +
        error.message,
      true
    );

    return;
  }

  buttons = data || [];
  renderButtonList();
}

function renderButtonList() {
  const list = $("buttonList");
  list.innerHTML = "";

  if (!buttons.length) {
    list.innerHTML =
      "<p>Nu există butoane.</p>";

    return;
  }

  buttons.forEach((buttonData) => {
    const row = document.createElement("div");
    row.className = "button-row";

    const label = document.createElement("span");
    label.textContent = buttonData.label;

    const actions = document.createElement("div");

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.className = "small-btn";

    editButton.addEventListener("click", () => {
      selectButton(buttonData.id);
    });

    const deleteButtonElement =
      document.createElement("button");

    deleteButtonElement.textContent = "Șterge";
    deleteButtonElement.className = "danger-btn";

    deleteButtonElement.addEventListener(
      "click",
      () => {
        deleteButton(buttonData.id);
      }
    );

    actions.appendChild(editButton);
    actions.appendChild(deleteButtonElement);

    row.appendChild(label);
    row.appendChild(actions);

    list.appendChild(row);
  });
}

async function addButton() {
  const label = prompt(
    "Textul butonului nou:"
  );

  if (!label?.trim()) {
    return;
  }

  const { data, error } = await db
    .from("main_buttons")
    .insert({
      label: label.trim(),
      position: buttons.length
    })
    .select("*")
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  await db
    .from("button_content")
    .upsert(
      {
        button_id: data.id,
        image_urls: [],
        custom_text: "",
        youtube_url: ""
      },
      {
        onConflict: "button_id"
      }
    );

  await loadButtons();
  await selectButton(data.id);
}

async function selectButton(id) {
  selectedButton = buttons.find(
    (button) => button.id === id
  );

  if (!selectedButton) {
    return;
  }

  const { data, error } = await db
    .from("button_content")
    .select("*")
    .eq("button_id", id)
    .maybeSingle();

  if (error) {
    showStatus(
      "editorStatus",
      error.message,
      true
    );

    return;
  }

  selectedContent = data || {
    button_id: id,
    image_urls: [],
    custom_text: "",
    youtube_url: ""
  };

  selectedContent.image_urls =
    normalizeImageUrls(
      selectedContent.image_urls
    );

  $("noSelectedText").classList.add("hidden");
  $("editor").classList.remove("hidden");

  $("buttonLabel").value =
    selectedButton.label || "";

  $("customText").value =
    selectedContent.custom_text || "";

  $("youtubeUrl").value =
    selectedContent.youtube_url || "";

  $("imageUrlInput").value = "";

  renderImages();
}

function addImageUrl() {
  if (!selectedButton || !selectedContent) {
    showStatus(
      "editorStatus",
      "Selectează mai întâi un buton.",
      true
    );

    return;
  }

  const imageUrl =
    $("imageUrlInput").value.trim();

  if (!imageUrl) {
    showStatus(
      "editorStatus",
      "Introdu linkul imaginii.",
      true
    );

    return;
  }

  if (!isValidSupabaseImageUrl(imageUrl)) {
    showStatus(
      "editorStatus",
      "Linkul trebuie să fie un URL public din Supabase Storage.",
      true
    );

    return;
  }

  selectedContent.image_urls =
    normalizeImageUrls(
      selectedContent.image_urls
    );

  if (
    selectedContent.image_urls.includes(
      imageUrl
    )
  ) {
    showStatus(
      "editorStatus",
      "Această imagine este deja adăugată.",
      true
    );

    return;
  }

  selectedContent.image_urls.push(imageUrl);

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

  const urls = normalizeImageUrls(
    selectedContent?.image_urls
  );

  if (!urls.length) {
    list.innerHTML =
      "<p>Nu există imagini adăugate.</p>";

    return;
  }

  urls.forEach((url, index) => {
    const item =
      document.createElement("div");

    item.className = "image-item";

    const image =
      document.createElement("img");

    image.src = url;
    image.alt = `Imagine ${index + 1}`;

    image.onerror = () => {
      image.alt = "Imagine indisponibilă";
      console.error(
        "Link imagine invalid:",
        url
      );
    };

    const removeButton =
      document.createElement("button");

    removeButton.textContent =
      "Șterge imaginea";

    removeButton.addEventListener(
      "click",
      () => {
        selectedContent.image_urls.splice(
          index,
          1
        );

        renderImages();
      }
    );

    item.appendChild(image);
    item.appendChild(removeButton);

    list.appendChild(item);
  });
}

async function saveCurrentContent(
  showMessage = true
) {
  if (!selectedButton || !selectedContent) {
    return;
  }

  const label =
    $("buttonLabel").value.trim() ||
    "Buton fără titlu";

  const { error: buttonError } = await db
    .from("main_buttons")
    .update({
      label,
      updated_at: new Date().toISOString()
    })
    .eq("id", selectedButton.id);

  if (buttonError) {
    showStatus(
      "editorStatus",
      buttonError.message,
      true
    );

    return;
  }

  const { data, error } = await db
    .from("button_content")
    .upsert(
      {
        button_id: selectedButton.id,

        image_urls: normalizeImageUrls(
          selectedContent.image_urls
        ),

        custom_text:
          $("customText").value || "",

        youtube_url:
          $("youtubeUrl").value.trim(),

        updated_at:
          new Date().toISOString()
      },
      {
        onConflict: "button_id"
      }
    )
    .select("*")
    .single();

  if (error) {
    showStatus(
      "editorStatus",
      error.message,
      true
    );

    return;
  }

  selectedContent = data;
  selectedContent.image_urls =
    normalizeImageUrls(data.image_urls);

  await loadButtons();

  if (showMessage) {
    showStatus(
      "editorStatus",
      "Butonul, imaginile și textul au fost salvate."
    );
  }
}

async function deleteButton(id) {
  if (
    !confirm(
      "Sigur ștergi acest buton?"
    )
  ) {
    return;
  }

  const { error } = await db
    .from("main_buttons")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  selectedButton = null;
  selectedContent = null;

  $("editor")?.classList.add("hidden");
  $("noSelectedText")?.classList.remove(
    "hidden"
  );

  await loadButtons();
}

function normalizeImageUrls(value) {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (!value) {
    return [];
  }

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
        .map((url) =>
          url
            .trim()
            .replace(/^"|"$/g, "")
        )
        .filter(Boolean);
    }
  }

  return [];
}

function isValidSupabaseImageUrl(url) {
  try {
    const parsed = new URL(url);

    return (
      parsed.protocol === "https:" &&
      parsed.hostname.endsWith(
        ".supabase.co"
      ) &&
      parsed.pathname.includes(
        "/storage/v1/object/public/"
      )
    );
  } catch {
    return false;
  }
}

function showStatus(
  id,
  message,
  isError = false
) {
  const element = $(id);

  if (!element) {
    return;
  }

  element.textContent = message;
  element.classList.toggle(
    "error",
    isError
  );
}