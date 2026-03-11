import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const FREE_RECIPE_LIMIT = 25;

export function useSubscription() {
  const { profile } = useAuth();
  const { toast } = useToast();

  const isPremium = profile?.subscription_tier === 'premium';

  const checkout = async () => {
    // Stripe integration not yet configured — show coming soon message
    toast({
      title: 'Coming soon',
      description: 'Premium subscriptions will be available shortly.',
    });
  };

  const manageSubscription = async () => {
    toast({
      title: 'Coming soon',
      description: 'Subscription management will be available shortly.',
    });
  };

  return { isPremium, checkout, manageSubscription };
}
