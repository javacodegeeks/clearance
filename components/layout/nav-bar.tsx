'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function NavBar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="border-b nav-bar"
      style={{
        backgroundColor: 'var(--surface-elevated)',
        borderColor: 'var(--border-standard)',
      }}
    >
      <div className="container mx-auto px-6 py-4 flex justify-between items-center">
        <Link
          href="/"
          className="font-mono text-base font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          $ clearance
        </Link>
        <div className="flex gap-6 font-mono text-xs">
          <Link
            href="/"
            className="transition-colors nav-link"
            style={{
              color: isActive('/') ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {isActive('/') ? '[queue]' : 'queue'}
          </Link>
          <Link
            href="/trends"
            className="transition-colors nav-link"
            style={{
              color: isActive('/trends') ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {isActive('/trends') ? '[trends]' : 'trends'}
          </Link>
          <Link
            href="/review-standards"
            className="transition-colors nav-link"
            style={{
              color: isActive('/review-standards') ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {isActive('/review-standards') ? '[standards]' : 'standards'}
          </Link>
          <Link
            href="/settings"
            className="transition-colors nav-link"
            style={{
              color: isActive('/settings') ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {isActive('/settings') ? '[settings]' : 'settings'}
          </Link>
          <Link
            href="/help"
            className="transition-colors nav-link"
            style={{
              color: isActive('/help') ? 'var(--text-primary)' : 'var(--text-secondary)',
            }}
          >
            {isActive('/help') ? '[help]' : 'help'}
          </Link>
        </div>
      </div>
    </nav>
  );
}
