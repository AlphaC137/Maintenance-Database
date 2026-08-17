import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import CommandPalette from "@/components/CommandPalette";
import { useAuth } from "@/lib/AuthContext";

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar user={user} onMenu={() => setSidebarOpen(true)} onOpenCommandPalette={() => setCmdOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} />
    </div>
  );
}