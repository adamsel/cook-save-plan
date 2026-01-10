import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { UtensilsCrossed, Calendar, ShoppingCart, Settings, Plus, User, LogOut, LogIn, Library } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface NavigationProps {
  onAddRecipe: () => void;
}

export function Navigation({ onAddRecipe }: NavigationProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile, signOut } = useAuth();

  const navItems = [
    { to: '/recipes', label: 'My Recipes', icon: UtensilsCrossed },
    { to: '/meal-plan', label: 'Meal Plan', icon: Calendar },
    { to: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
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
        <NavLink to="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary">
            <UtensilsCrossed className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl font-semibold tracking-tight">Recipe Stash</span>
        </NavLink>

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

      {/* Mobile navigation */}
      <nav className="md:hidden flex items-center justify-around border-t border-border/50 py-2 px-2">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              isActive 
                ? "text-primary" 
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-5 w-5" />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}
