const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

let buttons = [];
let contents = [];

window.addEventListener('load', loadClient);
$('enterMenuBtn').addEventListener('click', showMenu);
$('backHomeBtn').addEventListener('click', showMenu);

async function loadClient() {
  await loadSettings();
  await loadMenu();
}

async function loadSettings() {
  const { data, error } = await db
    .from('site_settings')
    .select('*')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    console.error(error);
    return;
  }

  if (!data) return;

  $('clientTitle').textContent = data.client_title || 'Bine ai venit!';
  $('enterMenuBtn').textContent = data.client_button_text || 'Intră în meniu';

  if (data.background_image_url) {
    $('clientBody').style.backgroundImage = `url('${data.background_image_url}')`;
  }
}

async function loadMenu() {
  const btnReq = await db
    .from('main_buttons')
    .select('*')
    .order('position', { ascending: true });

  const contentReq = await db.from('button_content').select('*');

  if (btnReq.error) {
    console.error(btnReq.error);
    return;
  }

  if (contentReq.error) {
    console.error(contentReq.error);
    return;
  }

  buttons = btnReq.data || [];
  contents = contentReq.data || [];
  renderMenu();
}

function renderMenu() {
  const box = $('menuButtons');
  box.innerHTML = '';

  if (!buttons.length) {
    box.innerHTML = '<p>Momentan nu există butoane configurate.</p>';
    return;
  }

  buttons.forEach((btn) => {
    const button = document.createElement('button');
    button.className = 'menu-button';
    button.textContent = btn.label;
    button.addEventListener('click', () => showContent(btn));
    box.appendChild(button);
  });
}

function showMenu() {
  $('startScreen').classList.add('hidden');
  $('contentScreen').classList.add('hidden');
  $('menuScreen').classList.remove('hidden');
  $('backHomeBox').classList.add('hidden');
}

function showContent(btn) {
  const content = contents.find((c) => c.button_id === btn.id) || {};

  $('menuScreen').classList.add('hidden');
  $('contentScreen').classList.remove('hidden');
  $('backHomeBox').classList.remove('hidden');

  $('contentTitle').textContent = btn.label;

  const imagesContainer = $('imagesContainer');
imagesContainer.innerHTML = '';

const imageUrls = Array.isArray(content.image_urls)
  ? content.image_urls
  : [];

imageUrls.forEach((url, index) => {
  if (!url) return;

  const imageWrapper = document.createElement('div');
  imageWrapper.className = 'content-image-wrapper';

  const img = document.createElement('img');
  img.src = url;
  img.alt = `${btn.label} - imaginea ${index + 1}`;
  img.className = 'content-image';
  img.loading = 'lazy';

  img.onerror = () => {
    console.error('Imaginea nu a putut fi încărcată:', url);
    imageWrapper.remove();
  };

  imageWrapper.appendChild(img);
  imagesContainer.appendChild(imageWrapper);
});

  const textContainer = $('textContainer');
  textContainer.innerHTML = '';
  if (content.custom_text) {
    const p = document.createElement('p');
    p.className = 'custom-text';
    p.textContent = content.custom_text;
    textContainer.appendChild(p);
  }

  const youtubeContainer = $('youtubeContainer');
youtubeContainer.innerHTML = '';

const embedUrl = getYoutubeEmbedUrl(content.youtube_url);

if (embedUrl) {
  const playerBox = document.createElement('div');
  playerBox.className = 'compact-youtube-player';

  const iframe = document.createElement('iframe');

  const separator = embedUrl.includes('?') ? '&' : '?';

  iframe.src =
    `${embedUrl}${separator}` +
    `controls=1&rel=0&modestbranding=1&playsinline=1`;

  iframe.title = 'Player YouTube';
  iframe.allow =
    'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';

  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';

  playerBox.appendChild(iframe);
  youtubeContainer.appendChild(playerBox);
}
}

function getYoutubeEmbedUrl(url) {
  if (!url) return '';

  try {
    const parsed = new URL(url.trim());
    let videoId = '';

    const hostname = parsed.hostname
      .replace('www.', '')
      .replace('m.', '');

    if (hostname === 'youtube.com') {
      if (parsed.pathname === '/watch') {
        videoId = parsed.searchParams.get('v') || '';
      } else if (parsed.pathname.startsWith('/shorts/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/embed/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      } else if (parsed.pathname.startsWith('/live/')) {
        videoId = parsed.pathname.split('/')[2] || '';
      }
    }

    if (hostname === 'youtu.be') {
      videoId = parsed.pathname.split('/')[1] || '';
    }

    videoId = videoId.split('?')[0].split('&')[0];

    if (!videoId) return '';

    return `https://www.youtube.com/embed/${videoId}`;
  } catch (error) {
    console.error('Link YouTube invalid:', url, error);
    return '';
  }
}
