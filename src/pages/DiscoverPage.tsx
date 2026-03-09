import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDiscoverCreators, type DiscoverCreator } from '@/hooks/useDiscoverCreators';
import { useFollowCreator } from '@/hooks/useFollowCreator';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Compass, Search, UserPlus, UserCheck, Loader2, ChefHat } from 'lucide-react';

function CreatorCard({ creator }: { creator: DiscoverCreator }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isFollowing, follow, unfollow, isLoading } = useFollowCreator(creator.userId);
  const isOwnProfile = user?.id === creator.userId;

  const initials = creator.displayName
    ? creator.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : creator.username[0].toUpperCase();

  const handleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate(`/auth?redirect=/discover`);
      return;
    }
    if (isFollowing) {
      unfollow();
    } else {
      follow();
    }
  };

  return (
    <Link to={`/creator/${creator.username}`}>
      <Card className="h-full hover:shadow-md transition-shadow">
        <CardContent className="p-4 flex flex-col h-full">
          <div className="flex items-start gap-3">
            <Avatar className="h-12 w-12 shrink-0">
              <AvatarImage src={creator.avatarUrl || undefined} alt={creator.displayName || creator.username} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate">
                {creator.displayName || creator.username}
              </p>
              <p className="text-sm text-muted-foreground">@{creator.username}</p>
            </div>
          </div>

          {creator.bio && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {creator.bio}
            </p>
          )}

          <div className="flex items-center justify-between mt-auto pt-4">
            <p className="text-xs text-muted-foreground">
              {creator.followerCount} {creator.followerCount === 1 ? 'follower' : 'followers'} · {creator.planCount} {creator.planCount === 1 ? 'plan' : 'plans'}
            </p>
            {!isOwnProfile && (
              <Button
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                onClick={handleFollow}
                disabled={isLoading}
                className={!isFollowing ? 'bg-[#2D6A4F] hover:bg-[#245A42] text-white' : ''}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="h-3.5 w-3.5 mr-1" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Follow
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

export default function DiscoverPage() {
  const { creators, isLoading } = useDiscoverCreators();
  const { user } = useAuth();
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? creators.filter(c =>
        (c.displayName || '').toLowerCase().includes(search.toLowerCase()) ||
        c.username.toLowerCase().includes(search.toLowerCase())
      )
    : creators;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-4xl animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Compass className="h-6 w-6 text-primary" />
            Discover Creators
          </h1>
          <p className="text-muted-foreground mt-1">
            Find creators to follow and get inspired by their meal plans
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(creator => (
            <CreatorCard key={creator.userId} creator={creator} />
          ))}
        </div>
      ) : search.trim() ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground">No creators match "{search}"</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
            <ChefHat className="h-8 w-8 text-primary" />
          </div>
          <h2 className="font-serif text-xl font-semibold mb-2">No creators yet</h2>
          <p className="text-muted-foreground max-w-md mb-6">
            Be the first to share your meal plans and build a following.
          </p>
          {user && (
            <Button asChild className="bg-[#2D6A4F] hover:bg-[#245A42] text-white">
              <Link to="/settings">Set up your creator profile</Link>
            </Button>
          )}
          {!user && (
            <Button asChild className="bg-[#2D6A4F] hover:bg-[#245A42] text-white">
              <Link to="/auth?creator=true">Join as a Creator</Link>
            </Button>
          )}
        </div>
      )}

      {/* CTA for non-creators */}
      {filtered.length > 0 && user && (
        <div className="mt-8 p-4 rounded-lg border bg-muted/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <p className="font-medium">Are you a food creator?</p>
            <p className="text-sm text-muted-foreground">Set up your profile and start sharing meal plans</p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link to="/settings">Set up profile</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
