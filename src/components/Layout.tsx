/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  Building2, 
  LayoutDashboard, 
  Map, 
  Users, 
  LogOut, 
  Bell, 
  Search,
  Menu,
  X
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BRAND_NAME, COLORS } from '../constants';

interface LayoutProps {
  children: ReactNode;
  user: any;
  onLogout: () => void;
}

export default function Layout({ children, user, onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Map, label: 'Projects', path: '/projects' },
    { icon: Users, label: 'Employees', path: '/employees' },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans text-slate-900 overflow-hidden">
      {/* Sidebar */}
      <aside 
        className={`w-64 bg-slate-900 text-white fixed lg:static inset-y-0 left-0 z-50 transform ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 transition-transform duration-300 ease-in-out flex flex-col shrink-0`}
      >
        <div className="p-6 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-blue-400">
              Revathi<span className="text-white italic font-light ml-1">Portal</span>
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-[0.2em] font-semibold">Employee Portal</p>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <div className="text-[10px] font-bold text-slate-500 uppercase px-2 mb-2 tracking-widest">Management</div>
          {navItems.map((item) => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group font-medium text-sm ${
                location.pathname === item.path 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className={`w-4 h-4 ${location.pathname === item.path ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'} transition-colors`} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 bg-slate-950/50 border-t border-slate-800">
          <div className="flex items-center gap-3 p-2 rounded-xl mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-lg shadow-inner border border-slate-600">
              {user.username?.[0]?.toUpperCase() || '👤'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-slate-200">{user.username}</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2 text-slate-500 hover:text-rose-400 transition-all text-xs font-bold uppercase tracking-widest"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-full bg-slate-50 min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shadow-sm shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-slate-100 rounded-lg"
            >
              {isSidebarOpen ? <X className="w-5 h-5 text-slate-600" /> : <Menu className="w-5 h-5 text-slate-600" />}
            </button>
            <h2 className="text-lg font-semibold text-slate-700 italic tracking-tight hidden sm:block">
              {location.pathname === '/' ? 'Dashboard Overview' : 'Live Portfolio'}
            </h2>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 focus-within:border-blue-500/50 focus-within:bg-white transition-all w-64">
              <Search className="w-4 h-4" />
              <input 
                type="text" 
                placeholder="Search resources..." 
                className="bg-transparent border-none focus:ring-0 text-xs placeholder:text-slate-400 w-full"
              />
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white"></span>
            </button>
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
