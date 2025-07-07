// app/(dashboard)/settings/page.tsx
'use client'

import { 
  User, 
  Shield, 
  Key, 
  Webhook, 
  Users, 
  CreditCard,
  Building,
  Globe,
  Bell,
  Palette,
  Code,
  FileText,
  HelpCircle,
  ChevronRight
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/auth.store'

const settingsCategories = [
  {
    title: 'Account',
    items: [
      {
        icon: User,
        title: 'Profile',
        description: 'Manage your personal information and preferences',
        href: '/settings/profile',
        badge: null,
      },
      {
        icon: Shield,
        title: 'Security',
        description: 'Password, two-factor authentication, and security settings',
        href: '/settings/security',
        badge: 'Recommended',
        badgeVariant: 'secondary' as const,
      },
      {
        icon: Bell,
        title: 'Notifications',
        description: 'Configure email and webhook notifications',
        href: '/settings/notifications',
        badge: null,
      },
    ],
  },
  {
    title: 'Business',
    items: [
      {
        icon: Building,
        title: 'Company Details',
        description: 'Business information, tax details, and compliance',
        href: '/settings/company',
        badge: null,
      },
      {
        icon: Users,
        title: 'Team Management',
        description: 'Invite team members and manage permissions',
        href: '/settings/team',
        badge: 'Pro',
        badgeVariant: 'default' as const,
      },
      {
        icon: CreditCard,
        title: 'Billing & Invoices',
        description: 'Payment methods, invoices, and subscription details',
        href: '/settings/billing',
        badge: null,
      },
    ],
  },
  {
    title: 'Integration',
    items: [
      {
        icon: Key,
        title: 'API Keys',
        description: 'Manage your API keys and access tokens',
        href: '/settings/api-keys',
        badge: null,
      },
      {
        icon: Webhook,
        title: 'Webhooks',
        description: 'Configure webhook endpoints and events',
        href: '/settings/webhooks',
        badge: null,
      },
      {
        icon: Code,
        title: 'Developer Settings',
        description: 'Advanced configuration and debugging tools',
        href: '/settings/developer',
        badge: 'Beta',
        badgeVariant: 'outline' as const,
      },
    ],
  },
  {
    title: 'Preferences',
    items: [
      {
        icon: Globe,
        title: 'Localization',
        description: 'Language, timezone, and currency preferences',
        href: '/settings/localization',
        badge: null,
      },
      {
        icon: Palette,
        title: 'Appearance',
        description: 'Theme, colors, and display preferences',
        href: '/settings/appearance',
        badge: null,
      },
      {
        icon: FileText,
        title: 'Reports & Export',
        description: 'Configure automated reports and data exports',
        href: '/settings/reports',
        badge: null,
      },
    ],
  },
]

export default function SettingsPage() {
  const router = useRouter()
  const user = useAuthStore((state) => state.user)

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Account Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">Active</span>
              <Badge variant="success">Verified</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Member since {new Date(user?.created_at || Date.now()).toLocaleDateString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">API Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">2.4M</span>
              <span className="text-sm text-muted-foreground">/10M</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Monthly API calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Team Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">5</span>
              <Button size="sm" variant="outline">
                Invite
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active team members
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Settings Categories */}
      <div className="space-y-8">
        {settingsCategories.map((category) => (
          <div key={category.title}>
            <h2 className="text-lg font-semibold mb-4">{category.title}</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {category.items.map((item) => (
                <Card 
                  key={item.href}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => router.push(item.href)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <item.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{item.title}</CardTitle>
                          {item.badge && (
                            <Badge variant={item.badgeVariant} className="mt-1">
                              {item.badge}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm">
                      {item.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Help Section */}
      <Card className="bg-muted/50">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 rounded-lg">
              <HelpCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Need help with settings?</h3>
              <p className="text-sm text-muted-foreground">
                Check our documentation or contact support for assistance.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">View Docs</Button>
            <Button>Contact Support</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}