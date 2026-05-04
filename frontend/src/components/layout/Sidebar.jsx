import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FileText, Send, Sparkles, LogOut, Hexagon, FolderOpen, X } from 'lucide-react';
import { motion } from 'framer-motion';

function getNavItems(role) {
  const isMarketing = role === 'marketing_head' || role === 'admin';
  return [
    {
      to: '/submit',
      icon: isMarketing ? Sparkles : Send,
      label: isMarketing ? 'Content Generation' : 'New Submission',
      roles: ['trainer', 'marketing_head', 'admin'],
    },
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['marketing_head', 'admin'] },
    {
      to: '/my-submissions',
      icon: isMarketing ? FolderOpen : FileText,
      label: isMarketing ? 'Submissions' : 'My Submissions',
      roles: ['trainer', 'marketing_head', 'admin'],
    },
  ];
}

const ROLE_LABEL = { trainer: 'Trainer', marketing_head: 'Marketing', admin: 'Admin' };

export default function Sidebar({ onClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = getNavItems(user?.role).filter(i => i.roles.includes(user?.role));

  return (
    <aside
      className="h-full w-56 z-40 flex flex-col"
      style={{ background: '#111117', borderRight: '1px solid #1f1f27' }}
    >
      {/* Wordmark + mobile close */}
      <div className="flex items-center h-16 px-5 flex-shrink-0" style={{ borderBottom: '1px solid #1f1f27' }}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(15,98,254,0.12)', border: '1px solid rgba(15,98,254,0.22)' }}
          >
            <Hexagon size={16} className="text-[#0F62FE]" />
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#fafafa] tracking-tight leading-none">KIAS</p>
            <p className="text-[9px] text-[#52525b] tracking-[0.12em] uppercase mt-0.5 font-medium">Nexus</p>
          </div>
        </div>
        {/* X button — only visible on mobile */}
        <button
          onClick={onClose}
          className="md:hidden p-1.5 rounded-lg text-[#52525b] hover:text-[#d4d4d8] hover:bg-[#18181b] transition-colors flex-shrink-0"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav label */}
      <div className="px-5 pt-5 pb-2">
        <span className="text-[10px] font-semibold tracking-[0.1em] text-[#3f3f46] uppercase">Menu</span>
      </div>

      {/* Nav items — clicking a link closes the sidebar on mobile */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {items.map(item => (
          <NavLink key={item.to} to={item.to} className="block no-underline" onClick={onClose}>
            {({ isActive }) => (
              <div
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-[#0F62FE]/10 text-[#fafafa]'
                    : 'text-[#71717a] hover:bg-[#18181b] hover:text-[#d4d4d8]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[#0F62FE]"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
                <item.icon
                  size={15}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-[#0F62FE] flex-shrink-0' : 'flex-shrink-0'}
                />
                <span className={`text-[13px] ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {item.label}
                </span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User footer */}
      <div className="flex-shrink-0 p-3" style={{ borderTop: '1px solid #1f1f27' }}>
        <div className="flex items-center gap-2.5 px-2 py-2 mb-1">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(15,98,254,0.08)', border: '1px solid rgba(15,98,254,0.2)' }}>
            <span className="text-[11px] font-bold text-[#60a5fa]">
              {user?.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-[#f4f4f5] truncate leading-tight">{user?.name}</p>
            <p className="text-[10px] text-[#52525b] truncate leading-tight mt-0.5">{ROLE_LABEL[user?.role]}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); onClose?.(); }}
          className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg text-[#52525b] hover:text-red-400 transition-colors duration-150 text-[12px]"
          style={{ background: 'none', border: 'none' }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          <LogOut size={14} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
