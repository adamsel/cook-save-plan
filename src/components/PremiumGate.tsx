import { ReactNode } from 'react';
import { useSubscription } from '@/hooks/useSubscription';
import { Button } from '@/components/ui/button';
import { Crown, Sparkles, Camera, BarChart3, BookOpen, Upload } from 'lucide-react';

interface PremiumGateProps {
  children: ReactNode;
  feature: 'ai-chat' | 'photo-import' | 'meal-analysis' | 'unlimited-recipes' | 'bulk-import';
}

const FEATURE_INFO: Record<PremiumGateProps['feature'], {
  icon: typeof Crown;
  title: string;
  description: string;
  benefits: string[];
}> = {
  'ai-chat': {
    icon: Sparkles,
    title: 'AI Recipe Chat',
    description: 'Describe any meal and our AI will create a full recipe with ingredients and instructions.',
    benefits: [
      'Generate recipes from a description',
      'Ask follow-up questions to refine',
      'Adjust servings, swap ingredients',
    ],
  },
  'photo-import': {
    icon: Camera,
    title: 'Photo Import',
    description: 'Snap a photo of any cookbook page, recipe card, or screenshot and we\'ll extract the recipe.',
    benefits: [
      'Import from cookbook photos',
      'Extract from Instagram screenshots',
      'Digitise handwritten recipe cards',
    ],
  },
  'meal-analysis': {
    icon: BarChart3,
    title: 'Meal Plan Analysis',
    description: 'Get a weekly nutrition breakdown and AI-powered insights on your meal plan.',
    benefits: [
      'Weekly nutrition summary',
      'Macro balance insights',
      'Smart suggestions for variety',
    ],
  },
  'unlimited-recipes': {
    icon: BookOpen,
    title: 'Unlimited Recipes',
    description: 'Free accounts can store up to 25 recipes. Upgrade for unlimited storage.',
    benefits: [
      'Unlimited recipe storage',
      'All import methods',
      'Priority support',
    ],
  },
  'bulk-import': {
    icon: Upload,
    title: 'Bulk Recipe Import',
    description: 'Import dozens of recipes at once from blog URLs or a CSV spreadsheet.',
    benefits: [
      'Import up to 50 recipes from blog URLs',
      'Upload a CSV spreadsheet of recipes',
      'Review and edit before saving',
    ],
  },
};

export function PremiumGate({ children, feature }: PremiumGateProps) {
  const { isPremium } = useSubscription();

  if (isPremium) return <>{children}</>;

  return <UpgradePrompt feature={feature} />;
}

function UpgradePrompt({ feature }: { feature: PremiumGateProps['feature'] }) {
  const { checkout } = useSubscription();
  const info = FEATURE_INFO[feature];
  const Icon = info.icon;

  return (
    <div className="flex flex-col items-center text-center p-6 sm:p-8 space-y-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Crown className="h-4 w-4 text-amber-500" />
          {info.title}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {info.description}
        </p>
      </div>
      <ul className="text-sm text-left space-y-1.5 w-full max-w-xs">
        {info.benefits.map((benefit, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className="text-primary mt-0.5">&#10003;</span>
            <span>{benefit}</span>
          </li>
        ))}
      </ul>
      <Button onClick={checkout} className="gap-2 mt-2">
        <Crown className="h-4 w-4" />
        Upgrade to Premium
      </Button>
      <p className="text-xs text-muted-foreground">$4.99/month &middot; Cancel anytime</p>
    </div>
  );
}
