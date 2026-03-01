import express from "express";
import cors from "cors";
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
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
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

setInterval(
  () => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
      if (now > entry.expires) otpStore.delete(key);
    }
  },
  5 * 60 * 1000,
);

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
app.use(express.json({ limit: "100mb" }));
app.use(express.urlencoded({ limit: "100mb", extended: true }));

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
    cb(
      null,
      `upload-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`,
    );
  },
});
const upload = multer({ storage: uploadStorage });
const leadsPath = path.join(__dirname, "leads.json");
const WATERMARK_LOGO_PATH = path.join(__dirname, "public", "logo.svg");
const ADMIN_EMAIL = "liorma6@gmail.com";
const TEST_USER_EMAIL = "liorma6@gmail.com";

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
    const normalizedEmail = String(email || "").trim();
    const leads = readLeads();
    const existingEmails = leads
      .map((entry) =>
        typeof entry === "string"
          ? entry.trim().toLowerCase()
          : String(entry?.email || "")
              .trim()
              .toLowerCase(),
      )
      .filter(Boolean);
    if (existingEmails.includes(normalizedEmail.toLowerCase())) return;
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
      entry.email.toLowerCase() === String(email || "").toLowerCase(),
  );

const upsertLeadRecord = (email, updates = {}) => {
  const leads = readLeads();
  const index = getLeadIndexByEmail(leads, email);
  const base = {
    email: String(email || "").trim(),
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
  const normalized = String(email || "").trim().toLowerCase();
  return readLeads().find(
    (entry) => entry && entry.email && entry.email.toLowerCase() === normalized,
  );
};

const buildFrontendUrl = (targetPath = "/", query = {}) => {
  const pathValue = String(targetPath || "/").trim();
  const normalizedPath = pathValue.startsWith("/") ? pathValue : `/${pathValue}`;
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
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
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

  if (imageUrl.startsWith("/uploads/")) {
    const localPath = path.join(__dirname, imageUrl);
    const fileBuffer = await fs.promises.readFile(localPath);
    return {
      mimeType: detectMimeType(localPath),
      data: fileBuffer.toString("base64"),
    };
  }

  if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
    const urlObj = new URL(imageUrl);
    if (urlObj.pathname.startsWith("/uploads/")) {
      const localPath = path.join(__dirname, urlObj.pathname);
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
    label: "ULTIMATE CYBERPUNK RGB STREAMER ROOM",
    heroItems: [
      "Immersive Wall-to-Wall Neon RGB Lighting Panels (Nanoleaf style)",
      "Massive Triple-Monitor Curved Setup with Glowing Liquid-Cooled PC Tower",
      "Acoustic Foam Hexagon Wall Panels with LED Strips",
    ],
  },
  ANIME: {
    label: "ANIME",
    heroItems: [
      "Luffy Gear 5 Nendoroid (Shelf-size)",
      "Zoro Katana Wall Mount",
      "Stack of One Piece Manga Volumes",
    ],
  },
  HEAVY_METAL: {
    label: "HEAVY METAL",
    heroItems: [
      "Marshall Amp Stack",
      "Electric Guitar Wall Mount",
      "Metallica Framed Poster",
    ],
  },
  RETRO_ARCADE: {
    label: "RETRO ARCADE",
    heroItems: [
      "Arcade1Up Pac-Man Counter-top",
      "Neon Ghost Sign",
      "Retro SNES Console",
    ],
  },
  FANTASY_RPG: {
    label: "FANTASY RPG",
    heroItems: [
      "Dragon Head Bookend",
      "Replica Witcher Silver Sword",
      "Framed Middle-earth Map",
    ],
  },
  SCI_FI: {
    label: "SCI-FI",
    heroItems: [
      "Holographic LED Fan Display",
      "Vertical GPU Showcase",
      "NASA-punk Desk Mat",
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
  const prompt = `Analyze this realistic ${config.label} gaming room. Identify the 3 hero items: ${item1}, ${item2}, and ${item3}, plus 2 other professional peripherals. You MUST include a product entry named Premium Gaming Chair with a matching aesthetic and a shopping link. You MUST provide URLs to actual, specific end-products (e.g., a direct link to a specific brand's product page or an exact Amazon product ASIN). Do NOT provide generic search links (like amazon.com/s?k=gaming+chair). If the exact product is not available, provide a direct URL to a highly similar specific end-product. The links must lead directly to a buyable item. You MUST return the response strictly as a valid JSON array of objects. Each object must have 'name', 'description', 'price', and 'url'. Do not include markdown code blocks or any other text outside the JSON array.`;

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
  (req, res, next) => {
    const contentType = req.headers["content-type"] || "";
    if (contentType.includes("multipart/form-data")) {
      return upload.single("image")(req, res, next);
    }
    return next();
  },
  async (req, res) => {
  const { image, email, theme } = req.body || {};

  if (!image && !req.file) return res.status(400).json({ error: "No image provided" });
  if (!email || email.trim() === "")
    return res.status(400).json({ error: "Email required" });

  const token = process.env.OPENAI_API_KEY || process.env.OpenAi_TOKEN;
  if (!token) return res.status(500).json({ error: "Missing OpenAI API Key" });

  try {
    const normalizedEmail = email.trim().toLowerCase();
    const isUserAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();
    const existingLead = getUserRecord(email.trim());
    const isTestMode = normalizedEmail === TEST_USER_EMAIL.toLowerCase();
    const isPremiumUser = Boolean(existingLead?.premium || isTestMode);
    const hasUnlockedAccess = isUserAdmin || isPremiumUser;

    if (!isUserAdmin && !isPremiumUser && existingLead) {
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

    if (req.file?.path) {
      imageBuffer = fs.readFileSync(req.file.path);
      inputFilename = req.file.originalname || path.basename(req.file.path);
      inputMimeType =
        req.file.mimetype || detectMimeType(req.file.originalname || "");
      originalImageUrl = `https://${req.get("host")}/uploads/${path.basename(req.file.path)}`;
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
                  url: `data:image/png;base64,${base64Data}`,
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
      return res
        .status(500)
        .json({ error: "VISION_API_ERROR", message: "Image analysis failed." });
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
    const enhancedPrompt = `Transform this photo into a high-end gaming room in a ${themeConfig.label} style. Keep the same room geometry and camera angle. Upgrade the lighting with RGB accents, add a premium gaming desk, and MUST include a premium gaming chair. Make it look like a real interior photograph.`;

    const TIMEOUT_MS = 90000;
    const aiResponse = await Promise.race([
      openai.images.edit({
        model: "gpt-image-1.5",
        image: imageFile,
        prompt: enhancedPrompt,
        size: "1536x1024",
        quality: "high",
        input_fidelity: "high",
        output_format: "jpeg",
        output_compression: 90,
      }),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("OpenAI request timed out after 90 seconds")),
          TIMEOUT_MS,
        ),
      ),
    ]);

    const generatedBase64 = aiResponse.data[0].b64_json;
    const filename = `gen-${Date.now()}.jpg`;
    ensureUploadDirs();
    const filepath = path.join(IMAGES_DIR, filename);
    const generatedBuffer = Buffer.from(generatedBase64, "base64");
    const finalGeneratedBuffer = hasUnlockedAccess
      ? generatedBuffer
      : await applyWatermarkForFreeUser(generatedBuffer);
    await fs.promises.writeFile(filepath, finalGeneratedBuffer);
    console.log(`[Saved] ${filepath}`);
    const imageUrl = `https://${req.get("host")}/uploads/images/${filename}`;

    let fullShoppingList = [];
    try {
      fullShoppingList = await analyzeRoomWithGemini({
        mimeType: "image/jpeg",
        data: generatedBase64,
        selectedTheme: activeTheme,
      });
    } catch (shoppingErr) {
      console.error("[SHOPPING_LIST_ERROR]", shoppingErr.message);
    }

    const metadataPayload = {
      resultId: filename,
      userEmail: email.trim(),
      theme: activeTheme,
      originalImageUrl,
      generatedImageUrl: imageUrl,
      shoppingList: fullShoppingList,
      timestamp: new Date().toISOString(),
    };
    const metadataFilePath = path.join(
      METADATA_DIR,
      `${path.parse(filename).name}.json`,
    );
    ensureUploadDirs();
    await fs.promises.writeFile(
      metadataFilePath,
      JSON.stringify(metadataPayload, null, 2),
    );
    console.log(`[Saved Metadata] ${metadataFilePath}`);

    const lockedShoppingList = buildLockedShoppingList();

    let tokensRemaining = Number(existingLead?.tokensRemaining ?? 0);
    if (!isUserAdmin && !isPremiumUser) {
      saveLead(email.trim());
      tokensRemaining = 0;
    } else {
      upsertLeadRecord(email.trim(), {
        premium: true,
        testMode: isTestMode,
        tokensRemaining: Math.max(0, Number(existingLead?.tokensRemaining ?? 0)),
      });
      tokensRemaining = Math.max(0, Number(existingLead?.tokensRemaining ?? 0));
    }

    res.json({
      resultId: filename,
      imageUrl,
      originalImageUrl,
      shoppingList: hasUnlockedAccess ? fullShoppingList : lockedShoppingList,
      shoppingListUnlocked: hasUnlockedAccess,
      tokensRemaining,
      isPremium: Boolean(isPremiumUser || isUserAdmin),
      testMode: isTestMode,
    });

    if (process.env.EMAIL_USER && email) {
      const redirectLink = buildFrontendUrl("/result", { id: filename });
      const adminEmailBody = `
                    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0b0f1a;color:#fff;padding:28px;border-radius:14px;">
                        <h1 style="color:#60a5fa;margin:0 0 10px 0;">Your Admin Design Is Ready</h1>
                        <p style="color:#cbd5e1;margin:0 0 16px 0;">Theme: <strong>${activeTheme}</strong></p>
                        <div style="margin:14px 0;"><img src="cid:design_image" alt="Generated room" style="width:100%;border-radius:10px;" /></div>
                        ${renderShoppingListHtml(fullShoppingList, true)}
                        <div style="margin-top:18px;">
                            <a href="${redirectLink}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">Open Your Result</a>
                        </div>
                    </div>
                `;

      const regularEmailBody = `
                    <div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;background:#0d0d0d;color:#fff;padding:28px;border-radius:14px;">
                        <h1 style="color:#a855f7;margin:0 0 10px 0;">Your Gaming Room Design Is Ready</h1>
                        <p style="color:#d1d5db;margin:0 0 16px 0;">Theme: <strong>${activeTheme}</strong></p>
                        <div style="margin:14px 0;"><img src="cid:design_image" alt="Generated room" style="width:100%;border-radius:10px;" /></div>
                        ${renderShoppingListHtml(lockedShoppingList, false)}
                        <div style="margin-top:20px;text-align:center;">
                            <a href="${redirectLink}" style="display:inline-block;padding:14px 24px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:10px;font-weight:800;">View Your Result</a>
                        </div>
                    </div>
                `;
      transporter
        .sendMail({
          from: '"SetupAura AI" <noreply@setupaura.com>',
          to: email.trim(),
          subject: hasUnlockedAccess
            ? "Your Full Design + Shopping List"
            : "Your Design Is Ready + Unlock Shopping List",
          html: hasUnlockedAccess ? adminEmailBody : regularEmailBody,
          attachments: [
            {
              filename: "your-design.jpg",
              content: finalGeneratedBuffer,
              cid: "design_image",
            },
          ],
        })
        .then(() => console.log(`[Email] Sent to ${email}`))
        .catch((mailErr) => console.error("[Email] Failed:", mailErr.message));
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

    return res.json({
      resultId: fileName,
      imageUrl: parsed.generatedImageUrl || generatedImageUrl,
      originalImageUrl: parsed.originalImageUrl || null,
      userEmail,
      theme: parsed.theme || "",
      timestamp: parsed.timestamp || "",
      isPremium: isUserPremium,
      shoppingListUnlocked,
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
      shoppingList: buildLockedShoppingList(),
    });
  }
});

app.post("/api/analyze-room", async (req, res) => {
  const { image, imageUrl, selectedTheme } = req.body || {};

  if (!image && !imageUrl) {
    return res.status(400).json({ error: "image or imageUrl is required" });
  }

  try {
    const { mimeType, data } = await getImageInputForGemini({
      image,
      imageUrl,
    });
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
});

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

app.post("/api/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email || email.trim() === "")
    return res.status(400).json({ error: "Email required" });
  if (!EMAIL_REGEX.test(email.trim()))
    return res.status(400).json({
      error: "INVALID_EMAIL_FORMAT",
      message: "Please enter a valid email address.",
    });
  const normalizedEmail = email.trim().toLowerCase();
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
      from: '"SetupAura AI" <noreply@setupaura.com>',
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
});

app.post("/api/verify-otp", (req, res) => {
  const { email, code } = req.body;
  if (!email || !code)
    return res.status(400).json({ error: "Email and code required" });
  const normalizedEmail = email.trim().toLowerCase();
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
        error: "TOO_MANY_ATTEM পিক_ATTEMPTS",
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
  res.json({ success: true, verified: true });
});

app.post("/api/admin-upgrade", (req, res) => {
  const { email, tokensToAdd } = req.body || {};
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (normalizedEmail !== ADMIN_EMAIL.toLowerCase()) {
    return res.status(403).json({ error: "FORBIDDEN" });
  }

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
