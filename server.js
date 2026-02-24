import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import OpenAI, { toFile } from 'openai';

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = 3000;

const otpStore = new Map();
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of otpStore.entries()) {
        if (now > entry.expires) otpStore.delete(key);
    }
}, 5 * 60 * 1000);

const ALLOWED_ORIGINS = [
    process.env.FRONTEND_URL || 'http://localhost:5173',
    'http://localhost:5173',
    'http://localhost:4173',
];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST'],
}));
app.use(express.json({ limit: '10mb' }));

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);
app.use('/uploads', express.static(UPLOADS_DIR));

const LEADS_FILE = path.join(__dirname, 'leads.json');
const ADMIN_EMAIL = 'liorma6@gmail.com';

const readLeads = () => {
    if (!fs.existsSync(LEADS_FILE)) return [];
    try { return JSON.parse(fs.readFileSync(LEADS_FILE, 'utf8')); }
    catch { return []; }
};

const saveLead = (email) => {
    const leads = readLeads();
    if (leads.some(l => l.email?.toLowerCase() === email.toLowerCase())) return;
    leads.push({ email, timestamp: new Date().toISOString() });
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2));
    console.log(`[Lead] Saved: ${email}`);
};

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

app.post('/api/generate-design', async (req, res) => {
    const { image, email, theme } = req.body;

    if (!image) return res.status(400).json({ error: 'No image provided' });
    if (!email || email.trim() === '') return res.status(400).json({ error: 'Email required' });

    const token = process.env.OPENAI_API_KEY || process.env.OpenAi_TOKEN;
    if (!token) return res.status(500).json({ error: 'Missing OpenAI API Key' });

    const normalizedEmail = email.trim().toLowerCase();
    const isUserAdmin = normalizedEmail === ADMIN_EMAIL.toLowerCase();

    if (!isUserAdmin) {
        const leads = readLeads();
        if (leads.some(l => l.email?.toLowerCase() === normalizedEmail)) {
            console.log(`[Paywall] Blocked: ${email}`);
            return res.status(403).json({ error: 'Trial used', paywall: true });
        }
    }

    try {
        const base64Data = image.includes(';base64,') ? image.split(';base64,').pop() : image;
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imageFile = await toFile(imageBuffer, 'input.png', { type: 'image/png' });

        const openai = new OpenAI({ apiKey: token });

        const visionCheck = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: 'Analyze this image. Is it a picture of a room, desk, computer setup, office space, bedroom, or living space? Reply ONLY with the single word TRUE or FALSE.' },
                    { type: 'image_url', image_url: { url: `data:image/png;base64,${base64Data}`, detail: 'low' } }
                ]
            }],
            max_tokens: 5,
        });

        const isValidRoom = visionCheck.choices[0]?.message?.content?.trim().toUpperCase().startsWith('TRUE');
        if (!isValidRoom) {
            console.log(`[Validation] Invalid image rejected for: ${email}`);
            return res.status(400).json({ error: 'INVALID_IMAGE', message: "We couldn't detect a room or desk in this photo. Please upload a clear picture of your setup." });
        }

        const activeTheme = (theme || 'Premium RGB Gaming Room').trim();
        console.log(`[OpenAI] theme: ${activeTheme} | email: ${email}`);

        const TIMEOUT_MS = 90000;
        const aiResponse = await Promise.race([
            openai.images.edit({
                model: 'gpt-image-1',
                image: imageFile,
                prompt: `Analyze the provided room image. Transform it into a high-end, photorealistic ${activeTheme}. CRITICAL: Maintain the exact architectural structure, walls, floor, and window placement of the original image. HOWEVER, you must heavily UPGRADE and REPLACE existing furniture. Replace standard desks with high-end gaming battle stations featuring multiple glowing monitors. Replace standard chairs with premium racing-style gaming chairs. Add aesthetic lighting, posters, and collectibles strictly matching the ${activeTheme} style. The final result must look like an authentic, unedited smartphone photograph of a dream gaming setup, with realistic textures and lighting. Do NOT generate cartoons or 3D renders.`,
                size: '1024x1024',
            }),
            new Promise((_, reject) => setTimeout(() => reject(new Error('OpenAI request timed out after 90 seconds')), TIMEOUT_MS))
        ]);

        const filename = `gen-${Date.now()}.jpg`;
        const filepath = path.join(UPLOADS_DIR, filename);
        fs.writeFileSync(filepath, Buffer.from(aiResponse.data[0].b64_json, 'base64'));
        const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;
        console.log(`[Saved] ${filepath}`);

        if (!isUserAdmin) saveLead(email.trim());

        try {
            if (process.env.EMAIL_USER && email) {
                await transporter.sendMail({
                    from: '"SetupAura AI" <noreply@setupaura.com>',
                    to: email.trim(),
                    subject: 'Your Gaming Room Design is Ready! 🎮',
                    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#0d0d0d;color:#fff;padding:30px;border-radius:12px;">
                        <h1 style="color:#a855f7;">Your AI Design is Ready! 🎮</h1>
                        <p style="color:#ccc;">Here is your <strong>${activeTheme}</strong> transformation.</p>
                        <div style="margin:20px 0;"><img src="cid:design_image" alt="Your Gaming Room" style="width:100%;border-radius:10px;" /></div>
                        <p style="color:#9ca3af;font-size:0.85em;">Unlock more themes and unlimited generations.</p>
                        <br><br>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/?view=pricing" style="display:inline-block;padding:15px 25px;background:#7c3aed;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Unlock All Premium Themes Here</a>
                    </div>`,
                    attachments: [{ filename: 'your-design.jpg', path: filepath, cid: 'design_image' }]
                });
                console.log(`[Email] Sent to ${email}`);
            }
        } catch (mailErr) {
            console.error('[Email] Failed:', mailErr.message);
        }

        res.json({ imageUrl });

    } catch (error) {
        console.error('[ERROR]', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/submit-review', (req, res) => {
    const { rating, feedback } = req.body;
    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'Rating must be a number between 1 and 5' });
    }
    const safeFeedback = typeof feedback === 'string' ? feedback.slice(0, 2000) : '';
    const file = path.join(__dirname, 'reviews.json');
    let data = [];
    if (fs.existsSync(file)) {
        try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { data = []; }
    }
    data.push({ rating, feedback: safeFeedback, timestamp: new Date().toISOString() });
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
    console.log(`[Review] ${rating} stars`);
    res.json({ success: true });
});

app.post('/api/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email || email.trim() === '') return res.status(400).json({ error: 'Email required' });
    if (!EMAIL_REGEX.test(email.trim())) return res.status(400).json({ error: 'INVALID_EMAIL_FORMAT', message: 'Please enter a valid email address.' });
    const normalizedEmail = email.trim().toLowerCase();
    const existing = otpStore.get(normalizedEmail);
    if (existing && Date.now() < existing.expires && Date.now() - existing.sentAt < 30000) {
        const waitSeconds = Math.ceil((30000 - (Date.now() - existing.sentAt)) / 1000);
        return res.status(429).json({ error: 'COOLDOWN', message: `Please wait ${waitSeconds} seconds before requesting a new code.` });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const expires = Date.now() + 10 * 60 * 1000;
    otpStore.set(normalizedEmail, { code, expires, sentAt: Date.now(), attempts: 0 });
    try {
        await transporter.sendMail({
            from: '"SetupAura AI" <noreply@setupaura.com>',
            to: email.trim(),
            subject: 'Your SetupAura Verification Code',
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
        console.error('[OTP Email] Failed:', err.message);
        otpStore.delete(normalizedEmail);
        res.status(500).json({ error: 'Failed to send OTP email' });
    }
});

app.post('/api/verify-otp', (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Email and code required' });
    const normalizedEmail = email.trim().toLowerCase();
    const entry = otpStore.get(normalizedEmail);
    if (!entry) return res.status(400).json({ error: 'INVALID_OTP', message: 'No code was sent to this email. Please request a new one.' });
    if (Date.now() > entry.expires) {
        otpStore.delete(normalizedEmail);
        return res.status(400).json({ error: 'EXPIRED_OTP', message: 'This code has expired. Please request a new one.' });
    }
    if (entry.code !== code.trim()) {
        entry.attempts = (entry.attempts || 0) + 1;
        if (entry.attempts >= 5) {
            otpStore.delete(normalizedEmail);
            return res.status(400).json({ error: 'TOO_MANY_ATTEMPTS', message: 'Too many incorrect attempts. Please request a new code.' });
        }
        const remaining = 5 - entry.attempts;
        return res.status(400).json({ error: 'WRONG_OTP', message: `Incorrect code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` });
    }
    otpStore.delete(normalizedEmail);
    res.json({ success: true, verified: true });
});

app.listen(PORT, '0.0.0.0', () => console.log(`Server running on http://localhost:${PORT}`));