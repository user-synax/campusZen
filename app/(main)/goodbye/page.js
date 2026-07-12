"use client"

import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { Heart, Home } from "lucide-react"

export default function GoodbyePage() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 text-center">
      <div className="space-y-6 max-w-md animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <Heart className="w-10 h-10 text-primary fill-primary/20" />
        </div>
        
        <h1 className="text-3xl font-bold tracking-tight">Your account has been deleted</h1>
        <p className="text-muted-foreground text-lg">
          We&apos;re sorry to see you go. Your data has been removed and your account is now deactivated.
        </p>
        
        <div className="flex flex-col gap-3 mt-8">
          <Button 
            className="rounded-full h-12 text-base font-semibold"
            onClick={() => router.push('/signup')}
          >
            Create New Account
          </Button>
          <Button 
            variant="ghost" 
            className="rounded-full h-12 text-base"
            onClick={() => router.push('/')}
          >
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>

        <p className="text-xs text-muted-foreground pt-12">
          Thank you for being part of CampusZen 💙
        </p>
      </div>
    </div>
  )
}
