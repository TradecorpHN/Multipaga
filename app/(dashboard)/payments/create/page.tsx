// app/(dashboard)/payments/create/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { 
  ArrowLeft,
  CreditCard,
  Info,
  Plus,
  Loader2,
  AlertCircle,
  CheckCircle,
  User,
  Mail,
  Globe,
  Building,
  Shield,
  Smartphone,
  Calendar,
  Hash,
  FileText,
  DollarSign
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { trpc } from '@/utils/trpc'
import { formatCurrency } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'

// Payment form schema
const paymentSchema = z.object({
  // Basic Information
  amount: z.string().min(1, 'Amount is required').regex(/^\d+(\.\d{1,2})?$/, 'Invalid amount format'),
  currency: z.string().min(3, 'Currency is required'),
  description: z.string().optional(),
  statement_descriptor: z.string().max(22, 'Statement descriptor must be 22 characters or less').optional(),
  
  // Customer Information
  customer_id: z.string().optional(),
  customer_email: z.string().email('Invalid email').optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  
  // Payment Method
  payment_method_type: z.enum(['card', 'bank_transfer', 'wallet']),
  save_payment_method: z.boolean().default(false),
  
  // Card Details (conditional)
  card_number: z.string().optional(),
  card_exp_month: z.string().optional(),
  card_exp_year: z.string().optional(),
  card_cvc: z.string().optional(),
  card_holder_name: z.string().optional(),
  
  // Billing Address
  billing_address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  
  // Additional Options
  capture_method: z.enum(['automatic', 'manual']).default('automatic'),
  setup_future_usage: z.enum(['off_session', 'on_session', '']).optional(),
  mandate_id: z.string().optional(),
  
  // Metadata
  metadata: z.record(z.string()).optional(),
})

type PaymentForm = z.infer<typeof paymentSchema>

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'MXN', symbol: '$', name: 'Mexican Peso' },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real' },
]

const PAYMENT_METHODS = [
  {
    value: 'card',
    label: 'Credit/Debit Card',
    icon: CreditCard,
    description: 'Pay with Visa, Mastercard, or American Express',
  },
  {
    value: 'bank_transfer',
    label: 'Bank Transfer',
    icon: Building,
    description: 'Direct bank account transfer',
  },
  {
    value: 'wallet',
    label: 'Digital Wallet',
    icon: Smartphone,
    description: 'Apple Pay, Google Pay, or other wallets',
  },
]

export default function CreatePaymentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  const [step, setStep] = useState(1)
  const [isCreating, setIsCreating] = useState(false)
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
  
  // Get initial values from URL params
  const customerId = searchParams.get('customer_id')
  const mandateId = searchParams.get('mandate_id')
  const amount = searchParams.get('amount')
  const currency = searchParams.get('currency')

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    trigger,
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      amount: amount || '',
      currency: currency || 'USD',
      customer_id: customerId || '',
      mandate_id: mandateId || '',
      payment_method_type: 'card',
      capture_method: 'automatic',
      save_payment_method: false,
    },
  })

  const watchedAmount = watch('amount')
  const watchedCurrency = watch('currency')
  const watchedPaymentMethod = watch('payment_method_type')
  const watchedCustomerId = watch('customer_id')
  const watchedCaptureMethod = watch('capture_method')

  // Fetch customer details if customer_id is provided
  const { data: customer } = trpc.customers.get.useQuery(
    { customer_id: watchedCustomerId },
    { enabled: !!watchedCustomerId }
  )

  // Fetch available payment methods
  const { data: paymentMethods } = trpc.payments.methods.useQuery({})

  // Create payment mutation
  const createMutation = trpc.payments.create.useMutation({
    onSuccess: (data) => {
      toast({
        title: 'Payment Created',
        description: `Payment ${data.payment_id} has been created successfully.`,
      })
      router.push(`/payments/${data.payment_id}`)
    },
    onError: (error) => {
      toast({
        title: 'Payment Failed',
        description: error.message,
        variant: 'destructive',
      })
      setIsCreating(false)
    },
  })

  useEffect(() => {
    if (customer) {
      setSelectedCustomer(customer)
      setValue('customer_email', customer.email)
      setValue('customer_name', customer.name)
      setValue('customer_phone', customer.phone)
    }
  }, [customer, setValue])

  const validateStep = async () => {
    let fieldsToValidate: (keyof PaymentForm)[] = []
    
    switch (step) {
      case 1:
        fieldsToValidate = ['amount', 'currency', 'description']
        break
      case 2:
        if (!watchedCustomerId) {
          fieldsToValidate = ['customer_email']
        }
        break
      case 3:
        if (watchedPaymentMethod === 'card') {
          fieldsToValidate = ['card_number', 'card_exp_month', 'card_exp_year', 'card_cvc']
        }
        break
    }
    
    const isValid = await trigger(fieldsToValidate)
    return isValid
  }

  const handleNext = async () => {
    const isValid = await validateStep()
    if (isValid) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    setStep(step - 1)
  }

  const onSubmit = async (data: PaymentForm) => {
    setIsCreating(true)
    
    // Transform the data for API
    const paymentData = {
      amount: Math.round(parseFloat(data.amount) * 100), // Convert to cents
      currency: data.currency,
      description: data.description,
      statement_descriptor_name: data.statement_descriptor,
      customer_id: data.customer_id,
      email: data.customer_email,
      name: data.customer_name,
      phone: data.customer_phone,
      payment_method: data.payment_method_type,
      payment_method_data: {
        card: data.payment_method_type === 'card' ? {
          card_number: data.card_number,
          card_exp_month: data.card_exp_month,
          card_exp_year: data.card_exp_year,
          card_cvc: data.card_cvc,
          card_holder_name: data.card_holder_name,
        } : undefined,
      },
      billing: data.billing_address,
      capture_method: data.capture_method,
      setup_future_usage: data.setup_future_usage || undefined,
      customer_acceptance: data.save_payment_method ? {
        acceptance_type: 'online',
        accepted_at: new Date().toISOString(),
        online: {
          ip_address: '0.0.0.0', // This should be captured from the request
          user_agent: navigator.userAgent,
        },
      } : undefined,
      mandate_id: data.mandate_id,
      metadata: data.metadata,
    }
    
    await createMutation.mutateAsync(paymentData)
  }

  const formatCardNumber = (value: string) => {
    const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '')
    const matches = v.match(/\d{4,16}/g)
    const match = (matches && matches[0]) || ''
    const parts = []

    for (let i = 0, len = match.length; i < len; i += 4) {
      parts.push(match.substring(i, i + 4))
    }

    if (parts.length) {
      return parts.join(' ')
    } else {
      return value
    }
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/payments')}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Payment</h1>
          <p className="text-muted-foreground">
            Process a new payment transaction
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center space-x-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 ${
                step >= i
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-muted bg-background text-muted-foreground'
              }`}
            >
              {step > i ? <CheckCircle className="h-5 w-5" /> : i}
            </div>
            {i < 4 && (
              <div
                className={`ml-2 h-0.5 w-16 ${
                  step > i ? 'bg-primary' : 'bg-muted'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step Labels */}
      <div className="flex justify-around text-sm">
        <span className={step >= 1 ? 'text-foreground' : 'text-muted-foreground'}>
          Amount
        </span>
        <span className={step >= 2 ? 'text-foreground' : 'text-muted-foreground'}>
          Customer
        </span>
        <span className={step >= 3 ? 'text-foreground' : 'text-muted-foreground'}>
          Payment
        </span>
        <span className={step >= 4 ? 'text-foreground' : 'text-muted-foreground'}>
          Review
        </span>
      </div>

      {/* Form Steps */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Amount & Details */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Details</CardTitle>
              <CardDescription>
                Enter the amount and basic information for this payment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount *</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="amount"
                      type="text"
                      placeholder="0.00"
                      className="pl-9"
                      {...register('amount')}
                    />
                  </div>
                  {errors.amount && (
                    <p className="text-sm text-destructive">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="currency">Currency *</Label>
                  <Controller
                    name="currency"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              <span className="flex items-center gap-2">
                                <span className="font-mono">{curr.code}</span>
                                <span className="text-muted-foreground">
                                  {curr.symbol} - {curr.name}
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.currency && (
                    <p className="text-sm text-destructive">{errors.currency.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Payment for order #12345"
                  {...register('description')}
                />
                {errors.description && (
                  <p className="text-sm text-destructive">{errors.description.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="statement_descriptor">
                  Statement Descriptor
                  <span className="ml-2 text-xs text-muted-foreground">
                    (Max 22 characters)
                  </span>
                </Label>
                <Input
                  id="statement_descriptor"
                  placeholder="COMPANY NAME"
                  maxLength={22}
                  {...register('statement_descriptor')}
                />
                {errors.statement_descriptor && (
                  <p className="text-sm text-destructive">
                    {errors.statement_descriptor.message}
                  </p>
                )}
              </div>

              <Accordion type="single" collapsible>
                <AccordionItem value="advanced">
                  <AccordionTrigger>Advanced Options</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Capture Method</Label>
                      <Controller
                        name="capture_method"
                        control={control}
                        render={({ field }) => (
                          <RadioGroup
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="automatic" id="automatic" />
                              <Label htmlFor="automatic" className="font-normal">
                                Automatic - Capture immediately
                              </Label>
                            </div>
                            <div className="flex items-center space-x-2">
                              <RadioGroupItem value="manual" id="manual" />
                              <Label htmlFor="manual" className="font-normal">
                                Manual - Authorize only, capture later
                              </Label>
                            </div>
                          </RadioGroup>
                        )}
                      />
                    </div>

                    {mandateId && (
                      <Alert>
                        <Info className="h-4 w-4" />
                        <AlertTitle>Mandate Payment</AlertTitle>
                        <AlertDescription>
                          This payment will use mandate {mandateId}
                        </AlertDescription>
                      </Alert>
                    )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 2: Customer Information */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
              <CardDescription>
                Select an existing customer or enter new customer details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue={customerId ? 'existing' : 'new'}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Existing Customer</TabsTrigger>
                  <TabsTrigger value="new">New Customer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="existing" className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_id">Customer ID</Label>
                    <Input
                      id="customer_id"
                      placeholder="cus_1234567890"
                      {...register('customer_id')}
                    />
                  </div>
                  
                  {selectedCustomer && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                            <User className="h-6 w-6" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{selectedCustomer.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {selectedCustomer.email}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
                
                <TabsContent value="new" className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="customer_email">Email *</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        placeholder="customer@example.com"
                        {...register('customer_email')}
                      />
                      {errors.customer_email && (
                        <p className="text-sm text-destructive">
                          {errors.customer_email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="customer_name">Name</Label>
                      <Input
                        id="customer_name"
                        placeholder="John Doe"
                        {...register('customer_name')}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="customer_phone">Phone</Label>
                    <Input
                      id="customer_phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      {...register('customer_phone')}
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Controller
                      name="save_payment_method"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          id="save_payment_method"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      )}
                    />
                    <Label htmlFor="save_payment_method" className="font-normal">
                      Save payment method for future use
                    </Label>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 3: Payment Method */}
        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment Method</CardTitle>
              <CardDescription>
                Choose how the customer will pay
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Method Type</Label>
                <Controller
                  name="payment_method_type"
                  control={control}
                  render={({ field }) => (
                    <RadioGroup value={field.value} onValueChange={field.onChange}>
                      {PAYMENT_METHODS.map((method) => {
                        const Icon = method.icon
                        return (
                          <div
                            key={method.value}
                            className="flex items-start space-x-3 rounded-lg border p-4"
                          >
                            <RadioGroupItem value={method.value} id={method.value} />
                            <div className="flex-1">
                              <Label htmlFor={method.value} className="flex items-center gap-2">
                                <Icon className="h-4 w-4" />
                                {method.label}
                              </Label>
                              <p className="text-sm text-muted-foreground">
                                {method.description}
                              </p>
                            </div>
                          </div>
                        )
                      })}
                    </RadioGroup>
                  )}
                />
              </div>

              {watchedPaymentMethod === 'card' && (
                <div className="space-y-4">
                  <Separator />
                  <div className="space-y-2">
                    <Label htmlFor="card_number">Card Number *</Label>
                    <Input
                      id="card_number"
                      placeholder="1234 5678 9012 3456"
                      {...register('card_number', {
                        onChange: (e) => {
                          e.target.value = formatCardNumber(e.target.value)
                        },
                      })}
                    />
                    {errors.card_number && (
                      <p className="text-sm text-destructive">{errors.card_number.message}</p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="card_exp_month">Exp. Month *</Label>
                      <Input
                        id="card_exp_month"
                        placeholder="MM"
                        maxLength={2}
                        {...register('card_exp_month')}
                      />
                      {errors.card_exp_month && (
                        <p className="text-sm text-destructive">
                          {errors.card_exp_month.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card_exp_year">Exp. Year *</Label>
                      <Input
                        id="card_exp_year"
                        placeholder="YY"
                        maxLength={2}
                        {...register('card_exp_year')}
                      />
                      {errors.card_exp_year && (
                        <p className="text-sm text-destructive">
                          {errors.card_exp_year.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="card_cvc">CVC *</Label>
                      <Input
                        id="card_cvc"
                        placeholder="123"
                        maxLength={4}
                        {...register('card_cvc')}
                      />
                      {errors.card_cvc && (
                        <p className="text-sm text-destructive">{errors.card_cvc.message}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="card_holder_name">Cardholder Name</Label>
                    <Input
                      id="card_holder_name"
                      placeholder="John Doe"
                      {...register('card_holder_name')}
                    />
                  </div>
                </div>
              )}

              <Alert>
                <Shield className="h-4 w-4" />
                <AlertTitle>Secure Payment</AlertTitle>
                <AlertDescription>
                  Your payment information is encrypted and processed securely.
                  We never store card details on our servers.
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* Step 4: Review & Confirm */}
        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Review Payment</CardTitle>
              <CardDescription>
                Confirm the payment details before processing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Amount Summary */}
              <div className="rounded-lg bg-muted p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Amount</span>
                  <span className="text-2xl font-bold">
                    {formatCurrency(parseFloat(watchedAmount || '0') * 100, watchedCurrency)}
                  </span>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Payment Details</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Currency</dt>
                      <dd>{watchedCurrency}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Capture Method</dt>
                      <dd className="capitalize">{watchedCaptureMethod}</dd>
                    </div>
                    {watch('description') && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Description</dt>
                        <dd>{watch('description')}</dd>
                      </div>
                    )}
                    {watch('statement_descriptor') && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Statement Descriptor</dt>
                        <dd>{watch('statement_descriptor')}</dd>
                      </div>
                    )}
                  </dl>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Customer</h3>
                  <dl className="space-y-2 text-sm">
                    {selectedCustomer ? (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Name</dt>
                          <dd>{selectedCustomer.name}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Email</dt>
                          <dd>{selectedCustomer.email}</dd>
                        </div>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Customer ID</dt>
                          <dd className="font-mono text-xs">{selectedCustomer.customer_id}</dd>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Email</dt>
                          <dd>{watch('customer_email')}</dd>
                        </div>
                        {watch('customer_name') && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Name</dt>
                            <dd>{watch('customer_name')}</dd>
                          </div>
                        )}
                        {watch('customer_phone') && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Phone</dt>
                            <dd>{watch('customer_phone')}</dd>
                          </div>
                        )}
                      </>
                    )}
                  </dl>
                </div>

                <Separator />

                <div>
                  <h3 className="font-medium mb-2">Payment Method</h3>
                  <dl className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Type</dt>
                      <dd className="capitalize">{watchedPaymentMethod}</dd>
                    </div>
                    {watchedPaymentMethod === 'card' && watch('card_number') && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Card</dt>
                        <dd>•••• {watch('card_number')?.slice(-4)}</dd>
                      </div>
                    )}
                    {watch('save_payment_method') && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Save for future</dt>
                        <dd>
                          <Badge variant="secondary">Yes</Badge>
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Important</AlertTitle>
                <AlertDescription>
                  By clicking "Process Payment", you authorize this transaction.
                  {watchedCaptureMethod === 'manual' && (
                    <span className="block mt-1">
                      This payment will be authorized only. You'll need to capture it manually.
                    </span>
                  )}
                </AlertDescription>
              </Alert>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                Back
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Payment'
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </form>
    </div>
  )
}