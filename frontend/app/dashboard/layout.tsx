'use client';

import CPBrand from '@/components/CPBrand';
import CPLogo from '@/components/CPLogo';
import { Cctv, LayoutDashboard, LogOut, Settings } from 'lucide-react';
import Link from 'next/link';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const renderTab = (label: string, href: string, icon: React.ReactNode, isSelected: boolean) => {
    return (
      <Link href={href} className="flex mb-2 hover:bg-primary hover:text-white px-3 py-2 rounded">
        {icon}
        <span className="ml-3">
          <span className="text-sm font-medium">
            {label}
          </span>
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
            {renderTab("Overview", "/dashboard/overview", <LayoutDashboard />, false)}
            {renderTab("Live Camera", "/dashboard/live-camera", <Cctv />, false)}
          </div>
          <div className='flex flex-col'>
            {renderTab("Settings", "/dashboard/settings", <Settings />, false)}
            {renderTab("Logout", "/auth/login", <LogOut />, false)}
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
