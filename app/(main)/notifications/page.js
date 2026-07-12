import { Suspense } from 'react'
import NotificationsPage from './NotificationsPage'
import NotificationsLoading from './loading'

export const metadata = {
  title: 'Notifications | CampusZen',
  description: 'View and manage your notifications on campusZen',
}

export default function Page() {
  return (
    <Suspense fallback={<NotificationsLoading />}>
      <NotificationsPage />
    </Suspense>
  )
}
