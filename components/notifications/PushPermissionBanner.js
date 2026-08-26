"use client" 
 
import { Bell, X } from 'lucide-react' 
import { Button } from '@/components/ui/button' 
 
export default function PushPermissionBanner({ onSubscribe, onDismiss, isLoading }) { 
  return ( 
    <div className=" 
      mx-4 mt-4 mb-2 
      bg-gradient-to-r from-blue-500/10 to-purple-500/10 
      border border-blue-500/20 
      rounded-xl p-4 
      animate-in slide-in-from-top-2 duration-300 
    "> 
      <div className="flex items-start gap-3"> 
        {/* Icon */} 
        <div className=" 
          w-10 h-10 rounded-full 
          bg-primary/10 border border-primary/20 
          flex items-center justify-center 
          flex-shrink-0 
        "> 
          <Bell className="w-5 h-5 text-primary" /> 
        </div> 
 
        {/* Text */} 
        <div className="flex-1 min-w-0"> 
          <p className="font-semibold text-sm"> 
            Stay updated even when app is closed 
          </p> 
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed"> 
            Get notified for likes, comments, and follows — 
            even when CampusZen is closed. 
          </p> 
        </div> 
 
        {/* Dismiss */}
        <button 
          onClick={onDismiss} 
          className="text-muted-foreground hover:text-foreground flex-shrink-0" 
        > 
          <X className="w-4 h-4" /> 
        </button> 
      </div> 
 
      {/* Buttons */} 
      <div className="flex gap-2 mt-3"> 
        <Button 
          size="sm" 
          onClick={onSubscribe} 
          disabled={isLoading} 
          className="flex-1 h-8 text-xs" 
        > 
          {isLoading ? ( 
            <> 
              <div className="w-3 h-3 border-2 border-primary-foreground/30 
                              border-t-primary-foreground rounded-full animate-spin mr-1.5" /> 
              Enabling... 
            </> 
          ) : ( 
            <> 
              <Bell className="w-3 h-3 mr-1.5" /> 
              Enable Notifications 
            </> 
          )} 
        </Button> 
        <Button 
          size="sm" 
          variant="ghost" 
          onClick={onDismiss} 
          className="h-8 text-xs text-muted-foreground" 
        > 
          Not now 
        </Button> 
      </div> 
    </div> 
  ) 
} 
