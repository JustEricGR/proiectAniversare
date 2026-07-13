const db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const $ = (id) => document.getElementById(id);

$('loginBtn').addEventListener('click', login);
$('password').addEventListener('keydown', (event) => {
  if (event.key === 'Enter') login();
});

async function login() {
  $('message').textContent = '';

  const email = $('email').value.trim();
  const password = $('password').value;

  if (!email || !password) {
    $('message').textContent = 'Completează emailul și parola.';
    return;
  }

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    $('message').textContent = error.message;
    console.error(error);
    return;
  }

  window.location.href = 'admin.html';
}
