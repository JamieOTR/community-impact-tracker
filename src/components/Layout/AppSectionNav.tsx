// PATH: src/components/Layout/AppSectionNav.tsx
import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';

function linkClasses(active: boolean) {
  return clsx(
    'text-sm font-medium transition-colors duration-200 px-3 py-2 rounded-lg',
    active
      ? 'bg-primary-50 text-primary-700 border border-primary-200'
      : 'text-gray-600 hover:text-primary-600 hover:bg-gray-50'
  );
}

function placeholderClasses() {
  return 'text-sm font-medium px-3 py-2 rounded-lg text-gray-400 bg-gray-50 cursor-not-allowed border border-gray-100';
}

export default function AppSectionNav() {
  const location = useLocation();
  const pathname = location.pathname;

  const isDashboard = pathname === '/dashboard';
  const isPrograms = pathname === '/programs' || pathname.startsWith('/programs/');
  const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

  return (
    <nav className="hidden md:flex items-center gap-2">
      <NavLink to="/dashboard" className={() => linkClasses(isDashboard)}>
        Dashboard
      </NavLink>

      <span className={placeholderClasses()} title="Coming soon">
        Milestones
      </span>

      <span className={placeholderClasses()} title="Coming soon">
        Community
      </span>

      <NavLink to="/programs" className={() => linkClasses(isPrograms)}>
        Programs
      </NavLink>

      <NavLink to="/admin" className={() => linkClasses(isAdmin)}>
        Admin
      </NavLink>
    </nav>
  );
}