
'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Users,
  TrendingUp,
  DollarSign,
  RefreshCw,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search
} from 'lucide-react';
import EnvironmentSwitcher from '@/components/layout/EnvironmentSwitcher';

interface UserSession {
  userId: string;
  email: string;
  name: string;
  merchantId: string;
  profileId: string;
  orgId: string;
  roleId: string;
  permissions: string[];
  token: string;
}

interface DashboardStats {
  totalPayments: number;
  totalAmount: number;
  successRate: number;
  activeCustomers: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserSession | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalPayments: 0,
    totalAmount: 0,
    successRate: 0,
    activeCustomers: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    fetchUserSession();
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboardStats(user.token);
    }
  }, [user]);

  const fetchUserSession = async () => {
    try {
      const response = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      const result = await response.json();
      
      if (result.isAuthenticated) {
        setUser(result.user);
      } else {
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      router.push('/login');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDashboardStats = async (token: string) => {
    try {
      const HYPERSWITCH_API_URL = process.env.NEXT_PUBLIC_HYPERSWITCH_API_URL || process.env.HYPERSWITCH_API_URL;

      if (!HYPERSWITCH_API_URL) {
        console.error('HYPERSWITCH_API_URL no está configurada en las variables de entorno.');
        return;
      }

      const response = await fetch(`${HYPERSWITCH_API_URL}/metrics/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setStats({
          totalPayments: data.total_payments || 0,
          totalAmount: data.total_amount || 0,
          successRate: data.success_rate || 0,
          activeCustomers: data.active_customers || 0,
        });
      } else {
        console.error('Error fetching dashboard stats:', data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      router.push('/login');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const navigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: TrendingUp, current: true },
    { name: 'Pagos', href: '/dashboard/payments', icon: CreditCard },
    { name: 'Clientes', href: '/dashboard/customers', icon: Users },
    { name: 'Reembolsos', href: '/dashboard/refunds', icon: RefreshCw },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setSidebarOpen(false)}></div>
        <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white">
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-6 w-6 text-white" />
            </button>
          </div>
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex-shrink-0 flex items-center px-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Multipaga</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-base font-medium rounded-md ${
                    item.current
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-4 h-6 w-6" />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 border-r border-gray-200 bg-white">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900">Multipaga</span>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {navigationItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                    item.current
                      ? 'bg-blue-100 text-blue-900'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        {/* Top navigation */}
        <div className="sticky top-0 z-10 md:hidden pl-1 pt-1 sm:pl-3 sm:pt-3 bg-gray-50">
          <button
            type="button"
            className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
        </div>

        {/* Header */}
        <header className="bg-white shadow">
          <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Bienvenido de vuelta, {user?.name || user?.email}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <EnvironmentSwitcher />
                <button className="p-2 text-gray-400 hover:text-gray-500">
                  <Bell className="h-6 w-6" />
                </button>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="hidden sm:block">Cerrar Sesión</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content area */}
        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {/* Stats */}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <CreditCard className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Total Pagos
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.totalPayments.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <DollarSign className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Monto Total
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            ${stats.totalAmount.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <TrendingUp className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Tasa de Éxito
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.successRate}%
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <Users className="h-6 w-6 text-gray-400" />
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            Clientes Activos
                          </dt>
                          <dd className="text-lg font-medium text-gray-900">
                            {stats.activeCustomers.toLocaleString()}
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick actions */}
              <div className="mt-8">
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Acciones Rápidas
                    </h3>
                    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <button
                        onClick={() => router.push('/dashboard/payments')}
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-300 hover:border-gray-400"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-blue-50 text-blue-700 ring-4 ring-white">
                            <CreditCard className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-8">
                          <h3 className="text-lg font-medium">
                            <span className="absolute inset-0" />
                            Procesar Pago
                          </h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Crear un nuevo pago o transacción
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push('/dashboard/customers')}
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-300 hover:border-gray-400"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-green-50 text-green-700 ring-4 ring-white">
                            <Users className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-8">
                          <h3 className="text-lg font-medium">
                            <span className="absolute inset-0" />
                            Gestionar Clientes
                          </h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Ver y administrar información de clientes
                          </p>
                        </div>
                      </button>

                      <button
                        onClick={() => router.push('/dashboard/refunds')}
                        className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-blue-500 rounded-lg border border-gray-300 hover:border-gray-400"
                      >
                        <div>
                          <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                            <RefreshCw className="h-6 w-6" />
                          </span>
                        </div>
                        <div className="mt-8">
                          <h3 className="text-lg font-medium">
                            <span className="absolute inset-0" />
                            Reembolsos
                          </h3>
                          <p className="mt-2 text-sm text-gray-500">
                            Procesar y gestionar reembolsos
                          </p>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* User info */}
              {user && (
                <div className="mt-8">
                  <div className="bg-white shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Información de la Cuenta
                      </h3>
                      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Email</dt>
                          <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Merchant ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{user.merchantId}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Profile ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{user.profileId}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Org ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{user.orgId}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Role ID</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{user.roleId}</dd>
                        </div>
                        <div>
                          <dt className="text-sm font-medium text-gray-500">Permissions</dt>
                          <dd className="mt-1 text-sm text-gray-900 font-mono">{user.permissions.join(', ')}</dd>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}


