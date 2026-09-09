"use client"

import { useState, useEffect } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function PollDisplay({ poll, postId, currentUserId, isExpired }) {
  const [userVotedOptionId, setUserVotedOptionId] = useState(null)
  const [results, setResults] = useState(poll?.options || [])
  const [totalVotes, setTotalVotes] = useState(0)
  const [isVoting, setIsVoting] = useState(false)

  useEffect(() => {
    if (!poll || !poll.options) return

    // Find if user already voted
    let votedId = null
    let total = 0
    poll.options.forEach(option => {
      const votes = option.votes || []
      total += votes.length
      if (currentUserId && votes.some(v => v.toString() === currentUserId.toString())) {
        votedId = option._id
      }
    })

    setUserVotedOptionId(votedId)
    setTotalVotes(total)
    
    // Calculate initial percentages
    const initialResults = poll.options.map(o => ({
      ...o,
      votes: o.votes?.length || 0,
      percentage: total > 0 ? Math.round(((o.votes?.length || 0) / total) * 100) : 0
    }))
    setResults(initialResults)
  }, [poll, currentUserId])

  const handleVote = async (optionId) => {
    if (!currentUserId) { toast.error("Please login to vote"); return }
    if (isVoting || userVotedOptionId || liveExpired) return

    setIsVoting(true)
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionId }),
      })

      const data = await res.json()

      if (res.status === 409) {
        toast.error("Already voted")
        // If the server says we already voted, we should ideally refresh the state
        return
      }

      if (res.status === 400 && data.message === 'Poll has ended') {
        toast.error("Poll has ended")
        return
      }

      if (!res.ok) throw new Error(data.message)

      setResults(data.results)
      setTotalVotes(data.totalVotes)
      setUserVotedOptionId(data.userVotedOptionId)
      toast.success("Vote recorded!")
    } catch (error) {
      toast.error(error.message || "Failed to vote")
    } finally {
      setIsVoting(false)
    }
  }

  const getTimeUntilExpiry = () => {
    if (liveExpired) return "Poll ended"
    const now = new Date(); const expiry = new Date(poll.expiresAt); const diff = expiry - now;
    if (diff <= 0) return "Poll ended";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) return `${hours}h left`;
    if (minutes > 0) return `${minutes}m left`;
    return "Less than a minute left";
  }

  // live expiry — re-check every 30s so poll flips to results when time hits 0
  const [liveExpired, setLiveExpired] = useState(isExpired);
  useEffect(() => {
    setLiveExpired(isExpired);
    if (isExpired || !poll?.expiresAt) return;
    const id = setInterval(() => {
      const now = new Date();
      const exp = new Date(poll.expiresAt);
      if (now >= exp) { setLiveExpired(true); clearInterval(id); }
    }, 30000);
    return () => clearInterval(id);
  }, [isExpired, poll?.expiresAt]);

  const showResults = !!userVotedOptionId || liveExpired

  return (
    <div className="mt-3 space-y-2 border border-border rounded-[12px] p-3 bg-card hover:border-border/80 transition-colors">
      {results.map((option) => (
        <div key={option._id} className="relative">
          {showResults ? (
            <div className="space-y-1">
              <div className="flex justify-between text-sm relative z-10 px-2">
                <span className={cn(
                  "flex items-center gap-1 truncate pr-4",
                  option._id === userVotedOptionId ? 'font-bold text-primary' : 'text-foreground'
                )}>
                  {option._id === userVotedOptionId && <Check className="w-3 h-3 flex-shrink-0" />}
                  {option.text}
                </span>
                <span className="text-xs font-medium text-muted-foreground">{option.percentage}%</span>
              </div>
              <div className="h-8 bg-accent/30 rounded-md overflow-hidden relative">
                <div 
                  className={cn(
                    "h-full rounded-r-sm transition-all duration-1000 ease-out",
                    option._id === userVotedOptionId ? 'bg-primary/20' : 'bg-muted-foreground/10'
                  )}
                  style={{ width: `${option.percentage}%` }}
                />
              </div>
            </div>
          ) : (
            <button 
              onClick={() => handleVote(option._id)} 
              disabled={isVoting} 
              className="w-full text-left px-4 py-2.5 rounded-md border border-border hover:border-primary hover:bg-primary/5 transition-all text-sm font-medium disabled:opacity-50"
            > 
              {option.text} 
            </button>
          )}
        </div>
      ))}
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-[10px] text-muted-foreground">
          {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · {getTimeUntilExpiry()}
        </p>
      </div>
    </div>
  )
}
