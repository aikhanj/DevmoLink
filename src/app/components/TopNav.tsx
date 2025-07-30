import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Flame, Heart, MessageCircle, User, Settings } from 'lucide-react';


const navItems = [
  { href: '/', label: 'Home', icon: Flame },
  { href: '/likes', label: 'Likes', icon: Heart },
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User }
];

interface TopNavProps {
  onSettingsClick?: () => void;
  settingsOpen?: boolean;
}

export default function TopNav({ onSettingsClick, settingsOpen = false }: TopNavProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <nav className="hidden md:flex fixed top-0 left-0 w-full z-40 bg-black/60 backdrop-blur-lg shadow-inner h-16 items-center justify-between px-8">
      <button
        onClick={() => router.push('/')} 
        className="font-mono text-2xl font-bold text-[#00FFAB] select-none tracking-tight"
        style={{ background: 'none', border: 'none', outline: 'none' }}
        aria-label="Go to home"
      >
        devmolink
      </button>
      <div className="flex gap-6 items-center">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={
                `flex items-center gap-2 px-3 py-2 font-medium text-base relative transition-colors duration-150 group ` +
                (isActive ? 'text-emerald-400' : 'text-gray-300 hover:text-white')
              }
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-gray-400 group-hover:text-white'}`} />
              <span>{label}</span>
              <span className={`absolute left-0 -bottom-1 w-full h-0.5 bg-gradient-to-r from-[#00FFAB] to-[#009E6F] rounded transition-all duration-300 scale-x-0 group-hover:scale-x-100 ${isActive ? 'scale-x-100' : ''}`} style={{ transformOrigin: 'left' }} />
            </Link>
          );
        })}
        {onSettingsClick && (
          <button
            className={`z-[60] flex items-center px-2 py-1 ml-4 transition duration-200 hover:scale-105 ${settingsOpen ? 'text-[#00FFAB] font-bold active-tab' : ''}`}
            onClick={onSettingsClick}
            aria-label="Open settings"
          >
            <Settings className={`w-6 h-6 ${settingsOpen ? 'text-[#00FFAB] drop-shadow-[0_0_8px_#00FFAB]' : 'text-gray-200'}`} />
          </button>
        )}
      </div>
    </nav>
  );
} 