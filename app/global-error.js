"use client"

import { Button } from "@/components/ui/button"
import { RefreshCcw } from "lucide-react"

export default function GlobalError({ error, reset }) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f0f] text-[#f0f0f0] flex flex-col items-center justify-center min-h-screen text-center p-6 font-sans">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-8">
          <span className="text-4xl">⚠️</span>
        </div>
        
        <h1 className="text-4xl font-black mb-4 tracking-tight">Critical Error</h1>
        <p className="text-muted-foreground max-w-sm mb-12">
          CampusZen encountered a catastrophic system error. Please reload the application.
        </p>

        <Button 
          onClick={() => window.location.reload()}
          size="lg"
          className="rounded-full bg-primary hover:bg-primary/90 min-w-[200px] h-14 font-bold gap-2"
        >
          <RefreshCcw className="w-5 h-5" />
          Reload Application
        </Button>

        {process.env.NODE_ENV === 'development' && (
          <div className="mt-12 p-4 bg-red-500/5 border border-red-500/20 rounded-xl text-left">
            <pre className="text-[10px] text-red-400 overflow-auto max-w-md">
              {error.stack}
            </pre>
          </div>
        )}
      </body>
    </html>
  )
}
