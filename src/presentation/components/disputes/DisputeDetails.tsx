// ==============================================================================
// DisputeDetails.tsx - Componente para mostrar detalles de una disputa
// ==============================================================================

'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/presentation/components/ui/Card'
import { Badge } from '@/presentation/components/ui/Badge'
import { Button } from '@/presentation/components/ui/Button'
import { Separator } from '@/presentation/components/ui/Separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/presentation/components/ui/Tabs'
import { Alert, AlertDescription, AlertTitle } from '@/presentation/components/ui/Alert'
import { Progress } from '@/presentation/components/ui/Progress'
import { cn } from '@/presentation/lib/utils'

import { formatCurrency, formatDate } from '@/presentation/components/ui/formatters'
import {
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Info,
  FileText,
  Download,
  Upload,
  Eye,
  MessageSquare,
  Calendar,
  DollarSign,
  CreditCard,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
  Copy,
  ExternalLink,
  Shield,
  Zap
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// Tipos para disputas basados en Hyperswitch
interface DisputeResponse {
  dispute_id: string
  payment_id: string
  attempt_id: string
  amount: string
  currency: string
  dispute_stage: 'pre_dispute' | 'dispute' | 'pre_arbitration'
  dispute_status: 'dispute_opened' | 'dispute_expired' | 'dispute_accepted' | 'dispute_cancelled' | 'dispute_challenged' | 'dispute_won' | 'dispute_lost'
  connector: string
  connector_status: string
  connector_dispute_id: string
  connector_reason?: string
  connector_reason_code?: string
  challenge_required_by?: string
  connector_created_at?: string
  connector_updated_at?: string
  created_at: string
  profile_id?: string
  merchant_connector_id?: string
}

interface DisputeEvidenceFile {
  file_id: string
  file_name: string
  file_size: number
  file_type: string
  uploaded_at: string
  download_url?: string
}

interface DisputeDetailsProps {
  dispute: DisputeResponse
  evidence?: DisputeEvidenceFile[]
  onSubmitEvidence?: () => void
  onAcceptDispute?: () => void
  onChallengeDispute?: () => void
  className?: string
}

// Configuración de estados
const DISPUTE_STATUS_CONFIG = {
  dispute_opened: { 
    label: 'Opened', 
    variant: 'destructive' as const, 
    icon: AlertTriangle,
    description: 'Dispute has been opened by the customer'
  },
  dispute_expired: { 
    label: 'Expired', 
    variant: 'secondary' as const, 
    icon: Clock,
    description: 'Dispute has expired without action'
  },
  dispute_accepted: { 
    label: 'Accepted', 
    variant: 'secondary' as const, 
    icon: CheckCircle,
    description: 'Dispute has been accepted'
  },
  dispute_cancelled: { 
    label: 'Cancelled', 
    variant: 'secondary' as const, 
    icon: XCircle,
    description: 'Dispute has been cancelled'
  },
  dispute_challenged: { 
    label: 'Challenged', 
    variant: 'warning' as const, 
    icon: Shield,
    description: 'Evidence has been submitted for this dispute'
  },
  dispute_won: { 
    label: 'Won', 
    variant: 'success' as const, 
    icon: CheckCircle,
    description: 'Dispute has been resolved in your favor'
  },
  dispute_lost: { 
    label: 'Lost', 
    variant: 'destructive' as const, 
    icon: XCircle,
    description: 'Dispute has been resolved against you'
  },
}

const DISPUTE_STAGE_CONFIG = {
  pre_dispute: { label: 'Pre-Dispute', progress: 25 },
  dispute: { label: 'Dispute', progress: 50 },
  pre_arbitration: { label: 'Pre-Arbitration', progress: 75 },
}

// Función para copiar al portapapeles
const handleCopy = async (text: string, label: string) => {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label} copied to clipboard`)
  } catch (error) {
    toast.error('Failed to copy')
  }
}

const formatFileSize = (bytes: number): string => {
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  if (bytes === 0) return '0 Byte'
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)).toString())
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
}

export function DisputeDetails({
  dispute,
  evidence = [],
  onSubmitEvidence,
  onAcceptDispute,
  onChallengeDispute,
  className
}: DisputeDetailsProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const statusConfig = DISPUTE_STATUS_CONFIG[dispute.dispute_status]
  const stageConfig = DISPUTE_STAGE_CONFIG[dispute.dispute_stage]
  const StatusIcon = statusConfig.icon

  const canChallenge = dispute.dispute_status === 'dispute_opened' && 
                      dispute.challenge_required_by && 
                      new Date(dispute.challenge_required_by) > new Date()

  const canAccept = dispute.dispute_status === 'dispute_opened'

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <CardTitle className="text-xl">Dispute Details</CardTitle>
                <Badge 
                  variant={statusConfig.variant}
                  className="flex items-center space-x-1"
                >
                  <StatusIcon className="w-3 h-3" />
                  <span>{statusConfig.label}</span>
                </Badge>
              </div>
              <CardDescription>{statusConfig.description}</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(dispute.dispute_id, 'Dispute ID')}
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy ID
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Dispute Stage</span>
              <span className="font-medium">{stageConfig.label}</span>
            </div>
            <Progress value={stageConfig.progress} className="h-2" />
          </div>

          {/* Key Information */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Amount</p>
              <p className="font-medium text-lg">
                {formatCurrency(parseInt(dispute.amount), { currency: dispute.currency })}
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Connector</p>
              <p className="font-medium capitalize">{dispute.connector}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Created</p>
              <p className="font-medium">{formatDate(dispute.created_at)}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-gray-500">Payment ID</p>
              <Button
                variant="link"
                className="h-auto p-0 font-medium text-blue-400"
                onClick={() => handleCopy(dispute.payment_id, 'Payment ID')}
              >
                {dispute.payment_id.slice(0, 20)}...
              </Button>
            </div>
          </div>

          {/* Challenge Deadline */}
          {dispute.challenge_required_by && (
            <Alert className={cn(
              canChallenge ? 'border-yellow-500/50 bg-yellow-500/10' : 'border-gray-500/50'
            )}>
              <Clock className="w-4 h-4" />
              <AlertTitle>Challenge Deadline</AlertTitle>
              <AlertDescription>
                {canChallenge ? (
                  <>Challenge required by {formatDate(dispute.challenge_required_by)}</>
                ) : (
                  <>Challenge deadline passed on {formatDate(dispute.challenge_required_by)}</>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          {(canChallenge || canAccept) && (
            <div className="flex items-center space-x-3 pt-4 border-t border-gray-200/20">
              {canChallenge && (
                <Button onClick={onChallengeDispute} variant="default">
                  <Shield className="w-4 h-4 mr-2" />
                  Challenge Dispute
                </Button>
              )}
              {canAccept && (
                <Button onClick={onAcceptDispute} variant="outline">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Accept Dispute
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Information Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="evidence">Evidence</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="raw">Raw Data</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dispute Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>Dispute Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Dispute ID</p>
                    <p className="font-mono text-sm">{dispute.dispute_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Connector Dispute ID</p>
                    <p className="font-mono text-sm">{dispute.connector_dispute_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Stage</p>
                    <p className="font-medium">{stageConfig.label}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Status</p>
                    <Badge variant={statusConfig.variant}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
                
                {dispute.connector_reason && (
                  <div>
                    <p className="text-sm text-gray-500">Reason</p>
                    <p className="text-sm">{dispute.connector_reason}</p>
                  </div>
                )}
                
                {dispute.connector_reason_code && (
                  <div>
                    <p className="text-sm text-gray-500">Reason Code</p>
                    <p className="font-mono text-sm">{dispute.connector_reason_code}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Payment Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CreditCard className="w-5 h-5" />
                  <span>Payment Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Payment ID</p>
                    <p className="font-mono text-sm">{dispute.payment_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Attempt ID</p>
                    <p className="font-mono text-sm">{dispute.attempt_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Amount</p>
                    <p className="font-medium text-lg">
                      {formatCurrency(parseInt(dispute.amount), { currency: dispute.currency })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Currency</p>
                    <p className="font-medium">{dispute.currency}</p>
                  </div>
                </div>
                
                <Button variant="outline" size="sm" className="w-full">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  View Payment Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="evidence" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center space-x-2">
                    <FileText className="w-5 h-5" />
                    <span>Evidence Files</span>
                    <Badge variant="secondary">{evidence.length}</Badge>
                  </CardTitle>
                  <CardDescription>
                    Supporting documents for this dispute
                  </CardDescription>
                </div>
                {canChallenge && (
                  <Button onClick={onSubmitEvidence}>
                    <Upload className="w-4 h-4 mr-2" />
                    Submit Evidence
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {evidence.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No evidence files uploaded</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {evidence.map((file) => (
                    <div key={file.file_id} className="flex items-center justify-between p-3 border border-gray-200/20 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="font-medium">{file.file_name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.file_size)} • {file.file_type} • {formatDate(file.uploaded_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {file.download_url && (
                          <>
                            <Button variant="outline" size="sm">
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </Button>
                            <Button variant="outline" size="sm">
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="w-5 h-5" />
                <span>Dispute Timeline</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium">Dispute Opened</p>
                    <p className="text-sm text-gray-500">{formatDate(dispute.created_at)}</p>
                  </div>
                </div>
                
                {dispute.connector_created_at && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Created at Connector</p>
                      <p className="text-sm text-gray-500">{formatDate(dispute.connector_created_at)}</p>
                    </div>
                  </div>
                )}
                
                {dispute.connector_updated_at && (
                  <div className="flex items-start space-x-3">
                    <div className="w-2 h-2 bg-yellow-500 rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium">Last Updated</p>
                      <p className="text-sm text-gray-500">{formatDate(dispute.connector_updated_at)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raw" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Raw Dispute Data</span>
              </CardTitle>
              <CardDescription>
                Complete dispute object from Hyperswitch API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="text-xs bg-gray-900/50 p-4 rounded-lg overflow-auto max-h-96">
                {JSON.stringify(dispute, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
