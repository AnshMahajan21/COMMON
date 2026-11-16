import React, { useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  Compass,
  Home,
  Info,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  Search,
  Ticket,
  User as UserIcon,
  Users,
  UsersRound,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Avatar, CommonLogo } from './BrandAndIcons';

const DESKTOP_NAV = [
  { to: '/', label: 'Discover', icon: Home, end: true },
  { to: '/activities', label: 'Activities', icon: Compass },
  { to: '/tickets', label: 'My Tickets', icon: Ticket },
  { to: '/people', label: 'People', icon: Users },
  { to: '/communities', label: 'Communities', icon: UsersRound },
  { to: '/my-activities', label: 'My Activities', icon: CalendarCheck },
  { to: '/messages', label: 'Messages', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: UserIcon },
  { to: '/about', label: 'About', icon: Info },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    navigate(trimmed ? `/activities?q=${encodeURIComponent(trimmed)}` : '/activities');
  };

  const handleLogout = async () => {
    await logout();
    setMobileMenuOpen(false);
    navigate('/');
  };

  const handleCreateActivity = () => {
    if (!user) {
      navigate(`/login?next=${encodeURIComponent('/activities/new')}`);
    } else {
      navigate('/activities/new');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F5EE] text-[#2B3322] flex flex-col md:flex-row">
      {/* Desktop / Tablet Left Sidebar */}
      <aside
        aria-label="Primary sidebar navigation"
        className="hidden md:flex md:w-60 lg:w-64 md:flex-col md:fixed md:inset-y-0 md:left-0 bg-[#FEFAE0] border-r border-[#E4DEC3] z-30"
      >
        <div className="px-6 py-5 border-b border-[#E4DEC3]/70">
          <Link to="/" className="inline-flex items-center focus-visible:outline-none">
            <CommonLogo />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-1">
          {DESKTOP_NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-colors duration-150 whitespace-nowrap ${
                    isActive
                      ? 'bg-[#E9EDC9] text-[#2B3322] font-semibold'
                      : 'text-[#5A4D3F] hover:bg-[#FAEDCD]/60 hover:text-[#2B3322]'
                  }`
                }
              >
                <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E4DEC3]/80">
          {user ? (
            <div className="space-y-3">
              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-2xl p-2 hover:bg-[#FAEDCD]/60 transition-colors"
              >
                <Avatar user={user} size="sm" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#2B3322] truncate">
                    {user.fullName}
                  </p>
                  <p className="text-xs text-[#5A4D3F] truncate">{user.location}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#D7DEB0] px-3 py-2 text-xs font-medium text-[#5A4D3F] hover:bg-[#E9EDC9]/70 hover:text-[#2B3322] transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                Sign out
              </button>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#E9EDC9]/75 p-4 space-y-3">
              <p className="text-xs leading-relaxed text-[#4A4238]">
                Join local walks, coffee mornings, sports, and book circles across Delhi-NCR.
              </p>
              <div className="flex flex-col gap-2">
                <Link
                  to={`/login?next=${encodeURIComponent(location.pathname)}`}
                  className="w-full text-center rounded-xl bg-[#2B3322] px-3 py-2 text-xs font-semibold text-[#FEFAE0] hover:bg-[#3B462F] transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  to="/signup"
                  className="w-full text-center rounded-xl bg-[#FEFAE0] border border-[#D7DEB0] px-3 py-2 text-xs font-medium text-[#2B3322] hover:bg-[#FAEDCD] transition-colors"
                >
                  Create account
                </Link>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col md:pl-60 lg:pl-64 min-w-0">
        {/* Top Bar */}
        <header className="sticky top-0 z-20 h-14 md:h-16 bg-[#F7F5EE]/90 backdrop-blur-md border-b border-[#E4DEC3]/80 px-4 md:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 md:hidden">
            <Link to="/" aria-label="COMMON Home">
              <CommonLogo />
            </Link>
          </div>

          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex items-center flex-1 max-w-md relative"
            role="search"
          >
            <label htmlFor="global-activity-search" className="sr-only">
              Search activities, neighborhoods, or interests
            </label>
            <Search
              className="w-4 h-4 text-[#5A4D3F] absolute left-3.5 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id="global-activity-search"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search walks, cafés, Lodhi Garden, badminton..."
              className="w-full rounded-full bg-[#FEFAE0] border border-[#E4DEC3] pl-10 pr-4 py-2 text-sm text-[#2B3322] placeholder:text-[#7A6E5D] focus:border-[#2B3322] focus:outline-none"
            />
          </form>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleCreateActivity}
              className="hidden md:inline-flex items-center gap-2 rounded-full bg-[#2B3322] px-4 py-2 text-sm font-medium text-[#FEFAE0] hover:bg-[#3B462F] transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Create Activity
            </button>

            {/* Mobile search shortcut & drawer menu */}
            <Link
              to="/activities"
              aria-label="Search activities"
              className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-[#2B3322] hover:bg-[#E9EDC9]"
            >
              <Search className="w-5 h-5" />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open navigation menu"
              className="md:hidden min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-[#2B3322] hover:bg-[#E9EDC9]"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 px-4 sm:px-6 md:px-8 py-6 md:py-8 pb-24 md:pb-12 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Floating Rounded Bottom Navigation */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-3 left-3 right-3 z-40 rounded-3xl liquid-glass shadow-lg px-2 h-15 flex items-center justify-around"
      >
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `min-h-[44px] min-w-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium rounded-2xl px-2 ${
              isActive ? 'text-[#2B3322] font-semibold' : 'text-[#5A4D3F]'
            }`
          }
        >
          <Home className="w-5 h-5" aria-hidden="true" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/activities"
          className={({ isActive }) =>
            `min-h-[44px] min-w-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium rounded-2xl px-2 ${
              isActive ? 'text-[#2B3322] font-semibold' : 'text-[#5A4D3F]'
            }`
          }
        >
          <Compass className="w-5 h-5" aria-hidden="true" />
          <span>Explore</span>
        </NavLink>

        <button
          type="button"
          onClick={handleCreateActivity}
          aria-label="Create activity or event"
          className="-mt-5 w-12 h-12 rounded-full bg-[#D4A373] text-[#FEFAE0] shadow-md border-4 border-[#F7F5EE] flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </button>

        <NavLink
          to="/tickets"
          className={({ isActive }) =>
            `min-h-[44px] min-w-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium rounded-2xl px-2 ${
              isActive ? 'text-[#2B3322] font-semibold' : 'text-[#5A4D3F]'
            }`
          }
        >
          <Ticket className="w-5 h-5" aria-hidden="true" />
          <span>Tickets</span>
        </NavLink>

        <NavLink
          to={user ? '/profile' : '/login'}
          className={({ isActive }) =>
            `min-h-[44px] min-w-[48px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium rounded-2xl px-2 ${
              isActive ? 'text-[#2B3322] font-semibold' : 'text-[#5A4D3F]'
            }`
          }
        >
          <UserIcon className="w-5 h-5" aria-hidden="true" />
          <span>{user ? 'Profile' : 'Sign in'}</span>
        </NavLink>
      </nav>

      {/* Mobile Full Menu Sheet */}
      {mobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 z-50 bg-[#2B3322]/40 backdrop-blur-sm flex justify-end"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
        >
          <div className="w-72 max-w-[85vw] bg-[#FEFAE0] h-full p-5 flex flex-col justify-between shadow-2xl">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-[#E4DEC3]">
                <CommonLogo />
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close navigation menu"
                  className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-full text-[#2B3322] hover:bg-[#E9EDC9]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <nav className="mt-4 space-y-1">
                {DESKTOP_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3.5 py-3 rounded-2xl text-sm font-medium ${
                          isActive
                            ? 'bg-[#E9EDC9] text-[#2B3322] font-semibold'
                            : 'text-[#5A4D3F] hover:bg-[#FAEDCD]/60'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" aria-hidden="true" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <div className="pt-4 border-t border-[#E4DEC3]">
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 rounded-2xl bg-[#E9EDC9] px-4 py-3 text-sm font-semibold text-[#2B3322]"
                >
                  <LogOut className="w-4 h-4" aria-hidden="true" />
                  Sign out ({user.fullName.split(' ')[0]})
                </button>
              ) : (
                <div className="space-y-2">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-2xl bg-[#2B3322] px-4 py-3 text-sm font-semibold text-[#FEFAE0]"
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full text-center rounded-2xl border border-[#D7DEB0] bg-[#F7F5EE] px-4 py-3 text-sm font-medium text-[#2B3322]"
                  >
                    Create account
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
