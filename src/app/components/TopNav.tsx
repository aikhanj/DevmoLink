import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Flame, Heart, MessageCircle, User, Compass } from 'lucide-react';

const navItems = [
  { href: '/', label: 'Home', icon: Flame },
  { href: '/likes', label: 'Likes', icon: Heart },
  { href: '/chats', label: 'Chats', icon: MessageCircle },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/explore', label: 'Explore', icon: Compass },
];

export default function TopNav() {
  const pathname = usePathname();
  return (
    <nav className="hidden md:flex fixed top-0 left-0 w-full z-40 bg-black/60 backdrop-blur-lg shadow-inner h-16 items-center px-8 gap-8">
      <span className="font-mono text-2xl font-bold text-[#00FFAB] select-none tracking-tight">HackMatch</span>
      <div className="flex gap-6 ml-8">
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
      </div>
    </nav>
  );
} 