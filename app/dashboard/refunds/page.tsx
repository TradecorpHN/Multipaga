'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCcw,
  Search,
  Filter,
  Download,
  Plus,
  Eye,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Calendar,
  DollarSign,
  User,
  CreditCard,
  Loader2,
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import { usePermissions } from '@/components/layout/ProtectedRoute';

interface Refund {
  id: string;
  payment_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
  reason?: string;
  created: string;
  updated: string;
  customer_id?: string;
  customer_name?: string;
  payment_method?: {
    type: string;
    last4?: string;
  };
  metadata?: Record<string, string>;
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    icon: Clock,
    color: 'text-yellow-600',
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
  },
  succeeded: {
    label: 'Exitoso',
    icon: CheckCircle2,
    color: 'text-green-600',
    bg: 'bg-green-50',
    border: 'border-green-200',
  },
  failed: {
    label: 'Fallido',
    icon: XCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-200',
  },
  cancelled: {
    label: 'Cancelado',
    icon: XCircle,
    color: 'text-gray-600',
    bg: 'bg-gray-50',
    border: 'border-gray-200',
  },
};

export default function RefundsPage() {
  const { permissionChecker, hasPermission, canAccess, isAdmin } = usePermissions();
  
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('all');
  const [selectedRefund, setSelectedRefund] = useState<Refund | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreatingRefund, setIsCreatingRefund] = useState(false);

  // Create refund form
  const [createForm, setCreateForm] = useState({
    payment_id: '',
    amount: '',
    reason: '',
  });

  useEffect(() => {
    loadRefunds();
  }, [statusFilter, dateRange]);

  const loadRefunds = async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateRange !== 'all') params.append('date_range', dateRange);

      const response = await fetch(`/api/refunds?${params.toString()}`, {
        method: 'GET',
        credentials: 'include',
      });

      const result = await response.json();

      if (result.success) {
        setRefunds(result.refunds || []);
      } else {
        toast.error(result.error || 'Error al cargar reembolsos');
      }
    } catch (error) {
      console.error('Error loading refunds:', error);
      toast.error('Error al cargar reembolsos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateRefund = async () => {
    if (!createForm.payment_id || !createForm.amount) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    setIsCreatingRefund(true);

    try {
      const response = await fetch('/api/refunds/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          payment_id: createForm.payment_id,
          amount: parseFloat(createForm.amount) * 100, // Convert to cents
          reason: createForm.reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success('Reembolso creado exitosamente');
        setIsCreateModalOpen(false);
        setCreateForm({ payment_id: '', amount: '', reason: '' });
        loadRefunds();
      } else {
        toast.error(result.error || 'Error al crear reembolso');
      }
    } catch (error) {
      console.error('Error creating refund:', error);
      toast.error('Error al crear reembolso');
    } finally {
      setIsCreatingRefund(false);
    }
  };

  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = searchTerm === '' || 
      refund.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.payment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.customer_name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Check if user can view refunds (admin only or specific permission)
  if (!isAdmin && !hasPermission('refunds.view')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              Acceso Restringido
            </h1>
            
            <p className="text-gray-600 mb-6">
              Los reembolsos solo están disponibles para administradores. 
              Si necesitas acceso, contacta al administrador del sistema.
            </p>

            <button
              onClick={() => window.history.back()}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl transition-colors"
            >
              Volver Atrás
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <ProtectedRoute requiredPermission="refunds.view">
      <div className="p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Reembolsos</h1>
            <p className="text-gray-600">
              Gestiona y visualiza todos los reembolsos procesados
            </p>
          </div>

          {hasPermission('refunds.create') && (
            <motion.button
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-4 lg:mt-0 bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-6 rounded-xl transition-colors flex items-center space-x-2"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Plus className="h-5 w-5" />
              <span>Crear Reembolso</span>
            </motion.button>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar reembolsos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="succeeded">Exitoso</option>
              <option value="failed">Fallido</option>
              <option value="cancelled">Cancelado</option>
            </select>

            {/* Date range filter */}
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las fechas</option>
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
              <option value="quarter">Este trimestre</option>
            </select>

            {/* Export button */}
            <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors">
              <Download className="h-5 w-5 text-gray-600" />
              <span className="text-gray-700">Exportar</span>
            </button>
          </div>
        </div>

        {/* Refunds list */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600">Cargando reembolsos...</p>
            </div>
          ) : filteredRefunds.length === 0 ? (
            <div className="p-12 text-center">
              <RotateCcw className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No se encontraron reembolsos
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all' || dateRange !== 'all'
                  ? 'Intenta ajustar los filtros de búsqueda'
                  : 'Aún no hay reembolsos registrados'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">ID</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Pago</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Cliente</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Monto</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Estado</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Fecha</th>
                    <th className="text-left py-4 px-6 font-medium text-gray-900">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRefunds.map((refund) => {
                    const statusInfo = statusConfig[refund.status];
                    const StatusIcon = statusInfo.icon;

                    return (
                      <motion.tr
                        key={refund.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-6">
                          <div className="font-mono text-sm text-gray-900">
                            {refund.id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-mono text-sm text-blue-600">
                            {refund.payment_id.slice(0, 8)}...
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <User className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {refund.customer_name || refund.customer_id || 'N/A'}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className="font-medium text-gray-900">
                              {formatAmount(refund.amount, refund.currency)}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${statusInfo.bg} ${statusInfo.border} border`}>
                            <StatusIcon className={`h-4 w-4 ${statusInfo.color}`} />
                            <span className={statusInfo.color}>{statusInfo.label}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>{formatDate(refund.created)}</span>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => setSelectedRefund(refund)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700 transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                            <span className="text-sm">Ver</span>
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create refund modal */}
        <AnimatePresence>
          {isCreateModalOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-6">Crear Reembolso</h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ID del Pago
                    </label>
                    <input
                      type="text"
                      value={createForm.payment_id}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, payment_id: e.target.value }))}
                      placeholder="pay_xxxxxxxxxx"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Monto a Reembolsar
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={createForm.amount}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razón del Reembolso (Opcional)
                    </label>
                    <textarea
                      value={createForm.reason}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Describe la razón del reembolso..."
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>

                <div className="flex space-x-4 mt-6">
                  <button
                    onClick={() => setIsCreateModalOpen(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleCreateRefund}
                    disabled={isCreatingRefund}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-3 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {isCreatingRefund ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Creando...</span>
                      </>
                    ) : (
                      <span>Crear Reembolso</span>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Refund details modal */}
        <AnimatePresence>
          {selectedRefund && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">Detalles del Reembolso</h3>
                  <button
                    onClick={() => setSelectedRefund(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircle className="h-5 w-5 text-gray-500" />
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Status and basic info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Estado</label>
                      <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm ${statusConfig[selectedRefund.status].bg} ${statusConfig[selectedRefund.status].border} border`}>
                        {React.createElement(statusConfig[selectedRefund.status].icon, {
                          className: `h-4 w-4 ${statusConfig[selectedRefund.status].color}`
                        })}
                        <span className={statusConfig[selectedRefund.status].color}>
                          {statusConfig[selectedRefund.status].label}
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Monto</label>
                      <p className="text-lg font-semibold text-gray-900">
                        {formatAmount(selectedRefund.amount, selectedRefund.currency)}
                      </p>
                    </div>
                  </div>

                  {/* IDs */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">ID del Reembolso</label>
                      <p className="font-mono text-sm text-gray-900 bg-gray-50 p-2 rounded-lg">
                        {selectedRefund.id}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">ID del Pago</label>
                      <p className="font-mono text-sm text-blue-600 bg-blue-50 p-2 rounded-lg">
                        {selectedRefund.payment_id}
                      </p>
                    </div>
                  </div>

                  {/* Customer info */}
                  {(selectedRefund.customer_name || selectedRefund.customer_id) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Cliente</label>
                      <p className="text-gray-900">
                        {selectedRefund.customer_name || selectedRefund.customer_id}
                      </p>
                    </div>
                  )}

                  {/* Reason */}
                  {selectedRefund.reason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Razón</label>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {selectedRefund.reason}
                      </p>
                    </div>
                  )}

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Creado</label>
                      <p className="text-gray-900">{formatDate(selectedRefund.created)}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Actualizado</label>
                      <p className="text-gray-900">{formatDate(selectedRefund.updated)}</p>
                    </div>
                  </div>

                  {/* Payment method */}
                  {selectedRefund.payment_method && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">Método de Pago</label>
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900 capitalize">
                          {selectedRefund.payment_method.type}
                          {selectedRefund.payment_method.last4 && ` •••• ${selectedRefund.payment_method.last4}`}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Metadata */}
                  {selectedRefund.metadata && Object.keys(selectedRefund.metadata).length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-2">Metadatos</label>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                          {JSON.stringify(selectedRefund.metadata, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </ProtectedRoute>
  );
}

