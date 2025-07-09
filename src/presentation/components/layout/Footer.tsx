'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Heart,
  Globe,
  Shield,
  Zap,
  Mail,
  Phone,
  MapPin,
  ExternalLink,
  Github,
  Twitter,
  Linkedin,
  BookOpen,
  HelpCircle,
  FileText,
  Lock,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Separator } from '@/presentation/components/ui/Separator'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/presentation/components/ui/Tooltip'
import { cn } from '@/presentation/lib/utils'

interface FooterProps {
  variant?: 'default' | 'minimal' | 'dashboard'
  showStatus?: boolean
  className?: string
}

// System status data
interface SystemStatus {
  status: 'operational' | 'degraded' | 'outage'
  last_updated: string
  services: {
    name: string
    status: 'operational' | 'degraded' | 'outage'
    uptime: number
  }[]
}

const mockSystemStatus: SystemStatus = {
  status: 'operational',
  last_updated: new Date().toISOString(),
  services: [
    { name: 'API de Pagos', status: 'operational', uptime: 99.9 },
    { name: 'Dashboard', status: 'operational', uptime: 99.8 },
    { name: 'Webhooks', status: 'operational', uptime: 99.7 },
    { name: 'Reportes', status: 'operational', uptime: 99.9 },
  ],
}

export default function Footer({ 
  variant = 'default', 
  showStatus = true,
  className = '' 
}: FooterProps) {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(mockSystemStatus)
  const [currentTime, setCurrentTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  // Minimal footer for simple pages
  if (variant === 'minimal') {
    return (
      <footer className={cn('border-t bg-background py-4', className)}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-xs">M</span>
              </div>
              <span>© 2024 Multipaga. Todos los derechos reservados.</span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link href="/privacy" className="hover:text-foreground transition-colors">
                Privacidad
              </Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">
                Términos
              </Link>
              <Link href="/support" className="hover:text-foreground transition-colors">
                Soporte
              </Link>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  // Dashboard footer with status and minimal info
  if (variant === 'dashboard') {
    return (
      <footer className={cn('border-t bg-background py-3', className)}>
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 bg-gradient-to-br from-blue-600 to-purple-600 rounded flex items-center justify-center">
                  <span className="text-white font-bold text-xs">M</span>
                </div>
                <span>Multipaga Dashboard</span>
              </div>
              
              {showStatus && (
                <>
                  <Separator orientation="vertical" className="h-4" />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center space-x-2 cursor-help">
                        <div className={cn(
                          'w-2 h-2 rounded-full',
                          systemStatus.status === 'operational' ? 'bg-green-500' :
                          systemStatus.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                        )} />
                        <span className="text-xs">
                          {systemStatus.status === 'operational' ? 'Todos los sistemas operativos' :
                           systemStatus.status === 'degraded' ? 'Rendimiento degradado' : 'Interrupciones del servicio'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <div className="space-y-2">
                        <p className="font-medium">Estado del sistema:</p>
                        {systemStatus.services.map((service) => (
                          <div key={service.name} className="flex items-center justify-between gap-4">
                            <span className="text-sm">{service.name}</span>
                            <div className="flex items-center space-x-2">
                              {service.status === 'operational' ? (
                                <CheckCircle className="w-3 h-3 text-green-500" />
                              ) : service.status === 'degraded' ? (
                                <AlertCircle className="w-3 h-3 text-yellow-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-red-500" />
                              )}
                              <span className="text-xs">{service.uptime}%</span>
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-muted-foreground mt-2">
                          Última actualización: {new Date(systemStatus.last_updated).toLocaleTimeString('es-ES')}
                        </p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
            
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>{currentTime.toLocaleTimeString('es-ES')}</span>
              <Link href="/support" className="hover:text-foreground transition-colors">
                <HelpCircle className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </footer>
    )
  }

  // Full footer for landing and marketing pages
  return (
    <footer className={cn('border-t bg-background', className)}>
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">M</span>
              </div>
              <span className="text-xl font-bold">Multipaga</span>
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              Plataforma moderna de gestión de pagos que simplifica las transacciones 
              y potencia tu negocio con integración Hyperswitch.
            </p>
            
            <div className="flex items-center space-x-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://github.com/multipaga" target="_blank" rel="noopener noreferrer">
                      <Github className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>GitHub</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://twitter.com/multipaga" target="_blank" rel="noopener noreferrer">
                      <Twitter className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Twitter</p>
                </TooltipContent>
              </Tooltip>
              
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" asChild>
                    <a href="https://linkedin.com/company/multipaga" target="_blank" rel="noopener noreferrer">
                      <Linkedin className="w-4 h-4" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>LinkedIn</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Product Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Producto</h3>
            <nav className="space-y-3">
              <Link href="/features" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Características
              </Link>
              <Link href="/pricing" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Precios
              </Link>
              <Link href="/integrations" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Integraciones
              </Link>
              <Link href="/api" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                API
              </Link>
              <Link href="/changelog" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                Novedades
              </Link>
            </nav>
          </div>

          {/* Support Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Soporte</h3>
            <nav className="space-y-3">
              <Link href="/docs" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <BookOpen className="w-3 h-3" />
                <span>Documentación</span>
              </Link>
              <Link href="/support" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <HelpCircle className="w-3 h-3" />
                <span>Centro de ayuda</span>
              </Link>
              <Link href="/status" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Zap className="w-3 h-3" />
                <span>Estado del sistema</span>
              </Link>
              <Link href="/contact" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Mail className="w-3 h-3" />
                <span>Contacto</span>
              </Link>
            </nav>
          </div>

          {/* Legal Links */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Legal</h3>
            <nav className="space-y-3">
              <Link href="/privacy" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Lock className="w-3 h-3" />
                <span>Política de privacidad</span>
              </Link>
              <Link href="/terms" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <FileText className="w-3 h-3" />
                <span>Términos de servicio</span>
              </Link>
              <Link href="/security" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <Shield className="w-3 h-3" />
                <span>Seguridad</span>
              </Link>
              <Link href="/compliance" className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
                <CheckCircle className="w-3 h-3" />
                <span>Cumplimiento</span>
              </Link>
            </nav>

            {/* Security Badges */}
            <div className="space-y-2 pt-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                PCI DSS Compliant
              </Badge>
              <Badge variant="outline" className="text-xs">
                <Lock className="w-3 h-3 mr-1" />
                SOC 2 Type II
              </Badge>
            </div>
          </div>
        </div>

        {/* System Status Bar */}
        {showStatus && (
          <>
            <Separator className="my-8" />
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className={cn(
                    'w-3 h-3 rounded-full',
                    systemStatus.status === 'operational' ? 'bg-green-500 animate-pulse' :
                    systemStatus.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
                  )} />
                  <span className="text-sm font-medium">
                    {systemStatus.status === 'operational' ? 'Todos los sistemas operativos' :
                     systemStatus.status === 'degraded' ? 'Rendimiento degradado' : 'Interrupciones del servicio'}
                  </span>
                </div>
                
                <Link 
                  href="/status" 
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center space-x-1"
                >
                  <span>Ver estado completo</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>Actualizado: {new Date(systemStatus.last_updated).toLocaleString('es-ES')}</span>
              </div>
            </div>
          </>
        )}

        {/* Copyright */}
        <Separator className="my-8" />
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <span>© 2024 Multipaga. Todos los derechos reservados.</span>
            <span>Versión 1.0.0</span>
          </div>
          
          <div className="flex items-center space-x-1">
            <span>Hecho con</span>
            <Heart className="w-4 h-4 text-red-500 fill-current" />
            <span>en Honduras</span>
            <div className="flex items-center space-x-1 ml-2">
              <MapPin className="w-3 h-3" />
              <span>Tegucigalpa</span>
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="mt-6 pt-6 border-t">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <Mail className="w-4 h-4" />
              <a href="mailto:soporte@multipaga.com" className="hover:text-foreground transition-colors">
                soporte@multipaga.com
              </a>
            </div>
            
            <div className="flex items-center space-x-2">
              <Phone className="w-4 h-4" />
              <a href="tel:+50422345678" className="hover:text-foreground transition-colors">
                +504 2234-5678
              </a>
            </div>
            
            <div className="flex items-center space-x-2">
              <Globe className="w-4 h-4" />
              <a href="https://multipaga.com" className="hover:text-foreground transition-colors">
                multipaga.com
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}