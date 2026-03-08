import express from "express";
import cors from "cors";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";
import nodemailer from "nodemailer";
import multer from "multer";
import OpenAI, { toFile } from "openai";
import sharp from "sharp";
import { GoogleGenerativeAI } from "@google/generative-ai";

const require = createRequire(import.meta.url);
require("dotenv").config();
const sizeOf = require("image-size");
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
app.use((req, res, next) => {
  if (req.url.includes("gumroad")) {
    console.log(
      ">>> [GLOBAL DETECTOR] Gumroad Request detected!",
      req.method,
      req.url,
    );
  }
  next();
});
const PORT = process.env.PORT || 3000;
const SUCCESS_URL = "https://www.setupaura.online/";
const PRICING_URL = "https://www.setupaura.online/pricing";
const FRONTEND_URL = (
  process.env.FRONTEND_URL ||
  process.env.FRONTEND_BASE_URL ||
  SUCCESS_URL
).replace(/\/+$/, "");

const otpStore = new Map();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmailAddress = (email = "") => {
  const normalized = String(email || "").trim().toLowerCase();
  const atIndex = normalized.lastIndexOf("@");
  if (atIndex <= 0) return normalized;

  const localPart = normalized.slice(0, atIndex);
  const domainPart = normalized.slice(atIndex + 1);

  if (domainPart === "gmail.com" || domainPart === "googlemail.com") {
    return `${localPart.replace(/\+.*/, "")}@${domainPart}`;
  }

  return normalized;
};
const POSTHOG_KEY =
  process.env.POSTHOG_API_KEY || process.env.VITE_PUBLIC_POSTHOG_KEY || "";
const POSTHOG_HOST = (
  process.env.POSTHOG_HOST ||
  process.env.VITE_PUBLIC_POSTHOG_HOST ||
  "https://us.i.posthog.com"
).replace(/\/+$/, "");
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: "TOO_MANY_REQUESTS", message: "Please slow down." },
});

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
      if (now > entry.expires) otpStore.delete(key);
    }
  },
  5 * 60 * 1000,
);

// --- 24-Hour Follow-Up Email Cron ---
setInterval(async () => {
  try {
    const leads = readLeads();
    let updated = false;
    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      // Check if free user, older than 24 hours, and hasn't received follow-up yet
      if (!lead.premium && !lead.followUpSent && lead.timestamp) {
        const leadTime = new Date(lead.timestamp).getTime();
        if (now - leadTime >= TWENTY_FOUR_HOURS) {
          // Send the email
          const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0d0d0d;color:#fff;padding:28px;border-radius:14px;border:1px solid #3b0764;">
            <h2 style="color:#a855f7;margin-top:0;">Your Room Misses You! 🎮</h2>
            <p style="color:#ccc;">Hey there, we noticed you generated your room design but haven't unlocked your 10 additional premium designs and exact-match shopping list yet.</p>
            <p style="color:#ccc;">Just a quick reminder: our <strong>Launch Sale</strong> is currently active, meaning you can still unlock the full experience at the discounted price you saw on the site!</p>
            <div style="margin:24px 0;text-align:center;">
                <a href="https://www.setupaura.online/pricing" style="display:inline-block;padding:14px 28px;background:linear-gradient(to right, #7c3aed, #2563eb);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;">Get 10 New Designs</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;">Happy gaming,<br/>The SetupAura AI Team</p>
        </div>`;
          await transporter
            .sendMail({
              from: '"SetupAura AI" <support@setupaura.online>',
              to: lead.email,
              subject: "Your Shopping List & Premium Designs Are Waiting 🎁",
              html: emailHtml,
            })
            .catch((err) =>
              console.error("[Follow-Up Email Failed]", lead.email, err.message),
            );
          // Mark as sent so we don't spam them
          lead.followUpSent = true;
          updated = true;
          console.log(`[Follow-Up] Sent 24h email to ${lead.email}`);
        }
      }
    }
    // Save only if changes were made
    if (updated) {
      fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
    }
  } catch (err) {
    console.error("[CRON_ERROR] Follow-up task failed:", err.message);
  }
}, 60 * 60 * 1000); // Runs every 1 hour

app.use(
  cors({
    origin: [
      "https://setupaura.online",
      "https://www.setupaura.online",
      "http://localhost:5173",
    ],
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ limit: "1mb", extended: true }));

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
const IMAGES_DIR = path.join(UPLOADS_DIR, "images");
const METADATA_DIR = path.join(UPLOADS_DIR, "metadata");
const ensureUploadDirs = () => {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
  fs.mkdirSync(METADATA_DIR, { recursive: true });
};
ensureUploadDirs();
app.use("/uploads", express.static(UPLOADS_DIR));

const uploadStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDirs();
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
    cb(null, `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});
const upload = multer({ storage: uploadStorage });
const leadsPath = path.join(__dirname, "leads.json");
const WATERMARK_LOGO_PATH = path.join(__dirname, "public", "logo.svg");
const ADMIN_EMAIL = "liorma6@gmail.com";
const shoppingListGenerationLocks = new Map();

const readLeads = () => {
  try {
    if (!fs.existsSync(leadsPath)) {
      fs.writeFileSync(leadsPath, "[]");
      return [];
    }
    const raw = fs.readFileSync(leadsPath, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLead = (email) => {
  try {
    const normalizedEmail = normalizeEmailAddress(email);
    const leads = readLeads();
    const existingEmails = leads
      .map((entry) =>
        typeof entry === "string"
          ? normalizeEmailAddress(entry)
          : normalizeEmailAddress(entry?.email || ""),
      )
      .filter(Boolean);
    if (existingEmails.includes(normalizedEmail)) return;
    const newLead = {
      email: normalizedEmail,
      timestamp: new Date().toISOString(),
      premium: false,
      tokensRemaining: 0,
      testMode: false,
    };
    leads.push(newLead);
    fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
    console.log(`[Lead] Saved: ${email}`);
  } catch (err) {
    console.error("[LEAD_SAVE_ERROR]", err.message);
  }
};

const getLeadIndexByEmail = (leads, email) =>
  leads.findIndex(
    (entry) =>
      entry &&
      entry.email &&
      normalizeEmailAddress(entry.email) === normalizeEmailAddress(email),
  );

const upsertLeadRecord = (email, updates = {}) => {
  const leads = readLeads();
  const normalizedEmail = normalizeEmailAddress(email);
  const index = getLeadIndexByEmail(leads, normalizedEmail);
  const base = {
    email: normalizedEmail,
    timestamp: new Date().toISOString(),
    premium: false,
    tokensRemaining: 1,
    testMode: false,
  };
  const next =
    index >= 0
      ? { ...base, ...leads[index], ...updates, email: base.email }
      : { ...base, ...updates };
  if (index >= 0) {
    leads[index] = next;
  } else {
    leads.push(next);
  }
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));
  return next;
};

const getUserRecord = (email) => {
  const normalized = normalizeEmailAddress(email);
  return readLeads().find(
    (entry) =>
      entry && entry.email && normalizeEmailAddress(entry.email) === normalized,
  );
};

const trackPosthogEvent = async (event, properties = {}) => {
  if (!POSTHOG_KEY) return;
  const distinctId =
    String(properties.email || properties.distinct_id || "server").trim() ||
    "server";
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        event,
        distinct_id: distinctId,
        properties: {
          ...properties,
          distinct_id: distinctId,
        },
      }),
    });
  } catch {}
};

const buildFrontendUrl = (targetPath = "/", query = {}) => {
  const pathValue = String(targetPath || "/").trim();
  const normalizedPath = pathValue.startsWith("/")
    ? pathValue
    : `/${pathValue}`;
  const params = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  });
  const queryString = params.toString();
  return `${FRONTEND_URL}${normalizedPath}${queryString ? `?${queryString}` : ""}`;
};

const transporter = nodemailer.createTransport({
  host: "smtp.resend.com",
  port: 465,
  secure: true,
  auth: {
    user: "resend",
    pass: process.env.EMAIL_PASS,
  },
});

transporter
  .verify()
  .catch((err) =>
    console.error("[SMTP] Connection verify failed:", err.message),
  );

const detectMimeType = (source = "") => {
  const lower = source.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
};

const extractJsonArray = (text = "") => {
  const trimmed = String(text || "").trim();
  const stripped = trimmed
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(stripped);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return parsed;
  } catch {}

  const codeBlock = stripped.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlock?.[1]) {
    try {
      const parsed = JSON.parse(codeBlock[1]);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  const start = stripped.indexOf("[");
  const end = stripped.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    const candidate = stripped.slice(start, end + 1);
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }

  return null;
};

const normalizeShoppingList = (items) => {
  if (!Array.isArray(items)) return [];

  return items
    .slice(0, 5)
    .map((item, index) => {
      const rawName = String(item?.name || "").trim();
      if (!rawName) return null;
      const rawBuyLink = String(item?.url || item?.buyLink || "").trim();
      const hasValidHttpLink =
        rawBuyLink.startsWith("http://") || rawBuyLink.startsWith("https://");
      const rawPrice = String(
        item?.price || item?.estimatedPrice || "Price varies",
      ).trim();

      return {
        id: String(item?.id || `item-${index + 1}`),
        name: rawName,
        description:
          String(item?.description || "").trim() ||
          `${rawName} for a themed gaming room setup`,
        estimatedPrice: rawPrice || "Price varies",
        buyLink: hasValidHttpLink ? rawBuyLink : "",
      };
    })
    .filter((item) => item?.buyLink)
    .filter(Boolean);
};

const buildLockedShoppingList = () => [
  {
    id: "item-1",
    name: "Premium RGB Accent Lighting",
    description: "Full details are locked until upgrade",
    estimatedPrice: "Locked",
    buyLink: PRICING_URL,
  },
  {
    id: "item-2",
    name: "Ergonomic Gaming Chair",
    description: "Full details are locked until upgrade",
    estimatedPrice: "Locked",
    buyLink: PRICING_URL,
  },
  {
    id: "item-3",
    name: "Mechanical Keyboard",
    description: "Full details are locked until upgrade",
    estimatedPrice: "Locked",
    buyLink: PRICING_URL,
  },
  {
    id: "item-4",
    name: "Themed Collector Decor",
    description: "Full details are locked until upgrade",
    estimatedPrice: "Locked",
    buyLink: PRICING_URL,
  },
];

const renderShoppingListHtml = (items, unlocked) => {
  const list = Array.isArray(items) ? items : [];
  return `
        <div style="margin-top:20px;border:1px solid ${unlocked ? "#1f2937" : "#4b5563"};border-radius:12px;padding:16px;background:${unlocked ? "#0b1220" : "#151515"};">
            <h3 style="margin:0 0 12px 0;color:${unlocked ? "#93c5fd" : "#e5e7eb"};font-size:16px;">${unlocked ? "Exact-Match Shopping List" : "Shopping List Preview"}</h3>
            ${list
              .map(
                (item) => `
                <div style="padding:10px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
                    <div style="display:flex;justify-content:space-between;gap:10px;">
                        <strong style="color:#f9fafb;font-size:14px;">${item.name}</strong>
                        <span style="color:${unlocked ? "#86efac" : "#fca5a5"};font-size:12px;font-weight:700;white-space:nowrap;">${item.estimatedPrice}</span>
                    </div>
                    <p style="margin:6px 0 0 0;color:#cbd5e1;font-size:12px;line-height:1.5;">${item.description}</p>
                    <a href="${item.buyLink}" style="display:inline-block;margin-top:8px;color:#67e8f9;font-size:12px;font-weight:700;text-decoration:none;">${unlocked ? "View item" : "Unlock to view item link"}</a>
                </div>
            `,
              )
              .join("")}
        </div>
    `;
};

const getImageInputForGemini = async ({ image, imageUrl }) => {
  if (image && typeof image === "string") {
    const hasPrefix = image.includes(";base64,");
    const base64Data = hasPrefix ? image.split(";base64,").pop() : image;
    const mimeTypeMatch = hasPrefix
      ? image.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)
      : null;
    const mimeType = mimeTypeMatch?.[1] || "image/png";
    return { mimeType, data: base64Data };
  }

  if (!imageUrl || typeof imageUrl !== "string") {
    throw new Error("Image input is required");
  }

  const resolveUploadsPath = (inputPath = "") => {
    const relative = String(inputPath || "")
      .replace(/^\/+/, "")
      .trim();
    return path.join(process.cwd(), relative);
  };

  if (imageUrl.startsWith("/uploads/")) {
    const localPath = resolveUploadsPath(imageUrl);
    const fileBuffer = await fs.promises.readFile(localPath);
    return {
      mimeType: detectMimeType(localPath),
      data: fileBuffer.toString("base64"),
    };
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const urlObj = new URL(imageUrl);
    if (urlObj.pathname.startsWith("/uploads/")) {
      const localPath = resolveUploadsPath(urlObj.pathname);
      if (fs.existsSync(localPath)) {
        const fileBuffer = await fs.promises.readFile(localPath);
        return {
          mimeType: detectMimeType(localPath),
          data: fileBuffer.toString("base64"),
        };
      }
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error("Failed to download image");
    }
    const contentType =
      response.headers.get("content-type") || detectMimeType(imageUrl);
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      mimeType: contentType.split(";")[0],
      data: buffer.toString("base64"),
    };
  }

  throw new Error("Unsupported imageUrl format");
};

const SHARED_THEME_CONFIG = {
  MODERN_GAMING: {
    label: "professional designer gaming sanctuary, high-end interior photography",
    heroItems: [
      "Premium LED wall panels (Nanoleaf style) with realistic soft-glow diffusion",
      "High-end dual-monitor setup with clean aesthetic and matching peripherals",
      "Architectural acoustic panels and designer furniture from stores like IKEA or Secretlab",
    ],
    criticalRequirements: [
      "Cinematic but realistic lighting: soft purple/blue ambient glow with clear light sources",
      "Clean, organized surfaces with realistic high-end tech items",
      "Natural textures: high-quality fabric, wood-grain desks, and matte finishes",
      "Keep the original room's window and wall placement but upgrade the materials",
    ],
  },
  ANIME: {
    label: "vibrant anime and manga inspired otaku sanctuary",
    heroItems: [
      "Luffy Gear 5 Nendoroid (Shelf-size)",
      "Zoro Katana Wall Mount",
      "Stack of One Piece Manga Volumes",
    ],
    criticalRequirements: [
      "curated anime decor that feels premium and cohesive",
      "stylish illuminated display shelving for figures and collectibles",
      "bold but tasteful color accents inspired by anime aesthetics",
      "high-end gaming setup integrated naturally into the room",
    ],
  },
  HEAVY_METAL: {
    label: "dark industrial heavy metal music and gaming den",
    heroItems: [
      "Marshall Amp Stack",
      "Electric Guitar Wall Mount",
      "Metallica Framed Poster",
    ],
    criticalRequirements: [
      "moody cinematic lighting with deep shadows and metallic highlights",
      "industrial textures such as concrete, steel, or distressed wood",
      "music studio elements blended with a premium gaming station",
      "strong heavy-metal identity without clutter or visual noise",
    ],
  },
  RETRO_ARCADE: {
    label: "80s retro arcade neon-lit gaming paradise",
    heroItems: [
      "Arcade1Up Pac-Man Counter-top",
      "Neon Ghost Sign",
      "Retro SNES Console",
    ],
    criticalRequirements: [
      "authentic 80s arcade atmosphere with colorful neon lighting",
      "retro gaming props and decor placed in realistic scale",
      "vintage-inspired color palette with clean composition",
      "premium modern gaming desk setup fused with nostalgic style",
    ],
  },
  FANTASY_RPG: {
    label: "medieval fantasy RPG tavern style gaming study",
    heroItems: [
      "Dragon Head Bookend",
      "Replica Witcher Silver Sword",
      "Framed Middle-earth Map",
    ],
    criticalRequirements: [
      "medieval tavern-inspired materials like dark wood and wrought iron",
      "fantasy artifacts and props arranged with museum-like taste",
      "warm atmospheric lighting reminiscent of torches and candlelight",
      "high-end gaming command area that still matches fantasy aesthetics",
    ],
  },
  SCI_FI: {
    label: "futuristic high-tech sci-fi spaceship command center",
    heroItems: [
      "Holographic LED Fan Display",
      "Vertical GPU Showcase",
      "NASA-punk Desk Mat",
    ],
    criticalRequirements: [
      "clean futuristic architecture with smooth high-tech surfaces",
      "layered sci-fi lighting with cyan, blue, and white accents",
      "advanced command-center style workstation layout",
      "minimalist precision with realistic premium interior photography",
    ],
  },
};

const resolveThemeConfig = (selectedTheme = "") => {
  const normalized = String(selectedTheme || "")
    .trim()
    .toUpperCase();
  if (normalized.includes("ANIME")) return SHARED_THEME_CONFIG.ANIME;
  if (normalized.includes("HEAVY METAL") || normalized === "METAL")
    return SHARED_THEME_CONFIG.HEAVY_METAL;
  if (normalized.includes("RETRO ARCADE"))
    return SHARED_THEME_CONFIG.RETRO_ARCADE;
  if (normalized.includes("FANTASY RPG"))
    return SHARED_THEME_CONFIG.FANTASY_RPG;
  if (normalized.includes("SCI-FI")) return SHARED_THEME_CONFIG.SCI_FI;
  return SHARED_THEME_CONFIG.MODERN_GAMING;
};

const analyzeRoomWithGemini = async ({ mimeType, data, selectedTheme }) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("Missing Gemini API key");
  }

  const genAI = new GoogleGenerativeAI(geminiKey);
  const modelName = "gemini-2.5-flash";
  console.log(`Using model: ${modelName}`);
  const model = genAI.getGenerativeModel({ model: modelName });

  const config = resolveThemeConfig(selectedTheme);
  const [item1, item2, item3] = config.heroItems;
  const prompt = `Analyze this realistic ${config.label} gaming room. Identify the 3 hero items: ${item1}, ${item2}, and ${item3}, plus 2 other professional peripherals. You MUST include a product entry named Premium Gaming Chair with a matching aesthetic and a shopping link. Do NOT attempt to generate exact product URLs or ASINs, as this causes broken 404 links. Instead, for the 'url' or 'buyLink' field, you MUST generate a highly specific Amazon search URL using the exact brand and product model. Format it exactly like this: 'https://www.amazon.com/s?k=exact+brand+and+specific+product+name'. Ensure the search query words are highly specific and separated by '+' so the exact item appears as the first result. You MUST return the response strictly as a valid JSON array of objects. Each object must have 'name', 'description', 'price', and 'url'. Do not include markdown code blocks or any other text outside the JSON array.`;

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }, { inlineData: { mimeType, data } }],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const rawText = result.response.text();
  let parsed = null;
  try {
    parsed = extractJsonArray(rawText);
  } catch {
    parsed = null;
  }
  if (!parsed) {
    throw new Error("INVALID_GEMINI_RESPONSE");
  }

  const shoppingList = normalizeShoppingList(parsed);
  if (!shoppingList.length) {
    throw new Error("EMPTY_SHOPPING_LIST");
  }

  return shoppingList;
};

const ensureShoppingListForResult = async ({
  resultId,
  metadataFilePath,
  generatedImageUrl,
}) => {
  if (!resultId || !metadataFilePath) return;
  if (shoppingListGenerationLocks.has(resultId)) {
    return shoppingListGenerationLocks.get(resultId);
  }

  const task = (async () => {
    try {
      const raw = await fs.promises.readFile(metadataFilePath, "utf8");
      const parsed = JSON.parse(raw);
      const existingList = Array.isArray(parsed?.shoppingList)
        ? normalizeShoppingList(parsed.shoppingList)
        : [];
      const currentStatus = String(
        parsed?.shoppingListStatus || "",
      ).toLowerCase();

      if (existingList.length > 0 || currentStatus !== "pending") {
        return;
      }

      try {
        const { mimeType, data } = await getImageInputForGemini({
          imageUrl: parsed?.generatedImageUrl || generatedImageUrl,
        });
        const generatedList = await analyzeRoomWithGemini({
          mimeType,
          data,
          selectedTheme: parsed?.theme || "MODERN GAMING (RGB)",
        });
        parsed.shoppingList = generatedList;
        parsed.shoppingListStatus =
          generatedList.length > 0 ? "ready" : "failed";
      } catch (regenErr) {
        console.error("[RESULT_SHOPPING_REGEN_ERROR]", regenErr.message);
        parsed.shoppingList = existingList;
        parsed.shoppingListStatus = "failed";
      }

      parsed.shoppingListUpdatedAt = new Date().toISOString();
      await fs.promises.writeFile(
        metadataFilePath,
        JSON.stringify(parsed, null, 2),
      );
    } catch (err) {
      console.error("[RESULT_SHOPPING_REGEN_READ_ERROR]", err.message);
    }
  })().finally(() => {
    shoppingListGenerationLocks.delete(resultId);
  });

  shoppingListGenerationLocks.set(resultId, task);
  return task;
};

const applyWatermarkForFreeUser = async (imageBuffer) => {
  const metadata = await sharp(imageBuffer).metadata();
  const baseWidth = Math.max(metadata.width || 1024, 1);
  const watermarkWidth = Math.max(Math.round(baseWidth * 0.16), 96);
  const logoBuffer = fs.readFileSync(WATERMARK_LOGO_PATH);
  const watermarkBuffer = await sharp(logoBuffer)
    .resize({ width: watermarkWidth, fit: "contain" })
    .ensureAlpha(0.35)
    .png()
    .toBuffer();

  return sharp(imageBuffer)
    .composite([{ input: watermarkBuffer, gravity: "southeast" }])
    .jpeg({ quality: 92 })
    .toBuffer();
};

app.post(
  "/api/generate-design",
  apiLimiter,
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      return upload.single("image")(req, res, next);
    }
    return next();
  },
  async (req, res) => {
    const { image, email, theme } = req.body || {};

    if (!image && !req.file)
      return res.status(400).json({ error: "No image provided" });
    if (!email || email.trim() === "")
      return res.status(400).json({ error: "Email required" });

    const token = process.env.OPENAI_API_KEY || process.env.OpenAi_TOKEN;
    if (!token)
      return res.status(500).json({ error: "Missing OpenAI API Key" });

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const existingLead = getUserRecord(email.trim());
      const hasUnlockedAccess = Boolean(existingLead?.premium);

      if (!existingLead) {
        return res.status(403).json({
          error: "OUT_OF_TOKENS",
          message: "Out of tokens",
          paywall: true,
        });
      }
      const currentTokens = Math.max(
        0,
        Number(existingLead?.tokensRemaining ?? 0),
      );
      if (currentTokens <= 0) {
        return res.status(403).json({
          error: "OUT_OF_TOKENS",
          message: "Out of tokens",
          paywall: true,
        });
      }

      let imageBuffer;
      let inputFilename = "input.jpg";
      let inputMimeType = "image/jpeg";
      let originalImageUrl = "";
      let inputWidth = 0;
      let inputHeight = 0;

      if (req.file?.path) {
        imageBuffer = fs.readFileSync(req.file.path);
        inputFilename = req.file.originalname || path.basename(req.file.path);
        inputMimeType =
          req.file.mimetype || detectMimeType(req.file.originalname || "");
        originalImageUrl = `https://${req.get("host")}/uploads/${path.basename(req.file.path)}`;
        try {
          const dimensions = sizeOf(req.file.path);
          inputWidth = Number(dimensions?.width) || 0;
          inputHeight = Number(dimensions?.height) || 0;
        } catch {}
      } else {
        const imageString = String(image || "");
        const hasPrefix = imageString.includes(";base64,");
        const base64Data = hasPrefix
          ? imageString.split(";base64,").pop()
          : imageString;
        const mimeTypeMatch = hasPrefix
          ? imageString.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/)
          : null;
        inputMimeType = mimeTypeMatch?.[1] || "image/jpeg";
        imageBuffer = Buffer.from(base64Data, "base64");
        const extFromMime = inputMimeType.split("/")[1] || "jpg";
        inputFilename = `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}.${extFromMime}`;
        ensureUploadDirs();
        fs.writeFileSync(path.join(UPLOADS_DIR, inputFilename), imageBuffer);
        originalImageUrl = `https://${req.get("host")}/uploads/${inputFilename}`;
      }

      if (!inputWidth || !inputHeight) {
        try {
          const metadata = await sharp(imageBuffer).metadata();
          inputWidth = Number(metadata?.width) || 0;
          inputHeight = Number(metadata?.height) || 0;
        } catch {}
      }
      const size =
        inputWidth > 0 && inputHeight > 0
          ? inputHeight > inputWidth
            ? "1024x1536"
            : inputWidth > inputHeight
              ? "1536x1024"
              : "1024x1024"
          : "1536x1024";

      const base64Data = imageBuffer.toString("base64");
      const imageFile = await toFile(imageBuffer, inputFilename, {
        type: inputMimeType,
      });

      const openai = new OpenAI({ apiKey: token });

      let isValidRoom = true;
      try {
        const visionCheck = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: "Analyze this image. Is it a picture of a room, desk, computer setup, office space, bedroom, or living space? Reply ONLY with the single word TRUE or FALSE.",
                },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${inputMimeType};base64,${base64Data}`,
                    detail: "low",
                  },
                },
              ],
            },
          ],
          max_tokens: 5,
        });
        isValidRoom = visionCheck.choices[0]?.message?.content
          ?.trim()
          .toUpperCase()
          .startsWith("TRUE");
      } catch (visionErr) {
        console.error("[Vision] API error:", visionErr.message);
        return res.status(500).json({
          error: "VISION_API_ERROR",
          message: "Image analysis failed.",
        });
      }

      if (!isValidRoom) {
        console.log(`[Validation] Invalid image rejected for: ${email}`);
        return res.status(400).json({
          error: "INVALID_IMAGE",
          message: "Please upload a picture of a room.",
        });
      }

      const activeTheme = (theme || "MODERN GAMING (RGB)").trim();
      console.log(`[OpenAI] theme: ${activeTheme} | email: ${email}`);
      const themeConfig = resolveThemeConfig(activeTheme);
      const enhancedPrompt = `Photorealistic interior DESIGNER EDIT of the same room. (NOT CGI, NOT a render).
PRESERVE:
Keep the exact room structure, windows, and ceiling height.
Maintain the camera angle and perspective perfectly.
TRANSFORMATION GOAL:
Turn this into a 'Dream Gaming Room' that looks 100% buildable in real life.
LIGHTING: Add realistic RGB accent lighting (behind desk, behind monitors, or on one feature wall). Use soft, indirect glow that bounces off surfaces naturally. No glowing air or fog.
FURNITURE: Replace current furniture with high-end, purchasable gaming gear (Secretlab-style chair, clean wide desk).
WALLS: Upgrade the walls with professional textures (dark paint, acoustic panels, or clean shelves) while keeping the same layout.
QUALITY: shot on 35mm lens, f/2.8, professional lighting, highly detailed textures.
ABSOLUTELY NO: floating lights, futuristic sci-fi props, black bars, or cartoonish colors. It must look like a real photo of a professional room makeover.`;

      const TIMEOUT_MS = 90000;
      let aiResponse;
      try {
        aiResponse = await Promise.race([
          (async () => {
            const formData = new FormData();
            formData.append("model", "gpt-image-1.5");
            formData.append("image", imageFile, inputFilename);
            formData.append("prompt", enhancedPrompt);
            formData.append("size", size);
            formData.append("quality", "high");
            formData.append("input_fidelity", "high");
            formData.append("output_format", "jpeg");
            formData.append("output_compression", "90");

            const response = await fetch(
              "https://api.openai.com/v1/images/edits",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                body: formData,
              },
            );
            const json = await response.json();
            if (!response.ok) {
              throw new Error(
                json?.error?.message || "OpenAI image edit failed",
              );
            }
            return json;
          })(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(new Error("OpenAI request timed out after 90 seconds")),
              TIMEOUT_MS,
            ),
          ),
        ]);
      } catch (imageErr) {
        console.error("[IMAGE_GENERATION_ERROR]", imageErr.message);
        return res.status(500).json({
          error: "IMAGE_GENERATION_FAILED",
          message: "Failed to generate image.",
        });
      }

      if (
        !aiResponse?.data ||
        !aiResponse?.data[0] ||
        !aiResponse?.data[0]?.b64_json
      ) {
        console.error(
          "[IMAGE_GENERATION_ERROR] No URL returned, possibly rejected by safety system.",
        );
        return res.status(400).json({
          error: "SAFETY_SYSTEM_REJECTED",
          message:
            "Your request was rejected by the safety system. Please try a different image.",
        });
      }

      const generatedBase64 = aiResponse.data[0].b64_json;
      const filename = `gen-${Date.now()}.jpg`;
      ensureUploadDirs();
      const filepath = path.join(IMAGES_DIR, filename);
      const generatedBuffer = Buffer.from(generatedBase64, "base64");
      const processedBuffer = await sharp(generatedBuffer)
        .resize(inputWidth || 1024, inputHeight || 1024, {
          fit: "cover",
          position: "centre",
        })
        .jpeg({ quality: 92 })
        .toBuffer();
      const finalGeneratedBuffer = hasUnlockedAccess
        ? processedBuffer
        : await applyWatermarkForFreeUser(processedBuffer);
      await fs.promises.writeFile(filepath, finalGeneratedBuffer);
      console.log(`[Saved] ${filepath}`);
      const imageUrl = `https://${req.get("host")}/uploads/images/${filename}`;

      const tokensRemaining = Math.max(0, currentTokens - 1);
      upsertLeadRecord(email.trim(), {
        premium: Boolean(existingLead?.premium),
        testMode: Boolean(existingLead?.testMode),
        tokensRemaining,
      });

      const redirectLink = buildFrontendUrl("/result", { id: filename });

      if (!hasUnlockedAccess) {
        // FREE USER FLOW: Skip Gemini
        const lockedShoppingList = buildLockedShoppingList();
        const metadataPayload = {
          resultId: filename,
          userEmail: email.trim(),
          theme: activeTheme,
          originalImageUrl,
          generatedImageUrl: imageUrl,
          shoppingList: [],
          shoppingListStatus: "locked",
          timestamp: new Date().toISOString(),
        };
        const metadataFilePath = path.join(
          METADATA_DIR,
          `${path.parse(filename).name}.json`,
        );
        await fs.promises.writeFile(
          metadataFilePath,
          JSON.stringify(metadataPayload, null, 2),
        );

        res.json({
          resultId: filename,
          imageUrl,
          originalImageUrl,
          shoppingList: lockedShoppingList,
          shoppingListStatus: "locked",
          shoppingListUnlocked: false,
          tokensRemaining,
          isPremium: false,
          testMode: Boolean(existingLead?.testMode),
        });

        if (process.env.EMAIL_USER && email) {
          const regularEmailBody = `
            <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0d0d0d;color:#fff;padding:28px;border-radius:14px;">
                <h1 style="color:#a855f7;margin:0 0 10px 0;">Your Gaming Room Design Is Ready</h1>
                <p style="color:#d1d5db;margin:0 0 16px 0;">Theme: <strong>${activeTheme}</strong></p>
                <div style="margin:14px 0;"><img src="cid:design_image" alt="Generated room" style="width:100%;border-radius:10px;" /></div>
                ${renderShoppingListHtml(lockedShoppingList, false)}
                <div style="margin-top:20px;text-align:center;">
                    <a href="${redirectLink}" style="display:inline-block;padding:14px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;">View Your Result</a>
                </div>
            </div>`;
          transporter
            .sendMail({
              from: '"SetupAura AI" <support@setupaura.online>',
              to: email.trim(),
              subject: "Your Design Is Ready + Unlock Shopping List",
              html: regularEmailBody,
              attachments: [
                {
                  filename: "your-design.jpg",
                  content: finalGeneratedBuffer,
                  cid: "design_image",
                },
              ],
            })
            .catch((err) => console.error("[Email Failed]", err.message));
        }
      } else {
        // PREMIUM USER FLOW: Immediate response, Background Gemini
        res.json({
          resultId: filename,
          imageUrl,
          originalImageUrl,
          shoppingListStatus: "processing",
          shoppingListUnlocked: true,
          tokensRemaining,
          isPremium: true,
          testMode: Boolean(existingLead?.testMode),
          backgroundProcessing: true, // Flag for frontend
        });

        (async () => {
          try {
            let fullShoppingList = [];
            let retries = 3;
            while (retries > 0 && fullShoppingList.length === 0) {
              try {
                const maybeShoppingList = await analyzeRoomWithGemini({
                  mimeType: "image/jpeg",
                  data: generatedBase64,
                  selectedTheme: activeTheme,
                });
                fullShoppingList = Array.isArray(maybeShoppingList)
                  ? maybeShoppingList
                  : [];
                if (fullShoppingList.length > 0) break;
              } catch (shoppingErr) {
                console.error(`[Gemini Retry] left:`, shoppingErr.message);
              }
              retries--;
              if (retries > 0)
                await new Promise((res) => setTimeout(res, 2000));
            }

            const metadataPayload = {
              resultId: filename,
              userEmail: email.trim(),
              theme: activeTheme,
              originalImageUrl,
              generatedImageUrl: imageUrl,
              shoppingList: fullShoppingList,
              shoppingListStatus:
                fullShoppingList.length > 0 ? "ready" : "failed",
              timestamp: new Date().toISOString(),
            };
            const metadataFilePath = path.join(
              METADATA_DIR,
              `${path.parse(filename).name}.json`,
            );
            await fs.promises.writeFile(
              metadataFilePath,
              JSON.stringify(metadataPayload, null, 2),
            );

            if (process.env.EMAIL_USER && email) {
              const adminEmailBody = `
                <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0b0f1a;color:#fff;padding:28px;border-radius:14px;">
                    <h1 style="color:#60a5fa;margin:0 0 10px 0;">Your Premium Design & Shopping List</h1>
                    <p style="color:#cbd5e1;margin:0 0 16px 0;">Theme: <strong>${activeTheme}</strong></p>
                    <div style="margin:14px 0;"><img src="cid:design_image" alt="Generated room" style="width:100%;border-radius:10px;" /></div>
                    ${renderShoppingListHtml(fullShoppingList, true)}
                    <div style="margin-top:18px;">
                        <a href="${redirectLink}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Open Your Result</a>
                    </div>
                </div>`;
              await transporter.sendMail({
                from: '"SetupAura AI" <support@setupaura.online>',
                to: email.trim(),
                subject: "Your Full Design + Shopping List",
                html: adminEmailBody,
                attachments: [
                  {
                    filename: "your-design.jpg",
                    content: finalGeneratedBuffer,
                    cid: "design_image",
                  },
                ],
              });
            }
          } catch (bgErr) {
            console.error("[BACKGROUND_TASK_ERROR]", bgErr.message);
          }
        })();
      }
    } catch (error) {
      console.error("[ERROR]", error.message);
      if (!res.headersSent) {
        return res.status(500).json({
          error: "SERVER_ERROR",
          message: "An unexpected server error occurred.",
        });
      }
    }
  },
);

app.get("/api/result/:id", async (req, res) => {
  const rawId = String(req.params.id || "").trim();
  if (!rawId) {
    return res.status(400).json({ error: "MISSING_RESULT_ID" });
  }

  const safeId = path.basename(rawId);
  const fileName = safeId.endsWith(".jpg") ? safeId : `${safeId}.jpg`;
  const baseName = path.parse(fileName).name;
  const metadataFilePath = path.join(METADATA_DIR, `${baseName}.json`);
  const generatedImageUrl = `https://${req.get("host")}/uploads/images/${fileName}`;

  if (!fs.existsSync(path.join(IMAGES_DIR, fileName))) {
    return res.status(404).json({ error: "RESULT_NOT_FOUND" });
  }

  if (!fs.existsSync(metadataFilePath)) {
    return res.json({
      resultId: fileName,
      imageUrl: generatedImageUrl,
      originalImageUrl: null,
      shoppingListStatus: "pending",
    });
  }

  try {
    const raw = await fs.promises.readFile(metadataFilePath, "utf8");
    const parsed = JSON.parse(raw);
    const userEmail = String(parsed.userEmail || "").trim();
    const normalizedUserEmail = userEmail.toLowerCase();
    const isUserAdmin = normalizedUserEmail === ADMIN_EMAIL.toLowerCase();
    const userRecord = userEmail ? getUserRecord(userEmail) : null;
    const isUserPremium = Boolean(userRecord?.premium || isUserAdmin);
    const fullShoppingList = Array.isArray(parsed.shoppingList)
      ? normalizeShoppingList(parsed.shoppingList)
      : [];
    const shoppingListUnlocked = Boolean(isUserAdmin || isUserPremium);
    let shoppingListStatus = String(
      parsed.shoppingListStatus ||
        (fullShoppingList.length > 0 ? "ready" : "pending"),
    ).toLowerCase();

    if (
      shoppingListUnlocked &&
      fullShoppingList.length === 0 &&
      shoppingListStatus === "pending"
    ) {
      ensureShoppingListForResult({
        resultId: baseName,
        metadataFilePath,
        generatedImageUrl: parsed.generatedImageUrl || generatedImageUrl,
      }).catch((regenErr) =>
        console.error(
          "[RESULT_SHOPPING_REGEN_TRIGGER_ERROR]",
          regenErr.message,
        ),
      );
      if (shoppingListGenerationLocks.has(baseName)) {
        shoppingListStatus = "processing";
      }
    }

    return res.json({
      resultId: fileName,
      imageUrl: parsed.generatedImageUrl || generatedImageUrl,
      originalImageUrl: parsed.originalImageUrl || null,
      userEmail,
      theme: parsed.theme || "",
      timestamp: parsed.timestamp || "",
      isPremium: isUserPremium,
      shoppingListUnlocked,
      shoppingListStatus,
      shoppingList: shoppingListUnlocked
        ? fullShoppingList
        : buildLockedShoppingList(),
    });
  } catch {
    return res.json({
      resultId: fileName,
      imageUrl: generatedImageUrl,
      originalImageUrl: null,
      isPremium: false,
      shoppingListUnlocked: false,
      shoppingListStatus: "failed",
      shoppingList: buildLockedShoppingList(),
    });
  }
});

app.post(
  "/api/analyze-room",
  apiLimiter,
  upload.single("image"),
  async (req, res) => {
    const { image, imageUrl, selectedTheme } = req.body || {};

    if (!image && !imageUrl && !req.file) {
      return res.status(400).json({ error: "image or imageUrl is required" });
    }

    try {
      let mimeType;
      let data;

      if (req.file?.path) {
        const fileBuffer = await fs.promises.readFile(req.file.path);
        mimeType =
          req.file.mimetype ||
          detectMimeType(req.file.originalname || req.file.path);
        data = fileBuffer.toString("base64");
      } else {
        const imageInput = await getImageInputForGemini({
          image,
          imageUrl,
        });
        mimeType = imageInput.mimeType;
        data = imageInput.data;
      }

      const items = await analyzeRoomWithGemini({
        mimeType,
        data,
        selectedTheme,
      });
      return res.json({ items });
    } catch (error) {
      console.error("[ANALYZE_ROOM_ERROR]", error.message);
      return res
        .status(500)
        .json({ error: "ANALYZE_ROOM_FAILED", message: error.message });
    }
  },
);

app.post("/api/submit-review", async (req, res) => {
  const { rating, feedback } = req.body;
  if (typeof rating !== "number" || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ error: "Rating must be a number between 1 and 5" });
  }
  const safeFeedback =
    typeof feedback === "string" ? feedback.slice(0, 2000) : "";
  const file = path.join(__dirname, "reviews.json");
  let data = [];
  try {
    const raw = await fs.promises.readFile(file, "utf8");
    data = JSON.parse(raw);
    if (!Array.isArray(data)) data = [];
  } catch {
    data = [];
  }
  data.push({
    rating,
    feedback: safeFeedback,
    timestamp: new Date().toISOString(),
  });
  await fs.promises.writeFile(file, JSON.stringify(data, null, 2));
  console.log(`[Review] ${rating} stars`);
  res.json({ success: true });
});

const requestOtpHandler = async (req, res) => {
  const { email } = req.body;
  if (!email || email.trim() === "")
    return res.status(400).json({ error: "Email required" });
  if (!EMAIL_REGEX.test(email.trim()))
    return res.status(400).json({
      error: "INVALID_EMAIL_FORMAT",
      message: "Please enter a valid email address.",
    });
  const normalizedEmail = normalizeEmailAddress(email);
  const existing = otpStore.get(normalizedEmail);
  if (
    existing &&
    Date.now() < existing.expires &&
    Date.now() - existing.sentAt < 30000
  ) {
    const waitSeconds = Math.ceil(
      (30000 - (Date.now() - existing.sentAt)) / 1000,
    );
    return res.status(429).json({
      error: "COOLDOWN",
      message: `Please wait ${waitSeconds} seconds before requesting a new code.`,
    });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const expires = Date.now() + 10 * 60 * 1000;
  otpStore.set(normalizedEmail, {
    code,
    expires,
    sentAt: Date.now(),
    attempts: 0,
  });
  try {
    await transporter.sendMail({
      from: '"SetupAura AI" <support@setupaura.online>',
      to: email.trim(),
      subject: "Your SetupAura Verification Code",
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;padding:40px;border-radius:12px;border:1px solid #3b0764;">
                <h2 style="color:#a855f7;margin-top:0;">Verify Your Email</h2>
                <p style="color:#ccc;">Use the code below to verify your email and unlock your free AI room transformation.</p>
                <div style="background:#1a0030;border:2px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
                    <span style="font-size:48px;font-weight:900;letter-spacing:12px;color:#a855f7;font-family:monospace;">${code}</span>
                </div>
                <p style="color:#9ca3af;font-size:0.85em;">This code expires in 10 minutes. If you did not request this, ignore this email.</p>
            </div>`,
    });
    res.json({ success: true });
  } catch (err) {
    console.error("[OTP Email] Failed:", err.message);
    otpStore.delete(normalizedEmail);
    res.status(500).json({
      error: "EMAIL_FAILED",
      message: "Failed to send email. Please try again.",
    });
  }
};

const verifyOtpHandler = (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Email and code required" });
  const normalizedEmail = normalizeEmailAddress(email);
  const entry = otpStore.get(normalizedEmail);
  if (!entry)
    return res.status(400).json({
      error: "INVALID_OTP",
      message: "No code was sent to this email. Please request a new one.",
    });
  if (Date.now() > entry.expires) {
    otpStore.delete(normalizedEmail);
    return res.status(400).json({
      error: "EXPIRED_OTP",
      message: "This code has expired. Please request a new one.",
    });
  }
  if (entry.code !== code.trim()) {
    entry.attempts = (entry.attempts || 0) + 1;
    if (entry.attempts >= 5) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        error: "TOO_MANY_ATTEMPTS",
        message: "Too many incorrect attempts. Please request a new code.",
      });
    }
    const remaining = 5 - entry.attempts;
    return res.status(400).json({
      error: "WRONG_OTP",
      message: `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
    });
  }
  otpStore.delete(normalizedEmail);
  const user = upsertLeadRecord(normalizedEmail);
  return res.json({
    success: true,
    verified: true,
    email: normalizedEmail,
    tokensRemaining: Math.max(
      0,
      Math.floor(Number(user?.tokensRemaining) || 0),
    ),
    isPremium: Boolean(user?.premium),
  });
};

app.post("/api/send-otp", requestOtpHandler);
app.post("/api/verify-otp", verifyOtpHandler);
app.post("/api/auth/request-otp", requestOtpHandler);
app.post("/api/auth/verify-otp", verifyOtpHandler);

app.post(
  "/api/gumroad-webhook",
  express.urlencoded({ extended: true }),
  express.json(),
  async (req, res) => {
    const webhookSecret = req.query.secret;
    if (
      process.env.GUMROAD_WEBHOOK_SECRET &&
      webhookSecret !== process.env.GUMROAD_WEBHOOK_SECRET
    ) {
      return res.status(403).json({ error: "INVALID_WEBHOOK_SECRET" });
    }

    console.log("[Gumroad] Webhook received", {
      method: req.method,
      keys: Object.keys(req.body || {}),
      timestamp: new Date().toISOString(),
    });
    const payload = req.body || {};
    const email = String(payload?.email || "")
      .trim()
      .toLowerCase();
    const productName = String(payload?.product_name || "").trim();
    const permalink = String(payload?.permalink || "").trim();
    const tierProbe = `${productName} ${permalink}`.toLowerCase();

    if (!email) {
      return res.status(200).json({ success: true, credited: false });
    }

    let tokensToAdd = 0;
    if (tierProbe.includes("elite")) {
      tokensToAdd = 100;
    } else if (tierProbe.includes("starter")) {
      tokensToAdd = 10;
    } else if (tierProbe.includes("pro")) {
      tokensToAdd = 40;
    }

    if (tokensToAdd <= 0) {
      return res.status(200).json({ success: true, credited: false });
    }

    const leads = readLeads();
    const leadIndex = getLeadIndexByEmail(leads, email);
    const existingLead = leadIndex >= 0 ? leads[leadIndex] : null;
    const currentTokens = Math.max(
      0,
      Math.floor(Number(existingLead?.tokensRemaining) || 0),
    );
    const nextTokens = currentTokens + tokensToAdd;
    const updatedLead = {
      email,
      timestamp: existingLead?.timestamp || new Date().toISOString(),
      premium: true,
      tokensRemaining: nextTokens,
      testMode: Boolean(existingLead?.testMode),
    };
    if (leadIndex >= 0) {
      leads[leadIndex] = { ...leads[leadIndex], ...updatedLead };
    } else {
      leads.push(updatedLead);
    }
    fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));

    const rawPrice =
      Number(payload?.price) ||
      Number(payload?.purchase?.price) ||
      Number(payload?.sale?.price) ||
      Number(payload?.data?.price) ||
      0;
    let calculatedPrice = rawPrice / 100;
    if (calculatedPrice <= 0) {
      calculatedPrice = 0.01;
    }

    await trackPosthogEvent("Purchase", {
      email,
      value: calculatedPrice,
      currency: "USD",
      product_name: productName,
      permalink,
      tokens_added: tokensToAdd,
      test_mode: payload?.test === "true",
    });

    if (process.env.FB_PIXEL_ID && process.env.FB_ACCESS_TOKEN) {
      try {
        const normalizedEmailForFB = email.trim().toLowerCase();
        const hashedEmail = crypto
          .createHash("sha256")
          .update(normalizedEmailForFB)
          .digest("hex");
        await fetch(
          `https://graph.facebook.com/v19.0/${process.env.FB_PIXEL_ID}/events?access_token=${process.env.FB_ACCESS_TOKEN}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              data: [
                {
                  event_name: "Purchase",
                  event_time: Math.floor(Date.now() / 1000),
                  action_source: "website",
                  user_data: { em: [hashedEmail] },
                  custom_data: { currency: "USD", value: calculatedPrice },
                },
              ],
            }),
          },
        );
        console.log("[Facebook CAPI] Purchase event sent for", email);
      } catch (fbErr) {
        console.error("[Facebook CAPI Error]", fbErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      credited: true,
      email,
      tokensAdded: tokensToAdd,
      tokensRemaining: nextTokens,
    });
  },
);

app.get("/api/user/:email", (req, res) => {
  const email = normalizeEmailAddress(req.params.email || "");
  if (!email) {
    return res.status(400).json({ error: "EMAIL_REQUIRED" });
  }

  const user = getUserRecord(email);
  if (!user) {
    return res.status(200).json({
      email,
      tokensRemaining: 0,
      isPremium: false,
    });
  }

  return res.status(200).json({
    email: String(user.email || email)
      .trim()
      .toLowerCase(),
    tokensRemaining: Math.max(0, Math.floor(Number(user.tokensRemaining) || 0)),
    isPremium: Boolean(user.premium),
  });
});

app.get("/api/admin/users", (req, res) => {
  const providedSecret = req.headers["admin-secret"] || req.body?.adminSecret;
  if (
    !process.env.ADMIN_SECRET ||
    providedSecret !== process.env.ADMIN_SECRET
  ) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const leads = readLeads();
  return res.status(200).json(Array.isArray(leads) ? leads : []);
});

app.post("/api/admin/update-tokens", (req, res) => {
  const providedSecret = req.headers["admin-secret"] || req.body?.adminSecret;
  if (
    !process.env.ADMIN_SECRET ||
    providedSecret !== process.env.ADMIN_SECRET
  ) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

  const { targetEmail, newTokens } = req.body || {};
  const normalizedEmail = normalizeEmailAddress(targetEmail);
  const parsedTokens = Math.max(0, Math.floor(Number(newTokens) || 0));

  if (!normalizedEmail) {
    return res.status(400).json({ error: "TARGET_EMAIL_REQUIRED" });
  }

  const leads = readLeads();
  const leadIndex = getLeadIndexByEmail(leads, normalizedEmail);
  if (leadIndex < 0) {
    return res.status(404).json({ error: "USER_NOT_FOUND" });
  }

  leads[leadIndex] = {
    ...leads[leadIndex],
    email: normalizedEmail,
    tokensRemaining: parsedTokens,
  };
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));

  return res.status(200).json({
    success: true,
    email: normalizedEmail,
    tokensRemaining: parsedTokens,
  });
});

app.post("/api/admin/toggle-premium", (req, res) => {
  const providedSecret = req.headers["admin-secret"] || req.body?.adminSecret;
  if (
    !process.env.ADMIN_SECRET ||
    providedSecret !== process.env.ADMIN_SECRET
  ) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  const { targetEmail, isPremium } = req.body;
  const normalizedEmail = normalizeEmailAddress(targetEmail);

  const leads = readLeads();
  const leadIndex = getLeadIndexByEmail(leads, normalizedEmail);
  if (leadIndex < 0) return res.status(404).json({ error: "USER_NOT_FOUND" });

  leads[leadIndex].premium = Boolean(isPremium);
  fs.writeFileSync(leadsPath, JSON.stringify(leads, null, 2));

  return res.json({
    success: true,
    email: normalizedEmail,
    isPremium: leads[leadIndex].premium,
  });
});

app.post("/api/admin-upgrade", (req, res) => {
  const { email, tokensToAdd } = req.body || {};
  const providedSecret = req.headers["admin-secret"] || req.body?.adminSecret;
  if (
    !process.env.ADMIN_SECRET ||
    providedSecret !== process.env.ADMIN_SECRET
  ) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }
  const normalizedEmail = normalizeEmailAddress(email);

  const amount = Math.max(0, Math.floor(Number(tokensToAdd) || 0));
  if (amount <= 0) {
    return res.status(400).json({ error: "INVALID_TOKENS" });
  }

  const existingLead = getUserRecord(normalizedEmail);
  const currentTokens = Math.max(
    0,
    Math.floor(Number(existingLead?.tokensRemaining) || 0),
  );
  const nextTokens = currentTokens + amount;

  upsertLeadRecord(normalizedEmail, {
    premium: true,
    testMode: true,
    tokensRemaining: nextTokens,
  });

  return res.json({
    success: true,
    tokensAdded: amount,
    tokensRemaining: nextTokens,
    isPremium: true,
    email: normalizedEmail,
  });
});

app.get("/api/test-email", async (req, res) => {
  try {
    const emailHtml = `
        <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0d0d0d;color:#fff;padding:28px;border-radius:14px;border:1px solid #3b0764;">
            <h2 style="color:#a855f7;margin-top:0;">Your Room Misses You! 🎮</h2>
            <p style="color:#ccc;">Hey there, we noticed you generated your room design but haven't unlocked your 10 additional premium designs and exact-match shopping list yet.</p>
            <p style="color:#ccc;">Just a quick reminder: our <strong>Launch Sale</strong> is currently active, meaning you can still unlock the full experience at the discounted price you saw on the site!</p>
            <div style="margin:24px 0;text-align:center;">
                <a href="https://www.setupaura.online/pricing" style="display:inline-block;padding:14px 28px;background:linear-gradient(to right, #7c3aed, #2563eb);color:#fff;text-decoration:none;border-radius:10px;font-weight:bold;font-size:16px;">Get 10 New Designs</a>
            </div>
            <p style="color:#9ca3af;font-size:12px;">Happy gaming,<br/>The SetupAura AI Team</p>
        </div>`;
    await transporter.sendMail({
      from: '"SetupAura AI" <support@setupaura.online>',
      to: ADMIN_EMAIL,
      subject: "Your Shopping List & Premium Designs Are Waiting 🎁",
      html: emailHtml,
    });
    res.json({ success: true, message: "Test email sent to " + ADMIN_EMAIL });
  } catch (err) {
    res.status(500).json({ error: "Failed to send", details: err.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: "NOT_FOUND", message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("[GLOBAL ERROR]", err.message);
  return res.status(err.status || 500).json({
    error: "GLOBAL_SERVER_ERROR",
    message: err.message || "An unexpected error occurred",
  });
});

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on http://localhost:${PORT}`),
);
