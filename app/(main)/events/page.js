"use client"

import { useState, useEffect } from "react"
import { Plus, Search, Calendar, Filter } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import EventCard from "@/components/events/EventCard"
import EmptyState from "@/components/shared/EmptyState"
import useUser from "@/hooks/useUser"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useDebounce } from "@/hooks/useDebounce"

export default function EventsPage() {
  const { user: currentUser } = useUser()
  const [events, setEvents] = useState([])
  const [filter, setFilter] = useState('upcoming')
  const [college, setCollege] = useState('')
  const debouncedCollege = useDebounce(college, 400)
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(false)
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  
  // Create Event Form State
  const [newForm, setNewForm] = useState({
    title: '',
    description: '',
    college: '',
    location: '',
    eventDate: '',
    capacity: 0,
    tags: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (currentUser) {
      setNewForm(prev => ({ ...prev, college: currentUser.college || '' }))
    }
  }, [currentUser])

  useEffect(() => {
    fetchEvents()
  }, [filter, debouncedCollege, page])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/events?filter=${filter}&college=${encodeURIComponent(debouncedCollege)}&page=${page}&limit=10`)
      const data = await res.json()
      
      if (res.ok) {
        if (page === 1) {
          setEvents(data.events)
        } else {
          setEvents(prev => [...prev, ...data.events])
        }
        setHasMore(data.hasMore)
      }
    } catch (error) {
      console.error("Failed to fetch events:", error)
      toast.error("Failed to load events")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const eventTime = new Date(newForm.eventDate).getTime()
    const minTime = Date.now() + 3600000 // 1 hour from now
    
    if (eventTime < minTime) {
      toast.error("Event must be scheduled at least 1 hour in advance")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newForm,
          tags: newForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        }),
      })
      
      const data = await res.json()
      
      if (res.ok) {
        setEvents(prev => [data, ...prev])
        setCreateOpen(false)
        setNewForm({
          title: '',
          description: '',
          college: currentUser?.college || '',
          location: '',
          eventDate: '',
          capacity: 0,
          tags: ''
        })
        toast.success("Event created successfully!")
      } else {
        throw new Error(data.message || "Failed to create event")
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRsvpChange = (eventId, isRsvped, newCount) => {
    setEvents(prev => prev.map(e => 
      e._id === eventId ? { ...e, rsvpCount: newCount } : e
    ))
  }

  const handleDeleteEvent = (eventId) => {
    setEvents(prev => prev.filter(e => e._id !== eventId))
  }

  return (
    <div className="flex-1 max-w-2xl border-r border-border min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background/80 backdrop-blur border-b p-4 z-20 flex justify-between items-center">
        <h1 className="text-xl font-bold">Events</h1>
        
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="rounded-full px-4 shadow-sm">
              <Plus className="w-4 h-4 mr-1.5" /> 
              Create Event
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Campus Event</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input 
                  id="title" 
                  placeholder="e.g. Annual Tech Hackathon" 
                  required 
                  value={newForm.title}
                  onChange={e => setNewForm(prev => ({ ...prev, title: e.target.value }))}
                  maxLength={100}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  placeholder="What is this event about?" 
                  rows={3}
                  value={newForm.description}
                  onChange={e => setNewForm(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={1000}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="college">College</Label>
                  <Input 
                    id="college" 
                    placeholder="Your College" 
                    required 
                    value={newForm.college}
                    onChange={e => setNewForm(prev => ({ ...prev, college: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input 
                    id="location" 
                    placeholder="e.g. Auditorium Hall" 
                    required 
                    value={newForm.location}
                    onChange={e => setNewForm(prev => ({ ...prev, location: e.target.value }))}
                    maxLength={200}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="eventDate">Date & Time</Label>
                  <Input 
                    id="eventDate" 
                    type="datetime-local" 
                    required 
                    value={newForm.eventDate}
                    onChange={e => setNewForm(prev => ({ ...prev, eventDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity (0 = unlimited)</Label>
                  <Input 
                    id="capacity" 
                    type="number" 
                    min={0}
                    value={newForm.capacity}
                    onChange={e => setNewForm(prev => ({ ...prev, capacity: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Input 
                  id="tags" 
                  placeholder="hackathon, tech, competition" 
                  value={newForm.tags}
                  onChange={e => setNewForm(prev => ({ ...prev, tags: e.target.value }))}
                />
                <p className="text-[10px] text-muted-foreground">Max 5 tags, 30 chars each</p>
              </div>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Creating..." : "Post Event"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters row */}
      <div className="p-4 flex gap-3 flex-wrap border-b border-border bg-accent/5 sticky top-[65px] z-10">
        <div className="flex bg-background border border-border rounded-lg p-1">
          <button
            onClick={() => { setFilter('upcoming'); setPage(1); }}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
              filter === 'upcoming' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Upcoming
          </button>
          <button
            onClick={() => { setFilter('past'); setPage(1); }}
            className={cn(
              "px-4 py-1.5 text-xs font-semibold rounded-md transition-all",
              filter === 'past' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Past
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input 
            placeholder="Search by college..." 
            value={college} 
            onChange={(e) => { setCollege(e.target.value); setPage(1); }} 
            className="pl-8 h-9 text-xs bg-background" 
          />
        </div>
      </div>

      {/* Events area */}
      <div className="p-4 space-y-4">
        {loading && page === 1 ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-48 bg-accent/20 rounded-xl animate-pulse" />
          ))
        ) : events.length === 0 ? (
          <div className="py-20">
            <EmptyState
              icon={Calendar}
              title={filter === 'upcoming' ? "No upcoming events" : "No past events"}
              description={college ? `No events found for "${college}"` : "Be the first to host an event on CampusZen!"}
            />
          </div>
        ) : (
          <>
            <div className="grid gap-4">
              {events.map(event => (
                <EventCard 
                  key={event._id} 
                  event={event} 
                  currentUserId={currentUser?._id}
                  onRsvpChange={handleRsvpChange}
                  onDelete={handleDeleteEvent}
                />
              ))}
            </div>
            
            {hasMore && (
              <div className="pt-4 flex justify-center">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setPage(prev => prev + 1)}
                  disabled={loading}
                  className="text-muted-foreground"
                >
                  {loading ? "Loading..." : "Show more events"}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
