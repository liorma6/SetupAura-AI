import { Check, Crown, Star, Zap } from 'lucide-react';
import { usePostHog } from '@posthog/react';

const tiers = [
    {
        id: 'starter',
        name: 'Starter',
        price: '$4.99',
        subtitle: 'Perfect for a quick room refresh',
        features: ['10 AI design generations', '1 premium theme unlock', 'Priority rendering'],
        color: 'from-cyan-500 to-blue-600',
        popular: false,
        checkoutUrl: 'https://liorma.gumroad.com/l/setupaura-starter',
    },
    {
        id: 'pro',
        name: 'Pro',
        price: '$14.99',
        subtitle: 'Best value for full setup planning',
        features: ['40 AI design generations', 'All premium themes', 'Exact-match shopping list'],
        color: 'from-fuchsia-500 to-purple-600',
        popular: true,
        checkoutUrl: 'https://liorma.gumroad.com/l/setupaura-pro',
    },
    {
        id: 'elite',
        name: 'Elite',
        price: '$29.99',
        subtitle: 'For serious creators and streamers',
        features: ['100 AI design generations', 'Everything in Pro', 'Early access to new drops'],
        color: 'from-amber-400 to-orange-600',
        popular: false,
        checkoutUrl: 'https://liorma.gumroad.com/l/setupaura-elite',
    },
];

const tierIcon = {
    starter: Zap,
    pro: Star,
    elite: Crown,
};

export const PricingScreen = () => {
    const posthog = usePostHog();

    const handleCheckoutClick = (tier) => {
        const value = Number(String(tier.price).replace(/[^0-9.]/g, '')) || 0;
        posthog.capture('InitiateCheckout', { tier: tier.name, value, currency: 'USD' });
        if (typeof window !== 'undefined' && window.fbq) {
            window.fbq('track', 'InitiateCheckout', { content_name: tier.name, value, currency: 'USD' });
        }
    };

    return (
        <div className="min-h-screen bg-[#09090f] text-white px-6 py-10 overflow-y-auto">
            <div className="max-w-md mx-auto">
                <header className="text-center mb-8">
                    <p className="text-xs tracking-[0.25em] uppercase text-purple-300/80 font-bold">Upgrade</p>
                    <h1 className="text-3xl font-display font-extrabold mt-2">Choose Your Plan</h1>
                    <p className="text-gray-400 mt-2 text-sm">Unlock premium themes, shopping links, and more design generations.</p>
                </header>

                <div className="space-y-4">
                    {tiers.map((tier) => {
                        const Icon = tierIcon[tier.id];
                        return (
                            <div
                                key={tier.id}
                                className={`relative rounded-2xl border p-5 bg-white/5 backdrop-blur-sm ${tier.popular ? 'border-purple-400 shadow-[0_0_35px_rgba(168,85,247,0.35)]' : 'border-white/10'}`}
                            >
                                {tier.popular && (
                                    <span className="absolute -top-2.5 right-4 text-[10px] font-bold bg-purple-500 text-white px-2.5 py-1 rounded-full tracking-wide">
                                        MOST POPULAR
                                    </span>
                                )}

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                                                <Icon className="w-4 h-4 text-white" />
                                            </div>
                                            <h2 className="text-xl font-bold">{tier.name}</h2>
                                        </div>
                                        <p className="text-gray-400 text-xs mt-2">{tier.subtitle}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r ${tier.color}`}>{tier.price}</p>
                                        <p className="text-[11px] text-gray-500">one-time</p>
                                    </div>
                                </div>

                                <ul className="mt-4 space-y-2">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2 text-sm text-gray-200">
                                            <Check className="w-4 h-4 text-emerald-400" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>

                                <a
                                    href={tier.checkoutUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={() => handleCheckoutClick(tier)}
                                    className={`mt-5 block w-full text-center py-3 rounded-xl font-bold tracking-wide bg-gradient-to-r ${tier.color} hover:scale-[1.01] active:scale-95 transition-transform`}
                                >
                                    Upgrade Now
                                </a>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
