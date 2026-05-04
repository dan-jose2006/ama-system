import { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu, X } from 'lucide-react';

export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0F0F13] text-[#d4d4d8] flex">

      {/* Mobile overlay backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless toggled */}
      <div className={`fixed left-0 top-0 h-full z-40 transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main content */}
      <main className="flex-1 md:ml-56 min-h-screen w-full">
        {/* Mobile top bar */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1f1f27] bg-[#111117] md:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg text-[#71717a] hover:bg-[#18181b] hover:text-[#d4d4d8] transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-[14px] font-bold text-[#fafafa] tracking-tight">KIAS Nexus</span>
        </div>

        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
