'use client'

import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'
import * as random from 'maath/random/dist/maath-random.esm'

interface StarsFieldProps {
  count?: number
  radius?: number
  speed?: number
  opacity?: number
  size?: number
  color?: string
}

function Stars({ count = 5000, radius = 1.5, speed = 0.0005, opacity = 0.8, size = 1 }: StarsFieldProps) {
  const ref = useRef<THREE.Points>(null!)
  
  // Generate random positions for stars
  const [positions, colors] = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const colors = new Float32Array(count * 3)
    
    // Generate random positions in a sphere
    random.inSphere(positions, { radius })
    
    // Generate colors for twinkling effect
    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      const intensity = Math.random()
      colors[i3] = intensity     // R
      colors[i3 + 1] = intensity // G  
      colors[i3 + 2] = intensity // B
    }
    
    return [positions, colors]
  }, [count, radius])

  // Animate rotation
  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.x -= speed
      ref.current.rotation.y -= speed * 0.5
      
      // Update colors for twinkling effect
      const colorArray = ref.current.geometry.attributes.color.array as Float32Array
      for (let i = 0; i < count; i++) {
        const i3 = i * 3
        const time = state.clock.elapsedTime
        const intensity = 0.5 + 0.5 * Math.sin(time * 2 + i * 0.1)
        colorArray[i3] = intensity
        colorArray[i3 + 1] = intensity
        colorArray[i3 + 2] = intensity
      }
      ref.current.geometry.attributes.color.needsUpdate = true
    }
  })

  return (
    <group rotation={[0, 0, Math.PI / 4]}>
      <Points ref={ref} positions={positions} stride={3} frustumCulled={false}>
        <PointMaterial
          transparent
          color="#ffffff"
          size={size}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={opacity}
          vertexColors
        />
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-color"
            args={[colors, 3]}
          />
        </bufferGeometry>
      </Points>
    </group>
  )
}

export default function StarsField({
  count = 5000,
  radius = 1.5,
  speed = 0.0005,
  opacity = 0.8,
  size = 1,
  color = '#ffffff',
  className = '',
  ...props
}: StarsFieldProps & {
  className?: string
  [key: string]: any
}) {
  return (
    <div className={`absolute inset-0 ${className}`} {...props}>
      <Canvas
        camera={{ 
          position: [0, 0, 1],
          fov: 75,
          near: 0.1,
          far: 1000 
        }}
        style={{ 
          background: 'transparent',
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        <Stars 
          count={count}
          radius={radius}
          speed={speed}
          opacity={opacity}
          size={size}
        />
      </Canvas>
    </div>
  )
}