import React, { useState } from 'react';
import Topbar from './Topbar';
import SidebarNav from './SidebarNav';
import { Sheet, SheetContent } from '@/components/ui/sheet';

const WorkspaceLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background">
      <Topbar onMenuClick={() => setMobileOpen(true)} />
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-border md:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)]">
            <SidebarNav />
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-x-hidden">{children}</main>
      </div>

      {/* 移动端侧边栏 */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72 border-border bg-sidebar p-0">
          <SidebarNav />
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default WorkspaceLayout;