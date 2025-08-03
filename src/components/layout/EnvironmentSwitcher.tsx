'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { 
  environmentManager, 
  getCurrentEnvironment, 
  getCurrentConfig, 
  type Environment,
  ENVIRONMENTS 
} from '../../lib/environment';

export default function EnvironmentSwitcher() {
  const [currentEnv, setCurrentEnv] = useState<Environment>('sandbox');
  const [isOpen, setIsOpen] = useState(false);
  const [isValidated, setIsValidated] = useState(false);

  useEffect(() => {
    // Initialize from storage and update state
    environmentManager.initializeFromStorage();
    setCurrentEnv(getCurrentEnvironment());
    
    // Validate configuration
    const validation = environmentManager.validateConfiguration();
    setIsValidated(validation.isValid);
  }, []);

  const handleEnvironmentChange = (env: Environment) => {
    environmentManager.setEnvironment(env);
    setCurrentEnv(env);
    setIsOpen(false);
    
    // Validate new configuration
    const validation = environmentManager.validateConfiguration();
    setIsValidated(validation.isValid);
    
    // Optionally reload the page to apply changes
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  const currentConfig = getCurrentConfig();

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
          currentEnv === 'production' 
            ? 'bg-green-50 border-green-200 text-green-800 hover:bg-green-100' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-800 hover:bg-yellow-100'
        }`}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className={`w-2 h-2 rounded-full ${
          currentEnv === 'production' ? 'bg-green-500' : 'bg-yellow-500'
        }`} />
        <span className="text-sm font-medium">{currentConfig.name}</span>
        {!isValidated && (
          <AlertTriangle className="h-4 w-4 text-red-500" />
        )}
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50"
          >
            <div className="p-4">
              <div className="flex items-center space-x-2 mb-4">
                <Settings className="h-5 w-5 text-gray-600" />
                <h3 className="font-semibold text-gray-900">Entorno de API</h3>
              </div>

              <div className="space-y-3">
                {Object.entries(ENVIRONMENTS).map(([key, config]) => {
                  const env = key as Environment;
                  const isSelected = env === currentEnv;
                  
                  return (
                    <motion.button
                      key={env}
                      onClick={() => handleEnvironmentChange(env)}
                      className={`w-full text-left p-3 rounded-lg border transition-colors ${
                        isSelected 
                          ? `${config.color} border-current` 
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 rounded-full ${
                            env === 'production' ? 'bg-green-500' : 'bg-yellow-500'
                          }`} />
                          <div>
                            <div className="font-medium text-gray-900">{config.name}</div>
                            <div className="text-sm text-gray-600">{config.description}</div>
                            <div className="text-xs text-gray-500 font-mono mt-1">
                              {config.apiUrl}
                            </div>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {!isValidated && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium text-red-800">
                      Configuración Incompleta
                    </span>
                  </div>
                  <p className="text-sm text-red-700 mt-1">
                    Algunas variables de entorno no están configuradas para el entorno actual.
                    Verifica tu archivo .env.local.
                  </p>
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <div className="flex justify-between">
                    <span>Entorno Actual:</span>
                    <span className="font-mono">{currentConfig.name}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>API URL:</span>
                    <span className="font-mono text-right">{currentConfig.apiUrl}</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}

