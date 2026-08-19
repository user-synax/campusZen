"use client"

import { useState, useEffect } from 'react'
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  Loader2,
  Package,
  Clock,
  Coins,
  Tag,
  Rocket
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import ShopItemIcon from "@/components/shared/ShopItemIcon"

const CATEGORIES = [
  { value: 'avatar_frame', label: 'Avatar Frame' },
  { value: 'username_color', label: 'Username Color' },
  { value: 'profile_banner', label: 'Profile Banner' },
  { value: 'post_badge', label: 'Post Badge' },
  { value: 'chat_bubble', label: 'Chat Bubble' },
  { value: 'bio_theme', label: 'Bio Theme' },
  { value: 'special_badge', label: 'Special Badge' },
  { value: 'profile_theme', label: 'Profile Theme' },
  { value: 'effect', label: 'Effect' },
  { value: 'entry_effect', label: 'Entry Effect' },
  { value: 'profile_bg', label: 'Profile BG Effect' },
  { value: 'profile_layout', label: 'Profile Layout' }
]

const RARITIES = [
  { value: 'common', label: 'Common', className: 'text-gray-400 border-gray-400/20 bg-gray-400/10' },
  { value: 'uncommon', label: 'Uncommon', className: 'text-green-400 border-green-400/20 bg-green-400/10' },
  { value: 'rare', label: 'Rare', className: 'text-blue-400 border-blue-400/20 bg-blue-400/10' },
  { value: 'epic', label: 'Epic', className: 'text-purple-400 border-purple-400/20 bg-purple-400/10' },
  { value: 'legendary', label: 'Legendary', className: 'text-amber-400 border-amber-400/20 bg-amber-400/10' },
  { value: 'mythic', label: 'Mythic', className: 'text-red-400 border-red-400/20 bg-red-400/10' }
]

const AVAILABLE_ICONS = [
  'Crown', 'Star', 'Shield', 'Zap', 'Flame', 'Gem', 'Sparkles', 
  'Palette', 'Frame', 'CheckCircle', 'Rocket', 'Heart', 'Award', 
  'Trophy', 'Diamond', 'Flashlight', 'Sun', 'Moon', 'Ghost', 'Alien'
]

export default function AdminShopManager() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    category: 'avatar_frame',
    price: 0,
    rarity: 'common',
    visual: {},
    sortOrder: 0,
    isLimited: false,
    limitedUntil: '',
    maxStock: ''
  })

  const getPrice = (category, rarity) => {
    const basePrices = {
        avatar_frame: 50,
        post_badge: 75,
        bio_theme: 80,
        username_color: 100,
        chat_bubble: 120,
        profile_banner: 150,
        profile_theme: 180,
        special_badge: 200,
        effect: 250,
        entry_effect: 300
    };

    const rarityMultipliers = {
        common: 1,
        uncommon: 1.5,
        rare: 2.5,
        epic: 5,
        legendary: 10,
        mythic: 20
    };

    const basePrice = basePrices[category] || 0;
    const multiplier = rarityMultipliers[rarity] || 1;

    return basePrice * multiplier;
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shop');
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error('Failed to fetch shop items:', error);
      toast.error('Failed to load shop items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dialogOpen && !editingItem) {
      const newPrice = getPrice(formData.category, formData.rarity);
      setFormData(prev => ({ ...prev, price: newPrice }));
    }
  }, [formData.category, formData.rarity, dialogOpen, editingItem]);

  const handleOpenDialog = (item = null) => {
    if (item) {
      setEditingItem(item)
      setFormData({
        name: item.name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        price: item.price,
        rarity: item.rarity,
        visual: item.visual || {},
        sortOrder: item.sortOrder || 0,
        isLimited: item.isLimited || false,
        limitedUntil: item.limitedUntil ? new Date(item.limitedUntil).toISOString().split('T')[0] : '',
        maxStock: item.maxStock || ''
      })
    } else {
      setEditingItem(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        category: 'avatar_frame',
        price: 0,
        rarity: 'common',
        visual: { icon: 'Package', color: '#94a3b8', className: '', imageUrl: '' },
        sortOrder: 0,
        isLimited: false,
        limitedUntil: '',
        maxStock: ''
      })
    }
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      const method = editingItem ? 'PATCH' : 'POST'
      const url = editingItem ? `/api/admin/shop/${editingItem._id}` : '/api/admin/shop'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(`Item ${editingItem ? 'updated' : 'added'} successfully`)
        setDialogOpen(false)
        fetchItems()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Action failed')
      }
    } catch (error) {
      console.error('Shop action failed:', error)
      toast.error('Network error')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (item) => {
    try {
      const res = await fetch(`/api/admin/shop/${item._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !item.isActive })
      })

      if (res.ok) {
        toast.success(`Item ${item.isActive ? 'disabled' : 'enabled'}`)
        fetchItems()
      }
    } catch (error) {
      console.error('Toggle active failed:', error)
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="p-8 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          Shop Management ({items.length})
        </h2>
        <Button size="sm" onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" /> Add Item
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(item => (
          <div 
            key={item._id} 
            className={`shop-item-card rounded-xl p-3 flex gap-3 ${item.rarity} ${!item.isActive ? 'opacity-50 grayscale' : ''}`}
          >
            <div className="shrink-0">
              <ShopItemIcon 
                iconName={item.visual?.icon} 
                rarity={item.rarity} 
                visual={item.visual}
                className="w-14 h-14"
              />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-bold truncate">{item.name}</p>
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-tighter ${RARITIES.find(r => r.value === item.rarity)?.className}`}>
                  {item.rarity}
                </span>
                {item.isLimited && (
                  <span className="text-[9px] text-amber-400 font-black uppercase flex items-center gap-0.5">
                    <Clock className="w-2.5 h-2.5" /> Limited
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase font-bold tracking-tight flex items-center gap-1">
                {item.category.replace('_', ' ')} · <Coins className="w-2.5 h-2.5" /> {item.price} VP
              </p>
              <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                <span className="font-bold text-foreground">{item.soldCount || 0} sold</span>
                {item.maxStock && (
                   <span className="opacity-70">/ {item.maxStock} max</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-accent" onClick={() => handleOpenDialog(item)}>
                <Pencil className="w-3.5 h-3.5" />
              </Button>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-accent" onClick={() => handleToggleActive(item)}>
                {item.isActive ? <EyeOff className="w-3.5 h-3.5 text-muted-foreground" /> : <Eye className="w-3.5 h-3.5 text-blue-400" />}
              </Button>
            </div>
          </div>
        ))}
      </div>

      {/* Item Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingItem ? <Pencil className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {editingItem ? 'Edit Shop Item' : 'Add New Shop Item'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Name</label>
                <Input 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Neon Frame"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Slug</label>
                <Input 
                  value={formData.slug} 
                  onChange={e => setFormData({...formData, slug: e.target.value})}
                  placeholder="neon-frame"
                  disabled={!!editingItem}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Description</label>
              <Textarea 
                value={formData.description} 
                onChange={e => setFormData({...formData, description: e.target.value.slice(0, 100)})}
                placeholder="Item description..."
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Category</label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  disabled={!!editingItem}
                  className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Rarity</label>
                <select 
                  value={formData.rarity} 
                  onChange={e => setFormData({...formData, rarity: e.target.value})}
                  className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                >
                  {RARITIES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Price (VP)</label>
                <Input 
                  type="number"
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: parseInt(e.target.value)})}
                  min={0}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Sort Order</label>
                <Input 
                  type="number"
                  value={formData.sortOrder} 
                  onChange={e => setFormData({...formData, sortOrder: parseInt(e.target.value)})}
                  min={0}
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
               <input 
                type="checkbox" 
                id="isLimited"
                checked={formData.isLimited}
                onChange={e => setFormData({...formData, isLimited: e.target.checked})}
                className="w-4 h-4 rounded border-border bg-background text-primary focus:ring-primary"
               />
               <label htmlFor="isLimited" className="text-xs font-bold uppercase tracking-wider cursor-pointer">Limited Edition</label>
            </div>

            {formData.isLimited && (
               <div className="grid grid-cols-2 gap-3 p-3 bg-accent/20 rounded-lg border border-border/30">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Until Date</label>
                    <Input 
                      type="date"
                      value={formData.limitedUntil} 
                      onChange={e => setFormData({...formData, limitedUntil: e.target.value})}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Max Stock</label>
                    <Input 
                      type="number"
                      value={formData.maxStock} 
                      onChange={e => setFormData({...formData, maxStock: parseInt(e.target.value) || 0})}
                      placeholder="Unlimited"
                    />
                  </div>
               </div>
            )}

            <div className="p-3 bg-accent/10 rounded-lg border border-border/30 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                <Rocket className="w-3 h-3" /> Visual Style
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Icon</label>
                  <select 
                    value={formData.visual?.icon || 'Package'} 
                    onChange={e => setFormData({...formData, visual: { ...formData.visual, icon: e.target.value }})}
                    className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                  >
                    {AVAILABLE_ICONS.map(icon => <option key={icon} value={icon}>{icon}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Color (Hex)</label>
                  <div className="flex gap-2">
                    <Input 
                      value={formData.visual?.color || ''} 
                      onChange={e => setFormData({...formData, visual: { ...formData.visual, color: e.target.value }})}
                      placeholder="#ff0000"
                      className="flex-1"
                    />
                    <div 
                      className="w-10 h-10 rounded border border-border shrink-0" 
                      style={{ backgroundColor: formData.visual?.color || '#94a3b8' }}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">CSS Class (Optional)</label>
                <Input 
                  value={formData.visual?.className || ''} 
                  onChange={e => setFormData({...formData, visual: { ...formData.visual, className: e.target.value }})}
                  placeholder="e.g. avatar-frame-rainbow"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Image URL (Optional)</label>
                <Input 
                  value={formData.visual?.imageUrl || ''} 
                  onChange={e => setFormData({...formData, visual: { ...formData.visual, imageUrl: e.target.value }})}
                  placeholder="https://cdn.example.com/banner.png"
                />
                <p className="text-[10px] text-muted-foreground/70 ml-1">Used for image-based items like Profile Banner. Leave empty for CSS-only items.</p>
              </div>

              {formData.category === 'avatar_frame' && (
                <div className="space-y-3 pt-1 border-t border-border/30">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Frame Style</label>
                    <select
                      value={formData.visual?.frameStyle || ''}
                      onChange={e => setFormData({ ...formData, visual: { ...formData.visual, frameStyle: e.target.value || undefined } })}
                      className="w-full bg-input border border-border rounded-md h-10 px-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                    >
                      <option value="">— None (use Color / Overlay Asset below) —</option>
                      <option value="solid">Solid (static color ring)</option>
                      <option value="gradient">Gradient (static ring)</option>
                      <option value="gradient-rotate">Gradient + Rotate (slow spin)</option>
                    </select>
                    <p className="text-[10px] text-muted-foreground/70 ml-1 leading-relaxed">
                      Tier 1/2/3 render technique. Solid uses the Color field above; Gradient / Gradient+Rotate use the two color stops below. No glow or blur on any tier.
                    </p>
                  </div>

                  {formData.visual?.frameStyle === 'gradient' || formData.visual?.frameStyle === 'gradient-rotate' ? (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Gradient Color 1</label>
                        <Input
                          value={formData.visual?.gradientColors?.[0] || ''}
                          onChange={e => {
                            const g = [...(formData.visual?.gradientColors || [])];
                            g[0] = e.target.value;
                            setFormData({ ...formData, visual: { ...formData.visual, gradientColors: g } });
                          }}
                          placeholder="#ff6b6b"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Gradient Color 2</label>
                        <Input
                          value={formData.visual?.gradientColors?.[1] || ''}
                          onChange={e => {
                            const g = [...(formData.visual?.gradientColors || [])];
                            g[1] = e.target.value;
                            setFormData({ ...formData, visual: { ...formData.visual, gradientColors: g } });
                          }}
                          placeholder="#4ecdc4"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground ml-1">Frame Overlay Asset URL (Optional)</label>
                  <Input 
                    value={formData.visual?.frameAssetUrl || ''} 
                    onChange={e => setFormData({...formData, visual: { ...formData.visual, frameAssetUrl: e.target.value }})}
                    placeholder="https://utfs.io/f/your-animated-frame.webm"
                  />
                  <p className="text-[10px] text-muted-foreground/70 ml-1 leading-relaxed">
                    Upload a transparent-center GIF or WebM for animated frames (Discord-style overlay), or use the Color field above for a simple CSS glow frame.
                    Square aspect ratio recommended; keep looping files ≤ 2MB so profile pages stay fast. GIFs loop natively; WebM/MP4 need a video-capable host (self-host via UploadThing/Appwrite).
                  </p>
                </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button className="flex-1" onClick={handleSubmit} disabled={submitting || !formData.name || !formData.slug}>
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingItem ? 'Save Changes' : 'Add Item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
