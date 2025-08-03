'use client';

import React, { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  CreditCard,
  Users,
  RotateCcw,
  BarChart3,
  Plug,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Shield,
  User,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { usePermissions } from './ProtectedRoute';
import { getFilteredNavigationItems, NavigationItem } from '@/lib/permissions';

// Icon mapping
const iconMap = {
  LayoutDashboard,
  CreditCard,
  Users,
  RotateCcw,
  BarChart3,
  Plug,
  Settings,
};

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface UserData {
  id: string;
  email: string;
  name: string;
  roleId: string;
  has2FA: boolean;
}

export default function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { permissionChecker, isLoading } = usePermissions();
  
  const [userData, setUserData] = useState<UserData | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  useEffect(() => {
    if (permissionChecker) {
      const filteredItems = getFilteredNavigationItems(permissionChecker);
      setNavigationItems(filteredItems);
    }
  }, [permissionChecker]);

  const loadUserData = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.isAuthenticated && result.user) {
        setUserData(result.user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Sesión cerrada exitosamente');
        router.push('/auth/signin');
      } else {
        toast.error('Error al cerrar sesión');
      }
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error al cerrar sesión');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName as keyof typeof iconMap];
    return IconComponent ? <IconComponent className="h-5 w-5" /> : <LayoutDashboard className="h-5 w-5" />;
  };

  const isActive = (href: string) => {
    if (href === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onToggle}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -320,
        }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 30,
        }}
        className="fixed left-0 top-0 h-full w-80 bg-white border-r border-gray-200 z-50 lg:translate-x-0 lg:static lg:z-auto"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Multipaga</h1>
                <p className="text-xs text-gray-500">Payment Platform</p>
              </div>
            </div>
            
            <button
              onClick={onToggle}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : (
              navigationItems.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => {
                    router.push(item.href);
                    if (window.innerWidth < 1024) {
                      onToggle();
                    }
                  }}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
                    isActive(item.href)
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className={`${isActive(item.href) ? 'text-blue-600' : 'text-gray-500'}`}>
                    {getIcon(item.icon)}
                  </div>
                  <span className="font-medium">{item.name}</span>
                  
                  {/* Admin badge */}
                  {item.adminOnly && (
                    <div className="ml-auto">
                      <Shield className="h-4 w-4 text-amber-500" />
                    </div>
                  )}
                </motion.button>
              ))
            )}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            {userData && (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {userData.name || userData.email}
                    </p>
                    <p className="text-xs text-gray-500 capitalize">
                      {userData.roleId || 'Usuario'}
                    </p>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${
                    isUserMenuOpen ? 'rotate-180' : ''
                  }`} />
                </button>

                {/* User menu */}
                <AnimatePresence>
                  {isUserMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden"
                    >
                      <div className="p-3 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900">{userData.email}</p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">Rol: {userData.roleId}</span>
                          {userData.has2FA && (
                            <div className="flex items-center space-x-1">
                              <Shield className="h-3 w-3 text-green-500" />
                              <span className="text-xs text-green-600">2FA</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="p-2">
                        <button
                          onClick={() => {
                            router.push('/dashboard/settings/profile');
                            setIsUserMenuOpen(false);
                          }}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                        >
                          <Settings className="h-4 w-4" />
                          <span>Configuración</span>
                        </button>
                        
                        <button
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                          className="w-full flex items-center space-x-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          <LogOut className="h-4 w-4" />
                          <span>{isLoggingOut ? 'Cerrando...' : 'Cerrar Sesión'}</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.aside>
    </>
  );
}

