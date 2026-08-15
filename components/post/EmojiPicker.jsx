"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { Smile, Clock, Heart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Lazy load the heavy emoji picker component
const Picker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[350px] text-muted-foreground">
      Loading...
    </div>
  ),
});

// Storage keys
const RECENT_EMOJIS_KEY = "campuszen_recent_emojis";
const FAVORITE_EMOJIS_KEY = "campuszen_favorite_emojis";
const MAX_RECENT = 20;
const MAX_FAVORITES = 30;

export default function EmojiPicker({ onSelect, trigger }) {
  const [open, setOpen] = useState(false);
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [favoriteEmojis, setFavoriteEmojis] = useState([]);

  // Load recent and favorite emojis from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRecent = localStorage.getItem(RECENT_EMOJIS_KEY);
      const savedFavorites = localStorage.getItem(FAVORITE_EMOJIS_KEY);
      
      if (savedRecent) {
        try {
          setRecentEmojis(JSON.parse(savedRecent));
        } catch (e) {
          console.error("Error parsing recent emojis:", e);
        }
      }
      
      if (savedFavorites) {
        try {
          setFavoriteEmojis(JSON.parse(savedFavorites));
        } catch (e) {
          console.error("Error parsing favorite emojis:", e);
        }
      }
    }
  }, []);

  // Save to localStorage
  const saveToStorage = useCallback((key, data) => {
    if (typeof window !== "undefined") {
      localStorage.setItem(key, JSON.stringify(data));
    }
  }, []);

  // Add emoji to recent
  const addToRecent = useCallback((emoji) => {
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      const updated = [emoji, ...filtered].slice(0, MAX_RECENT);
      saveToStorage(RECENT_EMOJIS_KEY, updated);
      return updated;
    });
  }, [saveToStorage]);

  // Toggle favorite
  const toggleFavorite = useCallback((emoji) => {
    setFavoriteEmojis(prev => {
      const exists = prev.includes(emoji);
      let updated;
      if (exists) {
        updated = prev.filter(e => e !== emoji);
      } else {
        updated = [emoji, ...prev].slice(0, MAX_FAVORITES);
      }
      saveToStorage(FAVORITE_EMOJIS_KEY, updated);
      return updated;
    });
  }, [saveToStorage]);

  // Handle emoji selection
  const handleEmojiClick = useCallback((emojiData) => {
    const emoji = emojiData.emoji;
    onSelect(emoji);
    addToRecent(emoji);
    setOpen(false);
  }, [onSelect, addToRecent]);

  // Handle native emoji picker
  const handleNativeEmoji = useCallback(() => {
    const input = document.createElement("input");
    input.type = "text";
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.focus();
    
    // For mobile devices that support emoji keyboard
    input.addEventListener("input", (e) => {
      const emoji = e.data;
      if (emoji && /\p{Emoji}/u.test(emoji)) {
        onSelect(emoji);
        addToRecent(emoji);
        setOpen(false);
      }
      document.body.removeChild(input);
    });

    // Cleanup if no emoji selected
    setTimeout(() => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
    }, 5000);
  }, [onSelect, addToRecent]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="gap-2">
            <Smile className="w-5 h-5" />
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden bg-background border-border">
        <DialogHeader className="p-4 border-b border-border">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <Smile className="w-5 h-5" />
            Add Emoji
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="picker" className="w-full">
          <TabsList className="w-full justify-start px-4 pt-2">
            <TabsTrigger value="picker" className="gap-2">
              <Smile className="w-4 h-4" />
              Picker
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Clock className="w-4 h-4" />
              Recent
            </TabsTrigger>
            <TabsTrigger value="favorites" className="gap-2">
              <Heart className="w-4 h-4" />
              Favorites
            </TabsTrigger>
          </TabsList>

          {/* Emoji Picker */}
          <TabsContent value="picker" className="mt-0">
            <div className="p-2">
              <Picker
                onEmojiClick={handleEmojiClick}
                autoFocusSearch={false}
                searchPlaceholder="Search emojis..."
                width="100%"
                height={350}
                theme="dark"
                previewConfig={{
                  showPreview: false
                }}
                skinTonesDisabled
              />
            </div>
          </TabsContent>

          {/* Recent Emojis */}
          <TabsContent value="recent" className="mt-0 p-4">
            {recentEmojis.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No recent emojis</p>
                <p className="text-sm">Emojis you use will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-2">
                {recentEmojis.map((emoji, index) => (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => {
                        onSelect(emoji);
                        setOpen(false);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-accent rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(emoji);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-background border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Heart
                        className={`w-3 h-3 ${favoriteEmojis.includes(emoji) ? "fill-red-500 text-red-500" : ""}`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favorite Emojis */}
          <TabsContent value="favorites" className="mt-0 p-4">
            {favoriteEmojis.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                <Heart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No favorite emojis</p>
                <p className="text-sm">Click the heart on any emoji to add it here</p>
              </div>
            ) : (
              <div className="grid grid-cols-8 gap-2">
                {favoriteEmojis.map((emoji, index) => (
                  <div key={index} className="relative group">
                    <button
                      onClick={() => {
                        onSelect(emoji);
                        setOpen(false);
                      }}
                      className="w-10 h-10 flex items-center justify-center text-2xl hover:bg-accent rounded-lg transition-colors"
                    >
                      {emoji}
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleFavorite(emoji);
                      }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-background border rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Native Picker Button */}
        <div className="p-4 border-t border-border">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleNativeEmoji}
          >
            <Smile className="w-4 h-4 mr-2" />
            Use Native Emoji Keyboard
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
