'use client'

import { motion } from 'framer-motion'

export default function LoginLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-md w-full mx-auto">
        {/* Logo y branding */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8] 
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut" 
            }}
            className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center"
          >
            <svg 
              className="w-8 h-8 text-white" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" 
              />
            </svg>
          </motion.div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Multipaga
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            TradecorpHN Payment Platform
          </p>
        </motion.div>

        {/* Card de loading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-8"
        >
          {/* Simulación del formulario de login */}
          <div className="space-y-6">
            {/* Campo API Key */}
            <div>
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity }}
                className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg"
              />
            </div>

            {/* Campo Merchant ID */}
            <div>
              <motion.div
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }}
                className="h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2"
              />
              <motion.div
                animate={{ opacity: [0.2, 0.5, 0.2] }}
                transition={{ duration: 1.5, repeat: Infinity, delay: 0.6 }}
                className="h-12 bg-slate-100 dark:bg-slate-700 rounded-lg"
              />
            </div>

            {/* Botón de login */}
            <motion.div
              animate={{ opacity: [0.4, 0.7, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity, delay: 0.8 }}
              className="h-12 bg-blue-200 dark:bg-blue-800 rounded-lg"
            />
          </div>
        </motion.div>

        {/* Indicador de carga */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-6"
        >
          <div className="flex items-center justify-center space-x-2">
            {/* Spinner animado */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">
              Cargando formulario de inicio de sesión...
            </span>
          </div>
        </motion.div>

        {/* Información adicional */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="text-center mt-8 text-xs text-slate-500 dark:text-slate-400"
        >
          <p>Conectando con Hyperswitch API</p>
          <div className="flex items-center justify-center mt-2 space-x-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ 
                  scale: [1, 1.2, 1],
                  opacity: [0.5, 1, 0.5] 
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  delay: i * 0.2 
                }}
                className="w-1.5 h-1.5 bg-blue-400 rounded-full"
              />
            ))}
          </div>
        </motion.div>

        {/* Hyperswitch branding */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="text-center mt-6"
        >
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Powered by{' '}
            <span className="font-semibold text-slate-600 dark:text-slate-400">
              Hyperswitch
            </span>
          </p>
        </motion.div>
      </div>
    </div>
  )
}