// components/AnimatedBackground.tsx - FIXED VERSION
'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import ClientOnly, { useUniqueId, UniqueKeyGenerator } from './ClientOnly'

interface AnimationNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
}

interface TechnologicalNetworkBackgroundProps {
  nodeCount?: number
  animationSpeed?: number
  className?: string
}

function TechnologicalNetworkBackground({
  nodeCount = 12,
  animationSpeed = 0.5,
  className = ''
}: TechnologicalNetworkBackgroundProps) {
  const [nodes, setNodes] = useState<AnimationNode[]>([])
  const containerId = useUniqueId('tech-network')

  // Generar nodos con IDs únicos garantizados
  const generateNodes = useCallback(() => {
    return Array.from({ length: nodeCount }, (_, i) => ({
      id: UniqueKeyGenerator.generate(`tech-${i}`),
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * animationSpeed,
      vy: (Math.random() - 0.5) * animationSpeed,
      size: Math.random() * 4 + 2,
      opacity: Math.random() * 0.7 + 0.3,
    }))
  }, [nodeCount, animationSpeed])

  // Inicializar nodos
  useEffect(() => {
    setNodes(generateNodes())
  }, [generateNodes])

  // Animación de nodos
  useEffect(() => {
    if (nodes.length === 0) return

    const animationId = setInterval(() => {
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          x: (node.x + node.vx + 100) % 100,
          y: (node.y + node.vy + 100) % 100,
        }))
      )
    }, 50)

    return () => clearInterval(animationId)
  }, [nodes.length])

  // Memoizar conexiones para performance
  const connections = useMemo(() => {
    const connectionLines: Array<{ 
      id: string; 
      x1: number; 
      y1: number; 
      x2: number; 
      y2: number; 
      opacity: number 
    }> = []

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const node1 = nodes[i]
        const node2 = nodes[j]
        const distance = Math.sqrt(
          Math.pow(node1.x - node2.x, 2) + Math.pow(node1.y - node2.y, 2)
        )

        if (distance < 20) {
          connectionLines.push({
            id: UniqueKeyGenerator.generate(`connection-${i}-${j}`),
            x1: node1.x,
            y1: node1.y,
            x2: node2.x,
            y2: node2.y,
            opacity: Math.max(0, 1 - distance / 20) * 0.4,
          })
        }
      }
    }

    return connectionLines
  }, [nodes])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} id={containerId}>
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
        {/* Renderizar conexiones */}
        {connections.map((connection) => (
          <line
            key={connection.id}
            x1={`${connection.x1}%`}
            y1={`${connection.y1}%`}
            x2={`${connection.x2}%`}
            y2={`${connection.y2}%`}
            stroke="rgb(59, 130, 246)"
            strokeWidth="0.1"
            opacity={connection.opacity}
          />
        ))}
        
        {/* Renderizar nodos */}
        {nodes.map((node) => (
          <circle
            key={node.id} // Usa el ID único garantizado
            cx={`${node.x}%`}
            cy={`${node.y}%`}
            r={node.size * 0.1}
            fill="rgb(59, 130, 246)"
            opacity={node.opacity}
          />
        ))}
      </svg>
    </div>
  )
}

// Versión para el background neural (login page)
function NeuralAnimatedBackground({
  nodeCount = 15,
  className = ''
}: {
  nodeCount?: number
  className?: string
}) {
  const [nodes, setNodes] = useState<AnimationNode[]>([])
  const containerId = useUniqueId('neural-bg')

  const generateNeuralNodes = useCallback(() => {
    return Array.from({ length: nodeCount }, (_, i) => ({
      id: UniqueKeyGenerator.generate(`neural-${i}`),
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      size: Math.random() * 3 + 1,
      opacity: Math.random() * 0.6 + 0.2,
    }))
  }, [nodeCount])

  useEffect(() => {
    setNodes(generateNeuralNodes())
  }, [generateNeuralNodes])

  useEffect(() => {
    if (nodes.length === 0) return

    const animationId = setInterval(() => {
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          x: (node.x + node.vx + 100) % 100,
          y: (node.y + node.vy + 100) % 100,
        }))
      )
    }, 100)

    return () => clearInterval(animationId)
  }, [nodes.length])

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} id={containerId}>
      <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
        {nodes.map((node) => (
          <div
            key={node.id} // Usa el ID único garantizado
            className="absolute w-1 h-1 bg-blue-400 rounded-full animate-pulse"
            style={{
              left: `${node.x}%`,
              top: `${node.y}%`,
              opacity: node.opacity,
              transform: `scale(${node.size})`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

// Exports con ClientOnly wrapper para prevenir hidratación
export default function SafeAnimatedBackground(props: TechnologicalNetworkBackgroundProps) {
  return (
    <ClientOnly 
      fallback={<div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-purple-50" />}
      delay={100}
    >
      <TechnologicalNetworkBackground {...props} />
    </ClientOnly>
  )
}

export function SafeNeuralBackground(props: { nodeCount?: number; className?: string }) {
  return (
    <ClientOnly 
      fallback={<div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50" />}
      delay={100}
    >
      <NeuralAnimatedBackground {...props} />
    </ClientOnly>
  )
}