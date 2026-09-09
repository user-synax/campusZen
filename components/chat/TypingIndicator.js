"use client"

import UserAvatar from "@/components/user/UserAvatar"

export default function TypingIndicator({ users }) {
  if (!users || users.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-2 py-1 animate-in fade-in slide-in-from-bottom-1"> 
      <div className="flex -space-x-1"> 
        {users.slice(0, 3).map((user, i) => ( 
          <UserAvatar key={i} user={user} size="xs" 
            className="border border-background" /> 
        ))} 
      </div> 
 
      <div className="flex items-center gap-1 bg-card/80 backdrop-blur-md border border-border/60 shadow-sm
                      rounded-2xl rounded-bl-sm px-3 py-2"> 
        {/* Animated dots */} 
        <div className="flex gap-1"> 
          {[0, 1, 2].map(i => ( 
            <div 
              key={i} 
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" 
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }} 
            /> 
          ))} 
        </div> 
      </div> 
 
      <span className="text-[10px] text-muted-foreground italic">
        {users.length === 1 
          ? `${users[0].name} is typing...` 
          : `${users.length} people are typing...`
        }
      </span>
    </div>
  )
}
