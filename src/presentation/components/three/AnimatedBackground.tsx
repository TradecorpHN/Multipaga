'use client'

import { Suspense, useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'
import StarsField from './StarsField'
import IcosahedronMesh, { IcosahedronVariants } from './IcosahedronMesh'

interface AnimatedBackgroundProps {
  variant?: 'hero' | 'dashboard' | 'minimal' | 'payment' | 'loading'
  interactive?: boolean
  enableControls?: boolean
  className?: string
  children?: React.ReactNode
}

// Floating geometric shapes component
function FloatingGeometry({ variant }: { variant: keyof typeof SceneVariants }) {
  const groupRef = useRef<THREE.Group>(null!)
  const config = SceneVariants[variant]

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.001
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    }
  })

  return (
    <group ref={groupRef}>
      {config.shapes.map((shape, index) => (
        <IcosahedronMesh
          key={index}
          position={shape.position}
          scale={shape.scale}
          color={shape.color}
          distort={shape.distort}
          speed={shape.speed}
          opacity={shape.opacity}
          rotationSpeed={shape.rotationSpeed}
        />
      ))}
    </group>
  )
}

// Ambient lighting setup
function Lighting({ variant }: { variant: keyof typeof SceneVariants }) {
  const config = SceneVariants[variant]
  
  return (
    <>
      <ambientLight intensity={config.lighting.ambient} />
      <directionalLight
        position={config.lighting.directional.position}
        intensity={config.lighting.directional.intensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight
        position={config.lighting.point.position}
        intensity={config.lighting.point.intensity}
        color={config.lighting.point.color}
      />
    </>
  )
}

// Scene configuration variants
const SceneVariants = {
  hero: {
    camera: { position: [0, 0, 5], fov: 75 },
    stars: { count: 3000, radius: 2, speed: 0.0003, opacity: 0.6 },
    shapes: [
      {
        position: [2, 1, -2] as [number, number, number],
        scale: 1.5,
        color: '#6366f1',
        distort: 0.4,
        speed: 1.5,
        opacity: 0.7,
        rotationSpeed: [0.005, 0.01, 0.005] as [number, number, number],
      },
      {
        position: [-2, -1, -1] as [number, number, number],
        scale: 0.8,
        color: '#8b5cf6',
        distort: 0.3,
        speed: 1,
        opacity: 0.5,
        rotationSpeed: [0.008, 0.005, 0.008] as [number, number, number],
      },
    ],
    lighting: {
      ambient: 0.2,
      directional: { position: [10, 10, 5] as [number, number, number], intensity: 0.5 },
      point: { position: [-10, -10, -10] as [number, number, number], intensity: 0.3, color: '#6366f1' },
    },
  },

  dashboard: {
    camera: { position: [0, 0, 8], fov: 60 },
    stars: { count: 2000, radius: 3, speed: 0.0002, opacity: 0.3 },
    shapes: [
      {
        position: [3, 2, -3] as [number, number, number],
        scale: 0.6,
        color: '#10b981',
        distort: 0.2,
        speed: 0.8,
        opacity: 0.4,
        rotationSpeed: [0.003, 0.005, 0.003] as [number, number, number],
      },
    ],
    lighting: {
      ambient: 0.3,
      directional: { position: [5, 5, 5] as [number, number, number], intensity: 0.3 },
      point: { position: [0, 0, 10] as [number, number, number], intensity: 0.2, color: '#10b981' },
    },
  },

  minimal: {
    camera: { position: [0, 0, 6], fov: 65 },
    stars: { count: 1000, radius: 2, speed: 0.0001, opacity: 0.2 },
    shapes: [],
    lighting: {
      ambient: 0.4,
      directional: { position: [2, 2, 2] as [number, number, number], intensity: 0.2 },
      point: { position: [0, 0, 5] as [number, number, number], intensity: 0.1, color: '#ffffff' },
    },
  },

  payment: {
    camera: { position: [0, 0, 4], fov: 70 },
    stars: { count: 1500, radius: 1.5, speed: 0.0004, opacity: 0.4 },
    shapes: [
      {
        position: [1.5, 0, -1] as [number, number, number],
        scale: 1,
        color: '#059669',
        distort: 0.3,
        speed: 1.2,
        opacity: 0.6,
        rotationSpeed: [0.006, 0.008, 0.006] as [number, number, number],
      },
    ],
    lighting: {
      ambient: 0.25,
      directional: { position: [8, 8, 8] as [number, number, number], intensity: 0.4 },
      point: { position: [5, 0, 2] as [number, number, number], intensity: 0.25, color: '#059669' },
    },
  },

  loading: {
    camera: { position: [0, 0, 3], fov: 80 },
    stars: { count: 500, radius: 1, speed: 0.0008, opacity: 0.5 },
    shapes: [
      {
        position: [0, 0, 0] as [number, number, number],
        scale: 1.2,
        color: '#f59e0b',
        distort: 0.5,
        speed: 2.5,
        opacity: 0.8,
        rotationSpeed: [0.02, 0.02, 0.02] as [number, number, number],
      },
    ],
    lighting: {
      ambient: 0.3,
      directional: { position: [3, 3, 3] as [number, number, number], intensity: 0.6 },
      point: { position: [0, 0, 2] as [number, number, number], intensity: 0.4, color: '#f59e0b' },
    },
  },
} as const

// Loading fallback
function SceneFallback() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 opacity-50" />
  )
}

export default function AnimatedBackground({
  variant = 'hero',
  interactive = false,
  enableControls = false,
  className = '',
  children,
}: AnimatedBackgroundProps) {
  const config = SceneVariants[variant]

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Background gradient fallback */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 opacity-30" />
      
      {/* 3D Scene */}
      <Suspense fallback={<SceneFallback />}>
        <Canvas
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: interactive ? 'auto' : 'none',
          }}
          camera={{
            position: config.camera.position,
            fov: config.camera.fov,
            near: 0.1,
            far: 1000,
          }}
          shadows
        >
          {/* Lighting */}
          <Lighting variant={variant} />
          
          {/* Stars */}
          <StarsField {...config.stars} />
          
          {/* Floating geometry */}
          {config.shapes.length > 0 && <FloatingGeometry variant={variant} />}
          
          {/* Environment */}
          <Environment preset="night" />
          
          {/* Controls (optional) */}
          {enableControls && (
            <OrbitControls
              enablePan={false}
              enableZoom={false}
              enableRotate={true}
              autoRotate={true}
              autoRotateSpeed={0.5}
            />
          )}
        </Canvas>
      </Suspense>

      {/* Content overlay */}
      {children && (
        <div className="relative z-10 h-full">
          {children}
        </div>
      )}
    </div>
  )
}

// Utility function for page-specific backgrounds
export function useAnimatedBackground(pathname: string): keyof typeof SceneVariants {
  return useMemo(() => {
    if (pathname === '/') return 'hero'
    if (pathname.startsWith('/dashboard')) return 'dashboard'
    if (pathname.startsWith('/payments')) return 'payment'
    if (pathname.includes('loading')) return 'loading'
    return 'minimal'
  }, [pathname])
}