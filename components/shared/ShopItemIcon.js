"use client"

import * as Icons from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Renders a shop item icon with premium effects based on rarity.
 * @param {string} iconName - The name of the Lucide icon (e.g., 'Crown', 'Star')
 * @param {string} rarity - common | uncommon | rare | epic | legendary | mythic
 * @param {string} className - Additional CSS classes
 * @param {object} visual - Visual metadata (color, className, etc.)
 */
export default function ShopItemIcon({ iconName, rarity, className, visual = {} }) {
  // Fallback icon if not specified or not found
  const IconComponent = Icons[iconName] || Icons.Package

  const getRarityClass = () => {
    switch (rarity) {
      case 'mythic': return 'rarity-mythic'
      case 'legendary': return 'rarity-legendary'
      case 'epic': return 'rarity-epic'
      default: return ''
    }
  }

  const getIconColor = () => {
    if (visual.color) return visual.color
    switch (rarity) {
      case 'mythic': return '#ff0000'
      case 'legendary': return '#f59e0b'
      case 'epic': return '#a855f7'
      case 'rare': return '#3b82f6'
      case 'uncommon': return '#10b981'
      default: return '#94a3b8'
    }
  }

    return (
      <div className={cn(
        "shop-item-icon-container relative overflow-hidden",
        rarity,
        className
      )}>
      {/* Background Glow for high rarities */}
      {(rarity === 'mythic' || rarity === 'legendary') && (
        <div 
          className="absolute inset-0 blur-2xl opacity-20 animate-pulse"
          style={{ backgroundColor: getIconColor() }}
        />
      )}

      <IconComponent 
        className={cn(
          "w-8 h-8 relative z-10 transition-transform duration-500 hover:scale-110",
          getRarityClass(),
          visual.className
        )}
        style={{ 
          color: (rarity === 'mythic' || rarity === 'legendary') ? undefined : getIconColor(),
          strokeWidth: (rarity === 'mythic' || rarity === 'legendary') ? 2.5 : 2
        }}
      />
    </div>
  )
}
