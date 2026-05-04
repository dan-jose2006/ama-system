import Sidebar from './Sidebar';

export default function AppLayout({ children }) {
  return (
    <div className="min-h-screen bg-[#0F0F13] text-[#d4d4d8] flex">
      <Sidebar />
      <main className="flex-1 ml-56 min-h-screen">
        <div className="max-w-[1200px] mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
