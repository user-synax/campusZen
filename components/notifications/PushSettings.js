"use client" 
 
import { useState, useEffect } from 'react' 
import { Bell, BellOff, X, CheckCircle, Smartphone, Laptop, Loader2, Volume2 } from 'lucide-react' 
import { Button } from '@/components/ui/button' 
import { Switch } from '@/components/ui/switch' 
import { usePushNotifications } from '@/hooks/usePushNotifications' 
import { formatRelativeTime } from '@/utils/formatters' 
import { toast } from 'sonner'
import { setNotificationSound, shouldPlaySound } from '@/lib/notificationSound' 
 
export default function PushSettings() { 
  const [devices, setDevices] = useState([]) 
  const [loadingDevices, setLoadingDevices] = useState(false) 
  const [testLoading, setTestLoading] = useState(false) 
  const [testSent, setTestSent] = useState(false) 
  const [soundEnabled, setSoundEnabled] = useState(() => shouldPlaySound()) 
 
  const { 
    isSupported, 
    permission, 
    isSubscribed, 
    isLoading, 
    subscribe, 
    unsubscribe 
  } = usePushNotifications() 
 
  // Fetch active devices on mount 
  useEffect(() => { 
    const fetchStatus = async () => { 
      try { 
        setLoadingDevices(true) 
        const res = await fetch('/api/push/status') 
        if (res.ok) { 
          const data = await res.json() 
          setDevices(data.subscriptions || []) 
        } 
      } catch (err) { 
        console.error('Failed to fetch push status:', err) 
      } finally { 
        setLoadingDevices(false) 
      } 
    } 
    fetchStatus() 
  }, [isSubscribed]) 
 
  const handleTest = async () => { 
    try { 
      setTestLoading(true) 
      const res = await fetch('/api/push/test', { method: 'POST' }) 
      if (res.ok) { 
        setTestSent(true) 
        toast.success("Test notification sent!") 
        setTimeout(() => setTestSent(false), 3000) 
      } else { 
        const data = await res.json() 
        toast.error(data.error || "Failed to send test notification") 
      } 
    } catch (err) { 
      toast.error("Network error") 
    } finally { 
      setTestLoading(false) 
    } 
  } 
 
  const handleRemoveDevice = async (device) => { 
    try { 
      const res = await fetch('/api/push/unsubscribe', { 
        method: 'DELETE', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ endpoint: device.endpoint }) 
      }) 
 
      if (res.ok) { 
        setDevices(prev => prev.filter(d => d.endpoint !== device.endpoint)) 
        toast.success(`Removed ${device.deviceName}`) 
        
        // If removed device is current device (based on UA/endpoint matching) 
        // we should call the local unsubscribe to sync state 
        if (typeof window !== 'undefined' && navigator.userAgent === device.userAgent) { 
          await unsubscribe() 
        } 
      } else { 
        toast.error("Failed to remove device") 
      } 
    } catch (err) { 
      toast.error("Network error") 
    } 
  } 
 
  return ( 
    <div className="space-y-4"> 
      <div> 
        <h3 className="font-semibold text-sm mb-1"> 
          Push Notifications 
        </h3> 
        <p className="text-xs text-muted-foreground"> 
          Receive notifications even when CampusX is closed 
        </p> 
      </div>

      {/* Notification Sound Toggle */}
      <div className="flex items-center justify-between p-3 bg-accent/30 rounded-lg border border-border">
        <div className="flex items-center gap-3">
          <Volume2 className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium">Notification Sound</p>
            <p className="text-xs text-muted-foreground">Play a sound for new notifications</p>
          </div>
        </div>
        <Switch 
          checked={soundEnabled} 
          onCheckedChange={(checked) => {
            setSoundEnabled(checked)
            setNotificationSound(checked)
          }}
        />
      </div> 
 
      {/* Not supported */} 
      {!isSupported && ( 
        <div className="p-3 bg-accent rounded-lg border border-border"> 
          <p className="text-xs text-muted-foreground flex items-center gap-2"> 
            <BellOff className="w-3.5 h-3.5" /> 
            Push notifications not supported in this browser. 
            Try Chrome or Firefox. 
          </p> 
        </div> 
      )} 
 
      {/* Permission denied */} 
      {isSupported && permission === 'denied' && ( 
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg"> 
          <p className="text-xs text-amber-300"> 
            Notifications are blocked. To enable: click the lock icon 
            (🔒) in the address bar → Notifications → Allow. 
          </p> 
        </div> 
      )} 
 
      {/* Current device toggle */} 
      {isSupported && permission !== 'denied' && ( 
        <div className="flex items-center justify-between p-3 
                        bg-accent/30 rounded-lg border border-border"> 
          <div className="flex items-center gap-3"> 
            <Bell className="w-4 h-4 text-muted-foreground" /> 
            <div> 
              <p className="text-sm font-medium">This Device</p> 
              <p className="text-xs text-muted-foreground"> 
                {isSubscribed ? 'Notifications enabled' : 'Notifications disabled'} 
              </p> 
            </div> 
          </div> 
          <Switch 
            checked={isSubscribed} 
            disabled={isLoading} 
            onCheckedChange={(checked) => { 
              if (checked) subscribe() 
              else unsubscribe() 
            }} 
          /> 
        </div> 
      )} 
 
      {/* Test button — only if subscribed */} 
      {isSubscribed && ( 
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleTest} 
          disabled={testLoading || testSent} 
          className="w-full" 
        > 
          {testLoading ? ( 
            <><Loader2 className="w-3.5 h-3.5 animate-spin mr-2" />Sending...</> 
          ) : testSent ? ( 
            <><CheckCircle className="w-3.5 h-3.5 mr-2 text-green-400" />Notification sent!</> 
          ) : ( 
            <><Bell className="w-3.5 h-3.5 mr-2" />Send Test Notification</> 
          )} 
        </Button> 
      )} 
 
      {/* All subscribed devices */} 
      {devices.length > 0 && ( 
        <div> 
          <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide"> 
            Active Devices ({devices.length}) 
          </p> 
          <div className="space-y-2"> 
            {devices.map(device => ( 
              <div key={device.endpoint} 
                className="flex items-center justify-between p-3 
                           rounded-lg border border-border bg-card/50"> 
                <div className="flex items-center gap-2.5"> 
                  <div className="w-7 h-7 rounded-lg bg-accent flex items-center justify-center"> 
                    {(() => {
                      const name = device.deviceName || 'Unknown Device'
                      return name.includes('Android') || name.includes('iOS')
                        ? <Smartphone className="w-4 h-4 text-muted-foreground" />
                        : <Laptop className="w-4 h-4 text-muted-foreground" />
                    })()} 
                  </div> 
                  <div> 
                    <p className="text-xs font-medium">{device.deviceName}</p> 
                    <p className="text-[10px] text-muted-foreground"> 
                      Last used {formatRelativeTime(device.lastUsedAt)} 
                    </p> 
                  </div> 
                </div> 
                <button 
                  onClick={() => handleRemoveDevice(device)} 
                  className="text-muted-foreground hover:text-destructive transition-colors" 
                  title="Remove this device" 
                > 
                  <X className="w-3.5 h-3.5" /> 
                </button> 
              </div> 
            ))} 
          </div> 
        </div> 
      )} 
    </div> 
  ) 
} 
