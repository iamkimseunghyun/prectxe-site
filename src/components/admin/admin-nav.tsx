'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Archive,
  FileText,
  Users,
  MapPin,
  Image,
  type LucideIcon,
} from 'lucide-react';

interface NavItem {
  value: string;
  label: string;
  icon: LucideIcon;
  href: string;
}

const ADMIN_TABS: NavItem[] = [
  {
    value: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/admin',
  },
  {
    value: 'programs',
    label: 'Programs',
    icon: Archive,
    href: '/admin/programs',
  },
  {
    value: 'journal',
    label: 'Journal',
    icon: FileText,
    href: '/admin/journal',
  },
  { value: 'artists', label: 'Artists', icon: Users, href: '/admin/artists' },
  { value: 'venues', label: 'Venues', icon: MapPin, href: '/admin/venues' },
  {
    value: 'artworks',
    label: 'Artworks',
    icon: Image,
    href: '/admin/artworks',
  },
];

export function AdminNav() {
  const pathname = usePathname();

  const getActiveTab = () => {
    // Exact match for dashboard
    if (pathname === '/admin') return 'dashboard';
    // Check for section matches
    for (const tab of ADMIN_TABS) {
      if (tab.href !== '/admin' && pathname.startsWith(tab.href)) {
        return tab.value;
      }
    }
    return 'dashboard';
  };

  const activeTab = getActiveTab();

  return (
    <nav className="overflow-x-auto">
      <div className="inline-flex h-10 items-center gap-1 rounded-lg bg-muted p-1">
        {ADMIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;

          return (
            <Link
              key={tab.value}
              href={tab.href}
              className={cn(
                'inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-all',
                'hover:bg-background/50',
                isActive
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
