import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Calendar, ShoppingCart, Settings, Plus, User, LogOut, LogIn, Library, Menu, Bell, UserPlus, Copy, CheckCheck, Compass, BookmarkPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

interface NavigationProps {
  onAddRecipe: () => void;
}

export function Navigation({ onAddRecipe }: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const navItems = [
    { to: '/recipes', label: 'My Recipes', icon: UtensilsCrossed },
    { to: '/meal-plan', label: 'Meal Plan', icon: Calendar },
    { to: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
    { to: '/discover', label: 'Discover', icon: Compass },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return 'U';
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon" className="mr-1">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary">
                    <UtensilsCrossed className="h-4 w-4 text-primary-foreground" />
                  </div>
                  Recipe Stash
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 mt-6">
                {navItems.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) => cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </NavLink>
                ))}
              </nav>
            </SheetContent>
          </Sheet>

          <NavLink to="/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
              <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-serif text-xl font-semibold tracking-tight hidden sm:inline">Recipe Stash</span>
          </NavLink>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                isActive 
                  ? "bg-secondary text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Button onClick={onAddRecipe} size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add Recipe</span>
          </Button>

          {/* Notification Bell */}
          {user && (
            <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-80" align="end" forceMount>
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        markAllAsRead();
                      }}
                      className="text-xs text-primary hover:underline font-normal flex items-center gap-1"
                    >
                      <CheckCheck className="h-3 w-3" />
                      Mark all read
                    </button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notifications.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    No notifications yet
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <DropdownMenuItem
                        key={notification.id}
                        className={cn(
                          "flex items-start gap-3 p-3 cursor-pointer",
                          !notification.read && "bg-primary/5"
                        )}
                        onClick={() => {
                          if (!notification.read) markAsRead(notification.id);
                          if (notification.type === 'new_follower' && notification.data.follower_id) {
                            setNotificationsOpen(false);
                          } else if (notification.type === 'plan_cloned' && notification.data.meal_plan_id) {
                            setNotificationsOpen(false);
                          } else if (notification.type === 'recipe_saved') {
                            setNotificationsOpen(false);
                          }
                        }}
                      >
                        <div className="shrink-0 mt-0.5">
                          {notification.type === 'new_follower' ? (
                            <UserPlus className="h-4 w-4 text-primary" />
                          ) : notification.type === 'recipe_saved' ? (
                            <BookmarkPlus className="h-4 w-4 text-primary" />
                          ) : (
                            <Copy className="h-4 w-4 text-primary" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm">
                            {notification.type === 'new_follower'
                              ? <><span className="font-medium">{notification.data.follower_name}</span> started following you</>
                              : notification.type === 'recipe_saved'
                              ? <><span className="font-medium">{notification.data.saver_name || 'Someone'}</span> saved your recipe: {notification.data.recipe_title}</>
                              : <><span className="font-medium">{notification.data.cloner_name}</span> saved your meal plan: {notification.data.plan_title}</>
                            }
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatTimeAgo(notification.created_at)}
                          </p>
                        </div>
                        {!notification.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </DropdownMenuItem>
                    ))}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.display_name || 'User'} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {profile?.display_name || 'User'}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/recipes')}>
                  <UtensilsCrossed className="mr-2 h-4 w-4" />
                  My Recipes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="outline" onClick={() => navigate('/auth')} className="gap-2">
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign In</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
