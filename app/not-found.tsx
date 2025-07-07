// app/not-found.tsx
import Link from 'next/link'
import { FileQuestion, Home, ArrowLeft, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-12 w-12 text-muted-foreground" />
          </div>
          <CardTitle className="text-3xl font-bold">404</CardTitle>
          <CardDescription className="text-lg">
            Page not found
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search for a page..." 
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = e.currentTarget.value
                  window.location.href = `/search?q=${encodeURIComponent(query)}`
                }
              }}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <div className="flex w-full gap-2">
            <Button asChild variant="default" className="flex-1">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </Button>
            <Button 
              onClick={() => window.history.back()} 
              variant="outline" 
              className="flex-1"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </div>
          <div className="mt-4 text-center">
            <p className="text-xs text-muted-foreground">
              Quick links:
            </p>
            <div className="mt-2 flex flex-wrap justify-center gap-2 text-xs">
              <Link href="/payments" className="text-primary hover:underline">
                Payments
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/refunds" className="text-primary hover:underline">
                Refunds
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/connectors" className="text-primary hover:underline">
                Connectors
              </Link>
              <span className="text-muted-foreground">•</span>
              <Link href="/settings" className="text-primary hover:underline">
                Settings
              </Link>
            </div>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}