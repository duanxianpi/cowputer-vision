'use client';

import CPBrand from '@/components/CPBrand';
import CPLogo from '@/components/CPLogo';
import { Bell, ChartColumnBig, CirclePlay, LayoutDashboard, LogOut, Settings, Video } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { RequireAuth } from '@/components/providers/AuthProvider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [selectedTab, setSelectedTab] = useState<string>("");
  const pathname = usePathname();

  interface Tabs {
    [key: string]: any;
  }
  const Tabs: Tabs = {
    "Overview": { label: "Overview", href: "/dashboard/overview", icon: <LayoutDashboard /> },
    "LiveCamera": { label: "Live Camera", href: "/dashboard/live-camera", icon: <Video /> },
    "Playback": { label: "Playback", href: "/dashboard/playback", icon: <CirclePlay /> },
    "Alerts": { label: "Alerts", href: "/dashboard/alerts", icon: <Bell /> },
    "Reports": { label: "Reports", href: "/dashboard/reports", icon: <ChartColumnBig /> },
    "Settings": { label: "Settings", href: "/dashboard/settings", icon: <Settings /> },
    "Logout": { label: "Logout", href: "/auth/login", icon: <LogOut /> },
  };

  useEffect(() => {
    setSelectedTab(pathname);
  }, [pathname]);

  const renderTab = (key: string) => {
    const { label, href, icon } = Tabs[key];
    const isTabSelected = selectedTab === href;
    return (
      <Link href={href} className={`flex mb-2 hover:bg-secondary hover:text-green-900 px-3 py-2 rounded ${isTabSelected ? 'bg-secondary text-green-900' : ''}`}>
        {icon}
        <span className="ml-3 text-sm font-medium">
          {label}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <RequireAuth>
        {/* Sidebar */}
        <nav className="w-60 bg-white flex flex-col p-4 shrink-0 overflow-y-auto">
          <div className="h-12 mb-3 w-full flex flex-row justify-center items-center">
            {/* <div className='h-full w-12 inline-block'>
              <CPLogo />
            </div> */}
            <CPBrand textClassName="text-2xl ml-2 inline-block" />
          </div>
          <hr className='text-gray-300' />
          <div className="mt-4 px-3 flex grow flex-col justify-between">
            <div className='flex flex-col'>
              {renderTab("Overview")}
              {renderTab("LiveCamera")}
              {renderTab("Playback")}
              {renderTab("Alerts")}
              {renderTab("Reports")}
            </div>
            <div className='flex flex-col'>
              {renderTab("Settings")}
              {renderTab("Logout")}
            </div>
          </div>
        </nav>

        {/* Right content */}
        <main className="flex-1 bg-gray-50 min-w-0 overflow-y-auto">
          {children}
        </main>
      </RequireAuth>
    </div>
  );
}
