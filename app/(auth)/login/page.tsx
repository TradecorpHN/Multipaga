'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import { useAuth } from '@/presentation/contexts/AuthContext'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Sphere, MeshDistortMaterial, Stars } from '@react-three/drei'
import { Loader2, LogIn, Shield, Zap } from 'lucide-react'
import toast from 'react-hot-toast'

// Login form schema
const loginSchema = z.object({
  merchantId: z.string().min(1, 'Merchant ID is required'),
  profileId: z.string().min(1, 'Profile ID is required'),
})

type LoginFormData = z.infer<typeof loginSchema>

// Animated background component
function AnimatedBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 5], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Sphere args={[1, 100, 200]} scale={2.5}>
          <MeshDistortMaterial
            color="#8b5cf6"
            attach="material"
            distort={0.5}
            speed={1.5}
            roughness={0}
            metalness={0.8}
          />
        </Sphere>
        <Stars
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
      </Canvas>
      <div className="absolute inset-0 bg-gradient-to-br from-dark-bg/90 via-dark-bg/80 to-purple-900/20" />
    </div>
  )
}

export default function LoginPage() {
  const { login, isLoading } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true)
    try {
      await login(data)
    } catch (error) {
      // Error is already handled in the login function with toast
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center px-4 py-12 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 20 }}
              className="inline-flex items-center justify-center w-20 h-20 mb-4 rounded-full bg-gradient-to-br from-purple-600 to-pink-600 shadow-glow"
            >
              <Shield className="w-10 h-10 text-white" />
            </motion.div>
            
            <h1 className="text-4xl font-bold text-white mb-2">
              Welcome to Multipaga
            </h1>
            <p className="text-dark-text-secondary">
              Enter your credentials to access the dashboard
            </p>
          </div>

          {/* Login Form */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-dark-surface/80 backdrop-blur-xl rounded-2xl shadow-neumorphic p-8 border border-dark-border"
          >
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Merchant ID Field */}
              <div>
                <label htmlFor="merchantId" className="block text-sm font-medium text-dark-text-secondary mb-2">
                  Merchant ID
                </label>
                <div className="relative">
                  <input
                    {...register('merchantId')}
                    type="text"
                    id="merchantId"
                    className="w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-lg text-white placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your merchant ID"
                    disabled={isSubmitting}
                  />
                  {errors.merchantId && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400"
                    >
                      {errors.merchantId.message}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Profile ID Field */}
              <div>
                <label htmlFor="profileId" className="block text-sm font-medium text-dark-text-secondary mb-2">
                  Profile ID
                </label>
                <div className="relative">
                  <input
                    {...register('profileId')}
                    type="text"
                    id="profileId"
                    className="w-full px-4 py-3 bg-dark-bg/50 border border-dark-border rounded-lg text-white placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your profile ID"
                    disabled={isSubmitting}
                  />
                  {errors.profileId && (
                    <motion.p
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-sm text-red-400"
                    >
                      {errors.profileId.message}
                    </motion.p>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-lg shadow-glow hover:shadow-glow-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 focus:ring-offset-dark-bg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span className="flex items-center justify-center">
                    <Loader2 className="animate-spin mr-2 h-5 w-5" />
                    Authenticating...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <LogIn className="mr-2 h-5 w-5" />
                    Login to Dashboard
                  </span>
                )}
              </motion.button>
            </form>

            {/* Security Notice */}
            <div className="mt-6 pt-6 border-t border-dark-border">
              <div className="flex items-start space-x-3">
                <Zap className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-dark-text-secondary">
                  <p className="font-medium text-yellow-500 mb-1">Security Notice</p>
                  <p>
                    Your credentials are validated directly with Hyperswitch API. 
                    We don't store any sensitive data locally.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="mt-8 text-center text-sm text-dark-text-secondary"
          >
            <p>
              Powered by{' '}
              <a
                href="https://hyperswitch.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300 transition-colors"
              >
                Hyperswitch
              </a>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </>
  )
}