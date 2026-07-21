import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const BUCKET_NAME =
  process.env.SUPABASE_BUCKET || "site-images";

const LOCAL_FOLDER =
  process.env.LOCAL_IMAGES_FOLDER || "images";

const BUCKET_FOLDER =
  process.env.SUPABASE_BUCKET_FOLDER || "git-images";

if (!SUPABASE_URL) {
  throw new Error("Lipsește variabila SUPABASE_URL.");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Lipsește variabila SUPABASE_SERVICE_ROLE_KEY."
  );
}

if (!fs.existsSync(LOCAL_FOLDER)) {
  throw new Error(
    `Folderul local "${LOCAL_FOLDER}" nu există.`
  );
}

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

const IMAGE_EXTENSIONS = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif",
  ".svg",
  ".avif"
]);

function getContentType(filePath) {
  const extension =
    path.extname(filePath).toLowerCase();

  const contentTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".svg": "image/svg+xml",
    ".avif": "image/avif"
  };

  return (
    contentTypes[extension] ||
    "application/octet-stream"
  );
}

function getAllFiles(directory) {
  const entries = fs.readdirSync(directory, {
    withFileTypes: true
  });

  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(
      directory,
      entry.name
    );

    if (entry.isDirectory()) {
      files.push(...getAllFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeStoragePath(filePath) {
  const relativePath = path.relative(
    LOCAL_FOLDER,
    filePath
  );

  // Supabase Storage folosește slash-uri normale,
  // inclusiv când workflow-ul rulează pe Windows.
  const normalizedRelativePath =
    relativePath.split(path.sep).join("/");

  return `${BUCKET_FOLDER}/${normalizedRelativePath}`;
}

async function uploadImage(filePath) {
  const extension =
    path.extname(filePath).toLowerCase();

  if (!IMAGE_EXTENSIONS.has(extension)) {
    console.log(
      `Ignorat, nu este imagine: ${filePath}`
    );

    return {
      status: "skipped",
      filePath
    };
  }

  const storagePath =
    normalizeStoragePath(filePath);

  const fileBuffer =
    fs.readFileSync(filePath);

  console.log(
    `Se încarcă: ${filePath} -> ${storagePath}`
  );

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, fileBuffer, {
      contentType: getContentType(filePath),
      upsert: true,
      cacheControl: "3600"
    });

  if (error) {
    throw new Error(
      `Upload eșuat pentru ${filePath}: ${error.message}`
    );
  }

  const {
    data: { publicUrl }
  } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(storagePath);

  console.log(`Încărcat: ${publicUrl}`);

  return {
    status: "uploaded",
    filePath,
    storagePath,
    publicUrl
  };
}

async function main() {
  const allFiles =
    getAllFiles(LOCAL_FOLDER);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const filePath of allFiles) {
    try {
      const result =
        await uploadImage(filePath);

      if (result.status === "uploaded") {
        uploaded++;
      } else {
        skipped++;
      }
    } catch (error) {
      failed++;

      console.error(error.message);
    }
  }

  console.log("");
  console.log("Sincronizare terminată:");
  console.log(`Încărcate: ${uploaded}`);
  console.log(`Ignorate: ${skipped}`);
  console.log(`Eșuate: ${failed}`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});