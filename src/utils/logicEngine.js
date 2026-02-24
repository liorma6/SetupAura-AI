export const calculateScore = (filename) => {
    // Generate a pseudo-random score based on filename to ensure consistency per "image"
    // This mocks AI analysis
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
        hash = filename.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Normalize to 40-95 range
    const normalized = Math.abs(hash % 55) + 40;

    const verdicts = [
        { min: 0, max: 50, label: "CHAOTIC NEUTRAL", color: "text-red-500", desc: "Your setup is a cry for help. The cables are staging a rebellion." },
        { min: 51, max: 70, label: "WORK IN PROGRESS", color: "text-yellow-500", desc: "You have the spirit, but your execution needs polish. Good bones." },
        { min: 71, max: 85, label: "SOLID FOUNDATION", color: "text-blue-400", desc: "Clean, functional, and respectable. Just missing that 'wow' factor." },
        { min: 86, max: 100, label: "AURA MASTER", color: "text-primary", desc: "Absolute cinema. This setup belongs on a Pinterest board." }
    ];

    const verdict = verdicts.find(v => normalized >= v.min && normalized <= v.max) || verdicts[0];

    return {
        score: normalized,
        verdict: verdict,
        breakdown: [
            { label: "Cable Management", score: Math.min(10, Math.floor(normalized / 10) + (hash % 2)), max: 10 },
            { label: "Color Harmony", score: Math.min(10, Math.floor(normalized / 12) + 2), max: 10 },
            { label: "Ergonomics", score: Math.min(10, Math.floor(normalized / 11) + 1), max: 10 },
        ]
    };
};

export const getRecommendations = (score, themeId) => {
    const baseRecs = [
        {
            title: "Cable Management",
            icon: "cable",
            desc: "Use velcro ties to bundle cables behind the monitor arm. Route keyboard cable through a desk mat hole.",
            priority: "high"
        },
        {
            title: "Monitor Ergonomics",
            icon: "monitor",
            desc: "Top of screen should be at eye level. Consider a monitor arm to clear desk space.",
            priority: "medium"
        }
    ];

    const themeRecs = {
        cyberpunk: [
            { title: "Neon Bias Lighting", icon: "light", desc: "Add an RGB strip behind the desk. Set to Cyan/Purple gradient.", priority: "high" },
            { title: "Digital Clock", icon: "clock", desc: "A retro VFD tube clock or pixel art display adds to the vibe.", priority: "low" }
        ],
        minimalist: [
            { title: "Declutter Surface", icon: "trash", desc: "Remove everything except peripherals. Use a drawer for diverse items.", priority: "high" },
            { title: "Wireless Everything", icon: "wifi", desc: "Switch to wireless mouse/keyboard to eliminate visual noise.", priority: "medium" }
        ],
        cozy: [
            { title: "Warm Lighting", icon: "sun", desc: "Use a warm (2700K) desk lamp. Avoid harsh cool whites.", priority: "high" },
            { title: "Plant Life", icon: "plant", desc: "Add a Pothos or small succulent to soften the tech edges.", priority: "medium" }
        ]
    };

    // Default to cyberpunk if theme not found
    const specificRecs = themeRecs[themeId] || themeRecs['cyberpunk'];

    return [...baseRecs, ...specificRecs];
};
