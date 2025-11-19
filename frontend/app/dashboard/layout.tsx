'use client';

import CPBrand from '@/components/CPBrand';
import CPLogo from '@/components/CPLogo';
import { Cctv, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [selectedTab, setSelectedTab] = useState<string>("");
  const pathname = usePathname();

  interface Tabs {
    [key: string]: any;
  }
  const Tabs: Tabs = {
    "Overview": { label: "Overview", href: "/dashboard/overview", icon: <LayoutDashboard /> },
    "LiveCamera": { label: "Live Camera", href: "/dashboard/live-camera", icon: <Cctv /> },
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
      <Link href={href} className={`flex mb-2 hover:bg-primary hover:text-white px-3 py-2 rounded ${isTabSelected ? 'bg-primary text-white' : ''}`}>
        {icon}
        <span className="ml-3 text-sm font-medium">
          {label}
        </span>
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <nav className="w-60 bg-white flex flex-col p-4">
        <div className="h-12 mb-3 w-full flex flex-row justify-center items-center">
          <div className='h-full w-12 inline-block'>
            <CPLogo />
          </div>
          <CPBrand textClassName="text-2xl ml-2 inline-block" />
        </div>
        <hr className='text-gray-300' />
        <div className="mt-4 px-3 flex grow flex-col justify-between">
          <div className='flex flex-col'>
            {renderTab("Overview")}
            {renderTab("LiveCamera")}
          </div>
          <div className='flex flex-col'>
            {renderTab("Settings")}
            {renderTab("Logout")}
          </div>
        </div>
      </nav>

      {/* Right content */}
      <main className="flex-1 p-6 bg-gray-50">
        {children}
      </main>
    </div>
  );
}
