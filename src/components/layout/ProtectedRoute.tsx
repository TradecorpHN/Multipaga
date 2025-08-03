'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import { PermissionChecker, getUserPermissionsFromSession, UserPermissions } from '@/lib/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
  adminOnly?: boolean;
  fallbackUrl?: string;
}

interface SessionData {
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    merchantId: string;
    profileId: string;
    orgId: string;
    roleId: string;
    permissions: string[];
    has2FA: boolean;
  } | null;
}

export default function ProtectedRoute({
  children,
  requiredPermission,
  adminOnly = false,
  fallbackUrl = '/auth/signin',
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [sessionData, setSessionData] = useState<SessionData | null>(null);
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null);

  useEffect(() => {
    checkAuthAndPermissions();
  }, [pathname, requiredPermission, adminOnly]);

  const checkAuthAndPermissions = async () => {
    try {
      setIsLoading(true);

      // Check session
      const response = await fetch('/api/auth/session', {
        method: 'GET',
        credentials: 'include',
      });

      const sessionResult = await response.json();

      if (!sessionResult.isAuthenticated || !sessionResult.user) {
        // Not authenticated, redirect to login
        const currentPath = encodeURIComponent(pathname);
        router.push(`${fallbackUrl}?redirect=${currentPath}`);
        return;
      }

      setSessionData(sessionResult);

      // Create permission checker
      const userPermissions: UserPermissions = getUserPermissionsFromSession(sessionResult.user);
      const checker = new PermissionChecker(userPermissions);
      setPermissionChecker(checker);

      // Check admin-only access
      if (adminOnly && !userPermissions.isAdmin) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // Check specific permission
      if (requiredPermission && !checker.hasPermission(requiredPermission)) {
        setIsAuthorized(false);
        setIsLoading(false);
        return;
      }

      // All checks passed
      setIsAuthorized(true);
    } catch (error) {
      console.error('Error checking auth and permissions:', error);
      // On error, redirect to login
      const currentPath = encodeURIComponent(pathname);
      router.push(`${fallbackUrl}?redirect=${currentPath}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="text-center"
        >
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Verificando permisos...</p>
        </motion.div>
      </div>
    );
  }

  // Not authorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Shield className="h-8 w-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acceso Denegado
            </h1>
            
            <div className="space-y-3 mb-6">
              <div className="flex items-center justify-center text-red-600 bg-red-50 rounded-lg p-3">
                <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                <span className="text-sm">
                  {adminOnly 
                    ? 'Esta página requiere permisos de administrador'
                    : requiredPermission 
                      ? `No tienes el permiso requerido: ${requiredPermission}`
                      : 'No tienes permisos para acceder a esta página'
                  }
                </span>
              </div>
              
              {sessionData?.user && (
                <div className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                  <p><strong>Usuario:</strong> {sessionData.user.email}</p>
                  <p><strong>Rol:</strong> {sessionData.user.roleId || 'No asignado'}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <button
                onClick={() => router.back()}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Volver Atrás
              </button>
              
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
              >
                Ir al Dashboard
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Si crees que esto es un error, contacta al administrador del sistema.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Authorized - render children
  return <>{children}</>;
}

// Higher-order component for easier usage
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    requiredPermission?: string;
    adminOnly?: boolean;
    fallbackUrl?: string;
  } = {}
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute {...options}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}

// Hook for using permission checker in components
export function usePermissions() {
  const [permissionChecker, setPermissionChecker] = useState<PermissionChecker | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPermissions = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          method: 'GET',
          credentials: 'include',
        });

        const sessionResult = await response.json();

        if (sessionResult.isAuthenticated && sessionResult.user) {
          const userPermissions: UserPermissions = getUserPermissionsFromSession(sessionResult.user);
          const checker = new PermissionChecker(userPermissions);
          setPermissionChecker(checker);
        }
      } catch (error) {
        console.error('Error loading permissions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPermissions();
  }, []);

  return {
    permissionChecker,
    isLoading,
    hasPermission: (permission: string) => permissionChecker?.hasPermission(permission) || false,
    canAccess: (resource: string, action?: string) => permissionChecker?.canAccess(resource, action) || false,
    isAdmin: permissionChecker?.userPermissions.isAdmin || false,
  };
}

