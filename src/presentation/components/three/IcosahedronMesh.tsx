'use client'

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { MeshDistortMaterial, Float } from '@react-three/drei'
import * as THREE from 'three'

interface IcosahedronMeshProps {
  position?: [number, number, number]
  scale?: number | [number, number, number]
  color?: string
  distort?: number
  speed?: number
  radius?: number
  detail?: number
  roughness?: number
  metalness?: number
  opacity?: number
  wireframe?: boolean
  floatIntensity?: number
  floatSpeed?: number
  rotationSpeed?: [number, number, number]
}

export default function IcosahedronMesh({
  position = [0, 0, 0],
  scale = 1,
  color = '#4f46e5',
  distort = 0.3,
  speed = 1,
  radius = 1,
  detail = 1,
  roughness = 0.2,
  metalness = 0.8,
  opacity = 0.8,
  wireframe = false,
  floatIntensity = 1,
  floatSpeed = 2,
  rotationSpeed = [0.01, 0.01, 0.01],
}: IcosahedronMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const materialRef = useRef<any>(null!)

  // Create geometry with proper detail level
  const geometry = useMemo(() => {
    return new THREE.IcosahedronGeometry(radius, detail)
  }, [radius, detail])

  // Animation loop
  useFrame((state) => {
    if (meshRef.current) {
      // Continuous rotation
      meshRef.current.rotation.x += rotationSpeed[0]
      meshRef.current.rotation.y += rotationSpeed[1]
      meshRef.current.rotation.z += rotationSpeed[2]
    }

    // Animate material distortion
    if (materialRef.current && materialRef.current.distort !== undefined) {
      materialRef.current.distort = distort + Math.sin(state.clock.elapsedTime * speed) * 0.1
    }
  })

  return (
    <Float
      speed={floatSpeed}
      rotationIntensity={floatIntensity}
      floatIntensity={floatIntensity}
    >
      <mesh
        ref={meshRef}
        position={position}
        scale={scale}
        geometry={geometry}
        castShadow
        receiveShadow
      >
        <MeshDistortMaterial
          ref={materialRef}
          color={color}
          roughness={roughness}
          metalness={metalness}
          distort={distort}
          speed={speed}
          transparent={opacity < 1}
          opacity={opacity}
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      </mesh>
    </Float>
  )
}

// Preset variations for common use cases
export const IcosahedronVariants = {
  // Hero section geometric element
  hero: {
    scale: 2,
    color: '#6366f1',
    distort: 0.4,
    speed: 1.5,
    floatIntensity: 2,
    rotationSpeed: [0.005, 0.01, 0.005] as [number, number, number],
    opacity: 0.7,
  },

  // Subtle background decoration
  ambient: {
    scale: 0.5,
    color: '#8b5cf6',
    distort: 0.2,
    speed: 0.5,
    floatIntensity: 0.5,
    rotationSpeed: [0.002, 0.003, 0.002] as [number, number, number],
    opacity: 0.3,
  },

  // Interactive hover element
  interactive: {
    scale: 1.5,
    color: '#ec4899',
    distort: 0.5,
    speed: 2,
    floatIntensity: 3,
    rotationSpeed: [0.01, 0.015, 0.01] as [number, number, number],
    opacity: 0.9,
  },

  // Wireframe style
  wireframe: {
    scale: 1.2,
    color: '#10b981',
    distort: 0.1,
    speed: 1,
    wireframe: true,
    floatIntensity: 1,
    rotationSpeed: [0.008, 0.008, 0.008] as [number, number, number],
    opacity: 0.6,
  },

  // Loading spinner style
  loader: {
    scale: 0.8,
    color: '#f59e0b',
    distort: 0.6,
    speed: 3,
    floatIntensity: 0,
    rotationSpeed: [0.02, 0.02, 0.02] as [number, number, number],
    opacity: 1,
  },
} as const

// Component with preset
export function IcosahedronWithPreset({ 
  variant, 
  ...overrides 
}: { 
  variant: keyof typeof IcosahedronVariants 
} & Partial<IcosahedronMeshProps>) {
  const presetProps = IcosahedronVariants[variant]
  const mergedProps = { ...presetProps, ...overrides }
  
  return <IcosahedronMesh {...mergedProps} />
}