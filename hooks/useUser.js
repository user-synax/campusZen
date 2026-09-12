"use client"

import { useState, useEffect, useCallback } from "react"

// Simple global state to share user data across all hook instances
let globalUser = null
let globalLoading = true
let globalError = null
const subscribers = new Set()

const notifySubscribers = () => { 
  subscribers.forEach(callback => callback({ 
    user: globalUser, 
    loading: globalLoading, 
    error: globalError 
  }))
}

export default function useUser() {
  const [state, setState] = useState({ 
    user: globalUser, 
    loading: globalLoading, 
    error: globalError 
  })

  const fetchUser = useCallback(async (showLoading = true) => {
    if (showLoading) {
      globalLoading = true
      notifySubscribers()
    }
    
    try {
      const res = await fetch("/api/users/me", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      })
      
      if (res.status === 401) {
        globalUser = null
        globalError = null
      } else if (!res.ok) {
        throw new Error("Failed to fetch user")
      } else {
        const data = await res.json()
        globalUser = data.user
        globalError = null
      }
    } catch (err) {
      globalError = err.message
      globalUser = null
    } finally {
      globalLoading = false
      notifySubscribers()
    }
    return globalUser
  }, [])

  useEffect(() => {
    const callback = (newState) => setState(newState)
    subscribers.add(callback)
    // Keep local state in sync with global cache immediately
    setState({ user: globalUser, loading: globalLoading, error: globalError })
    
    // Need to fetch if we have no user and no error (covers both
    // initial load where globalLoading===true and post-401 re-login
    // where globalLoading===false but globalUser is still null).
    // Only the first subscriber triggers the fetch to avoid duplicate
    // concurrent requests from Sidebar+RightPanel+MainLayout etc.
    const shouldFetch = globalUser === null && !globalError
    if (shouldFetch && subscribers.size === 1) {
      fetchUser(false)
    }

    // Only first mount sets up global keep-alive (avoid duplicate intervals)
    let isFirst = subscribers.size === 1
    if (isFirst && typeof window !== "undefined" && !window.__campusx_keepAliveSetup) {
      window.__campusx_keepAliveSetup = true
      let keepAliveInterval = null
      const schedule = () => {
        if (keepAliveInterval) clearInterval(keepAliveInterval)
        if (globalUser) {
          keepAliveInterval = setInterval(() => {
            if (document.visibilityState === "visible") fetchUser(false)
          }, 12 * 60 * 60 * 1000) // 12h
        }
      }
      const visibilityHandler = () => {
        if (document.visibilityState === "visible" && globalUser) {
          fetchUser(false)
          schedule()
        }
      }
      document.addEventListener("visibilitychange", visibilityHandler)
      const onSub = (s) => {
        if (s.user && !keepAliveInterval) schedule()
        if (!s.user && keepAliveInterval) { clearInterval(keepAliveInterval); keepAliveInterval = null }
      }
      subscribers.add(onSub)
      if (globalUser) schedule()
      // Store for cleanup if needed (not strictly necessary for SPA)
      window.__campusx_keepAliveCleanup = () => {
        if (keepAliveInterval) clearInterval(keepAliveInterval)
        document.removeEventListener("visibilitychange", visibilityHandler)
        subscribers.delete(onSub)
        window.__campusx_keepAliveSetup = false
      }
    }

    return () => {
      subscribers.delete(callback)
    }
  }, [fetchUser])

  const refetch = useCallback(async () => {
    return await fetchUser(true)
  }, [fetchUser])

  // Explicit reset for logout / expiry: clears global cache so the next
  // mount will refetch even if the previous fetch ended in 401.
  const reset = useCallback(() => {
    globalUser = null
    globalError = null
    globalLoading = false
    notifySubscribers()
  }, [])

  return { 
    user: state.user, 
    loading: state.loading, 
    error: state.error, 
    refetch,
    reset,
  }
}
