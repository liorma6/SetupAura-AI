import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Sparkles, Lock, Zap, Star, Crown, Mail } from 'lucide-react';

const ADMIN_EMAIL = 'liorma6@gmail.com';

const THEMES = [
    { label: 'Premium RGB Gaming Room', value: 'Premium RGB Gaming Room', free: true },
    { label: 'Anime Gaming Setup', value: 'Anime Gaming Setup', free: false },
    { label: 'Retro/Nintendo Gaming Setup', value: 'Retro/Nintendo Gaming Setup', free: false },
];

const TIERS = [
    { icon: Zap, label: 'Starter', price: '$4.99', detail: '10 Images', color: 'from-blue-500 to-cyan-500', checkoutUrl: 'https://setupaura.lemonsqueezy.com/checkout/buy/52ccba52-8300-423c-b8a7-3b9dca4c0880' },
    { icon: Star, label: 'Pro', price: '$14.99', detail: '40 Images', color: 'from-purple-500 to-pink-500', popular: true, checkoutUrl: 'https://setupaura.lemonsqueezy.com/checkout/buy/7ea722c8-66bc-4079-979e-a3f2c269b5d1' },
    { icon: Crown, label: 'Elite', price: '$29.99', detail: '100 Images', color: 'from-yellow-500 to-amber-500', checkoutUrl: 'https://setupaura.lemonsqueezy.com/checkout/buy/30136c03-b4d6-4eb6-b932-51200bf51369' },
];

const getStoredEmail = () => {
    try { return (localStorage.getItem('setupaura_email') || '').trim(); }
    catch { return ''; }
};

const getInitialView = () => {
    if (new URLSearchParams(window.location.search).get('view') === 'pricing') return 'pricing';
    const email = getStoredEmail();
    if (!email) return 'email';
    if (email.toLowerCase() === ADMIN_EMAIL.toLowerCase()) return 'ready';
    return 'pricing';
};

export const RecommendationsScreen = () => {
    const { uploadedImage } = useApp();

    const [view, setView] = useState(getInitialView);
    const [userEmail, setUserEmail] = useState(getStoredEmail);
    const [emailInput, setEmailInput] = useState('');
    const [selectedTheme, setSelectedTheme] = useState(THEMES[0].value);
    const [aiImage, setAiImage] = useState(null);
    const [error, setError] = useState('');
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState('');

    const isAdmin = userEmail.toLowerCase() === ADMIN_EMAIL.toLowerCase();

    const toBase64 = (blobUrl) => new Promise((resolve, reject) => {
        fetch(blobUrl)
            .then(r => r.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            })
            .catch(reject);
    });

    const handleEmailSubmit = (e) => {
        e.preventDefault();
        const email = emailInput.trim();
        if (!email) return;
        try { localStorage.setItem('setupaura_email', email); } catch { }
        setUserEmail(email);
        setView('ready');
    };

    const runGeneration = async () => {
        if (!userEmail) { setView('email'); return; }
        setView('loading');
        setError('');
        try {
            let imagePayload = uploadedImage;
            if (imagePayload && imagePayload.startsWith('blob:')) {
                imagePayload = await toBase64(imagePayload);
            }
            const res = await fetch('http://localhost:3000/api/generate-design', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ image: imagePayload, email: userEmail, theme: selectedTheme })
            });
            const data = await res.json();
            if (res.status === 403) { setView('pricing'); return; }
            if (!res.ok) throw new Error(data.error || 'Generation failed');
            setAiImage(data.imageUrl);
            setView(isAdmin ? 'result' : 'pricing');
        } catch (err) {
            setError(err.message);
            setView('ready');
        }
    };

    const handleThemeClick = (t) => {
        if (!isAdmin && !t.free) {
            setView('pricing');
            return;
        }
        setSelectedTheme(t.value);
        if (!isAdmin && view === 'pricing') {
            return;
        }
        if (view === 'pricing') {
            if (!userEmail) {
                setView('email');
            } else {
                setView('ready');
            }
        }
    };

    const handleSubmitReview = async () => {
        try {
            await fetch('http://localhost:3000/api/submit-review', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rating, feedback: reviewText })
            });
        } catch { }
        alert('Thank you for your feedback!');
        setRating(0);
        setReviewText('');
    };

    const ThemeSelector = () => (
        <div className="w-full max-w-md space-y-3 mb-8">
            <p className="text-xs font-bold text-gray-500 tracking-widest uppercase mb-1">Select Theme</p>
            {THEMES.map(t => (
                <button
                    key={t.value}
                    onClick={() => handleThemeClick(t)}
                    className={`w-full p-4 rounded-xl border flex justify-between items-center transition-all
                        ${selectedTheme === t.value ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5 hover:border-white/20'}
                        ${!t.free && !isAdmin ? 'opacity-70' : ''}`}
                >
                    <span className="font-medium text-sm">{t.label}</span>
                    {!t.free && (
                        isAdmin
                            ? <span className="text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full">ADMIN</span>
                            : <span className="flex items-center gap-1 text-[10px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 rounded-full"><Lock className="w-2.5 h-2.5" /> PRO</span>
                    )}
                </button>
            ))}
        </div>
    );

    const PricingTiers = () => (
        <div id="pricing" className="w-full max-w-md mb-8">
            <div className="flex items-center justify-center gap-2 mb-5">
                <Lock className="w-4 h-4 text-gray-400" />
                <p className="text-gray-400 text-sm font-semibold">Unlock more generations & themes</p>
            </div>
            <div className="space-y-3">
                {TIERS.map(({ icon: Icon, label, price, detail, color, popular, checkoutUrl }) => (
                    <a
                        key={label}
                        href={checkoutUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`w-full p-4 rounded-xl border ${popular ? 'border-purple-500 bg-purple-500/10' : 'border-white/10 bg-white/5'} flex items-center gap-4 relative hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                    >
                        {popular && <span className="absolute -top-2.5 right-4 text-[10px] font-bold bg-purple-500 text-white px-2 py-0.5 rounded-full">MOST POPULAR</span>}
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
                            <Icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-baseline justify-between">
                                <span className="font-bold text-white">{label}</span>
                                <span className={`font-bold text-transparent bg-clip-text bg-gradient-to-r ${color}`}>{price}</span>
                            </div>
                            <p className="text-xs text-gray-400">{detail}</p>
                        </div>
                    </a>
                ))}
            </div>
        </div>
    );

    const ReviewSection = () => (
        <div className="w-full max-w-md mb-8">
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                    <Mail className="w-4 h-4 text-purple-400" />
                    <p className="text-sm font-semibold">Need help?</p>
                </div>
                <a href="mailto:liorma6@gmail.com" className="text-purple-400 text-sm hover:underline">liorma6@gmail.com</a>
            </div>
            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <h4 className="text-sm font-bold text-center mb-3">Rate Your Experience</h4>
                <div className="flex gap-1 justify-center my-2">
                    {[1, 2, 3, 4, 5].map(n => (
                        <button key={n} onClick={() => setRating(n)} className={`text-2xl transition-transform hover:scale-125 ${n <= rating ? 'text-yellow-400' : 'text-gray-600'}`}>★</button>
                    ))}
                </div>
                <textarea
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    placeholder="Share your thoughts..."
                    rows={3}
                    className="w-full mt-3 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
                />
                <button onClick={handleSubmitReview} className="w-full mt-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg font-bold text-sm hover:scale-105 transition-transform active:scale-95">
                    Submit Review
                </button>
            </div>
        </div>
    );

    const ResultImages = () => (
        <div className="w-full max-w-md mb-8">
            {uploadedImage && (
                <div className="mb-4">
                    <p className="text-xs font-bold text-gray-500 mb-1.5 tracking-wider">BEFORE</p>
                    <div className="rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/50">
                        <img src={uploadedImage} alt="Before" className="w-full h-full object-cover" />
                    </div>
                </div>
            )}
            <div className="flex items-center gap-2 mb-1.5">
                <Sparkles className="w-3 h-3 text-purple-400" />
                <p className="text-xs font-bold text-purple-400 tracking-widest uppercase">AI Upgrade</p>
            </div>
            <div className="rounded-2xl overflow-hidden border-2 border-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.3)] aspect-video">
                <img src={aiImage} className="w-full h-full object-cover" alt="AI Result" />
            </div>
        </div>
    );

    if (view === 'email') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
                <Mail className="w-16 h-16 text-purple-500 mb-6" />
                <h2 className="text-3xl font-bold mb-2">Try For Free</h2>
                <p className="text-gray-400 mb-8">Enter your email to get your free AI room transformation.</p>
                <form onSubmit={handleEmailSubmit} className="w-full max-w-sm space-y-4">
                    <input
                        type="email"
                        required
                        placeholder="you@example.com"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-white placeholder-gray-500 focus:border-purple-500 outline-none"
                    />
                    <button type="submit" className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold hover:scale-105 transition-transform active:scale-95 flex items-center justify-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Continue
                    </button>
                </form>
            </div>
        );
    }

    if (view === 'loading') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center p-6 text-center">
                <div className="animate-spin h-16 w-16 border-4 border-purple-500 border-t-transparent rounded-full mb-8" />
                <h2 className="text-2xl font-bold animate-pulse">Designing your dream room...</h2>
                <p className="text-gray-400 mt-4">This takes about a minute. We'll also email you the result!</p>
            </div>
        );
    }

    if (view === 'pricing') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-6 overflow-y-auto pb-20">
                <header className="w-full max-w-md flex items-center justify-between mb-8 pt-4">
                    <h1 className="text-xl font-bold text-purple-400">SetupAura AI</h1>
                </header>
                {aiImage && <ResultImages />}
                <ThemeSelector />
                <PricingTiers />
                <ReviewSection />
            </div>
        );
    }

    if (view === 'ready' || view === 'result') {
        return (
            <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center p-6 overflow-y-auto pb-20">
                <header className="w-full max-w-md flex items-center justify-between mb-8 pt-4">
                    <h1 className="text-xl font-bold text-purple-400">SetupAura AI</h1>
                    {isAdmin && <span className="text-[10px] bg-blue-500 px-2 py-1 rounded font-bold">ADMIN MODE</span>}
                </header>
                {aiImage && <ResultImages />}
                <ThemeSelector />
                {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
                <button
                    onClick={runGeneration}
                    className="w-full max-w-md py-4 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl font-bold text-lg shadow-lg hover:scale-[1.02] active:scale-95 transition-transform mb-8 flex items-center justify-center gap-2"
                >
                    <Sparkles className="w-5 h-5" />
                    {aiImage ? 'Generate Another Design' : 'Generate My Design'}
                </button>
                <ReviewSection />
            </div>
        );
    }

    return null;
};
