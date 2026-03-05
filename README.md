# 🎮 SetupAura.ai

> **From basic to breathtaking in literally ONE click.**
> SetupAura is a full-stack, AI-powered web application that transforms standard room photos into professional, 3D-designed gaming setups in seconds, complete with a personalized gear shopping list.

---

## 🚀 The Product

Finding the right gear and visualizing how it fits together is a massive pain point for gamers. SetupAura solves this by bridging the gap between imagination and reality. 

**Key Features:**
* 🪄 **Dual AI-Powered Engine:** Utilizes both OpenAI and Google Gemini to process room dimensions, optimize prompts, and generate highly aesthetic, pro-tier gaming environments.
* 🔐 **Seamless Authentication:** Custom OTP (One-Time Password) email login flow for frictionless onboarding and secure user retention.
* 💳 **Monetization Ready:** Fully integrated with Gumroad via secure Webhooks to handle purchases and premium generation access.
* 🛒 **Smart Shopping List:** Extracts visual elements to provide a tailored shopping list.
* ⚡ **Lightning Fast UI:** Built with React and Vite for optimal performance and a smooth split-screen before/after experience.

---

## 🏗️ Architecture & Tech Stack

This project is built with a scalable, production-ready full-stack architecture, focusing on both user experience and marketing analytics.

### Frontend
* **Framework:** React + Vite
* **Analytics:** PostHog (for precise user-journey tracking)

### Backend & Integrations
* **AI Integration:** OpenAI API & Gemini API
* **Mailing:** Custom SMTP service for OTP delivery
* **Payments:** Gumroad Webhooks
* **Marketing Pipeline:** Server-side Meta Conversions API (CAPI) integration to bypass ad-blockers and iOS restrictions, accurately reporting custom metrics like `client_ip_address` directly to Meta's Graph API.

---

## 🎥 Demo

*Because API generation costs money, the live production site is currently restricted to active ad campaign traffic.* **Check out how the magic works behind the scenes:**
👉 [LINK_TO_YOUR_LINKEDIN_POST_OR_YOUTUBE_VIDEO]

---

## 💻 Local Development

Want to run SetupAura locally? 

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/liorma6/SetupAura-AI.git](https://github.com/liorma6/SetupAura-AI.git)
Install dependencies:

Bash

cd SetupAura-AI
npm install
Environment Variables Configuration:
Create a .env file and configure the following keys (ensure backend secrets are kept secure):

קטע קוד

# --- AI Providers ---
OpenAi_TOKEN=your_openai_token
GEMINI_API_KEY=your_gemini_key

# --- App URLs ---
FRONTEND_URL=http://localhost:5173
VITE_API_URL=http://localhost:3000

# --- Authentication (OTP) ---
EMAIL_USER=your_smtp_email
EMAIL_PASS=your_smtp_password

# --- Analytics & Marketing ---
VITE_PUBLIC_POSTHOG_KEY=your_posthog_key
VITE_PUBLIC_POSTHOG_HOST=[https://app.posthog.com](https://app.posthog.com)
FB_PIXEL_ID=your_pixel_id
FB_ACCESS_TOKEN=your_meta_access_token

# --- Security & Payments ---
ADMIN_SECRET=your_admin_secret
GUMROAD_WEBHOOK_SECRET=your_gumroad_webhook_secret
Run the development server:

Bash

npm run dev
Built with ❤️ (and a lot of XL) by Lior Mashiach
