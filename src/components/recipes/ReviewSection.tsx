import { useState } from 'react';
import { useRecipeReviews } from '@/hooks/useRecipeReviews';
import { useAuth } from '@/context/AuthContext';
import { StarRating } from './StarRating';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface ReviewSectionProps {
  recipeId: string;
  recipeOwnerId?: string;
}

export function ReviewSection({ recipeId, recipeOwnerId }: ReviewSectionProps) {
  const { user } = useAuth();
  const { rating, reviews, userReview, isLoading, submitReview, deleteReview, isSubmitting } = useRecipeReviews(recipeId);
  const { toast } = useToast();
  const [newRating, setNewRating] = useState(0);
  const [newText, setNewText] = useState('');

  const isOwnRecipe = user?.id === recipeOwnerId;
  const canReview = user && !isOwnRecipe && !userReview;

  const handleSubmit = async () => {
    if (newRating === 0) {
      toast({ title: 'Please select a rating', variant: 'destructive' });
      return;
    }

    try {
      await submitReview({ rating: newRating, reviewText: newText.trim() || undefined });
      setNewRating(0);
      setNewText('');
      toast({ title: 'Review submitted!' });
    } catch {
      toast({ title: 'Failed to submit review', variant: 'destructive' });
    }
  };

  const handleDelete = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      toast({ title: 'Review deleted' });
    } catch {
      toast({ title: 'Failed to delete review', variant: 'destructive' });
    }
  };

  if (isLoading) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <h3 className="font-semibold text-sm">Reviews</h3>
        {rating.averageRating && (
          <div className="flex items-center gap-1.5">
            <StarRating rating={Math.round(rating.averageRating)} size="sm" />
            <span className="text-sm text-muted-foreground">
              {rating.averageRating} ({rating.reviewCount})
            </span>
          </div>
        )}
      </div>

      {/* Review form */}
      {canReview && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Your rating:</span>
            <StarRating rating={newRating} interactive onChange={setNewRating} size="md" />
          </div>
          <Textarea
            placeholder="Write a review (optional)"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            rows={2}
            className="resize-none text-sm"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || newRating === 0}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Review'
            )}
          </Button>
        </div>
      )}

      {/* Reviews list */}
      {reviews.length > 0 ? (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarImage src={review.avatarUrl || undefined} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(review.displayName || review.username || 'U')[0].toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    {review.displayName || review.username || 'Anonymous'}
                  </span>
                  <StarRating rating={review.rating} size="sm" />
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                  </span>
                  {review.userId === user?.id && (
                    <button
                      onClick={() => handleDelete(review.id)}
                      className="text-muted-foreground hover:text-destructive ml-auto"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                {review.reviewText && (
                  <p className="text-sm text-muted-foreground mt-0.5">{review.reviewText}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : !canReview ? (
        <p className="text-sm text-muted-foreground">No reviews yet.</p>
      ) : null}
    </div>
  );
}
