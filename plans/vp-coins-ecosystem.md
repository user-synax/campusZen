# VP (Viper Coins) Ecosystem — Implementation Plan

> Server-authoritative coin economy. Rebuilds the (currently non-existent) "Campus Coins" into **VP (Viper Coins)**, built correctly from day one: idempotent earns, atomic balance writes, daily caps, real-time debounced notifications, paginated history.

## Design Decisions
- **Reward direction**: actor earns (liker/commenter/follower/sharer), NOT the receiver — prevents engagement farming. (Per spec recommendation.)
- **No real-time polling gap**: reuse the existing `createNotification` Pusher + web-push path. Coin-earn notifications deliver instantly, not via 60s poll.
- **Balance = cached field on User** (`vp`), updated atomically with `$inc`. Ledger (`WalletTransaction`) is audit-only, never summed for live balance.
- **Idempotency**: unique compound index `(userId, reason, sourceId)`. Duplicate inserts are rejected before any `$inc` happens.
- **Atomicity pattern** (no replica-set transaction dependency):
  - Earn: insert ledger (unique) FIRST → on success `$inc` User.vp. Duplicate insert aborts, so no double-count.
  - Spend: conditional `$inc: { vp: -amount, $filter: { vp: { $gte: amount } } }` FIRST → if matched, insert spend ledger.
- **Daily caps**: Redis counter per `(userId, reason, date)` tracking *cumulative VP* (not action count), mirroring `lib/gamification.js` `DAILY_XP_LIMITS` but value-based.

---

## 1. New Files

### `lib/currency.js` — centralized currency identity
```js
export const CURRENCY = {
  name: "Viper Coins",
  shortName: "VP",
  symbol: "VP",
  iconPath: "/icons/viper-coin.svg", // replace with provided icons8 PNG when available
};
```
Single source of truth for name/symbol/icon. Every UI label imports from here — future renames need no grep.

### `models/WalletTransaction.js` — CoinLedger
```js
{
  userId:   ObjectId ref User,        // indexed
  amount:   Number,                   // signed: +earn / -spend
  type:     enum ['earn','spend'],
  reason:   enum ['post','like','comment','follow','resource_share',
                  'resource_upload','daily_login','event_rsvp',
                  'purchase','admin_adjust','gift','refund'],
  sourceId: Mixed,                    // postId/commentId/targetUserId/date-string/uuid
  balanceAfter: Number,               // snapshot for audit
  createdAt
}
indexes:
  { userId: 1, createdAt: -1 }        // history query + pagination
  { userId: 1, reason: 1 }            // reason rollups
  { userId: 1, reason: 1, sourceId: 1 } unique, sparse  // IDEMPOTENCY
  { createdAt: 1 } TTL 365d           // ledger pruning (audit retention)
```

### `lib/coins.js` — core engine
Exports:
- `awardVP(userId, reason, sourceId, { ownerId, bypassCap })` → idempotent earn.
- `spendVP(userId, reason, sourceId, amount)` → atomic conditional spend.
- `getBalance(userId)` → returns cached `User.vp`.
- `getWalletHistory(userId, { limit, cursor })` → paginated ledger (cursor = createdAt of last item).
- `awardDailyLoginVP(userId)` → idempotent via `sourceId = YYYY-MM-DD`, updates `lastLoginRewardAt`.
- `queueVPNotification(userId, amount, reason)` → Redis debounce buffer.
- `flushVPNotifications(userId)` → called on buffer window expiry / cron.
- Helpers: `canEarnToday(userId, reason, amount)`, `incrEarnedToday(...)`.

Daily-cap + follow-loop logic:
- `vp_daily_cap:{userId}:{reason}:{date}` — cumulative VP this reason/day (Redis `incrby` + 24h `expire`).
- `vp_follow_window:{userId}:{targetUserId}` — TTL 7d; present ⇒ skip re-award (stops follow/unfollow farming).

### `app/api/wallet/route.js` — `GET` balance (cached field)
### `app/api/wallet/history/route.js` — `GET` paginated ledger (`?limit=20&cursor=`)
### `app/api/wallet/spend/route.js` — `POST { reason, sourceId }` only; amount resolved server-side from `VP_PRICES`. Rejects any client-supplied amount.
### `app/api/internal/flush-vp-notifications/route.js` — cron/final-flush for debounce window (documented follow-up; safe to omit initially).

---

## 2. Model Changes — `models/User.js`
- Add `vp: { type: Number, default: 0 }`.
- Add `lastLoginRewardAt: { type: Date, default: null }`.
- Add index `{ vp: -1 }` (leaderboard / analytics).

## 3. Config — extend `lib/ranks.js` (alongside `XP_AWARDS`)
```js
export const VP_AWARDS = {           // PLACEHOLDERS — fill manually
  post: 0, like: 0, comment: 0, follow: 0,
  resource_share: 0, resource_upload: 0,
  daily_login: 0, event_rsvp: 0,
};
export const DAILY_VP_LIMITS = {     // PLACEHOLDERS — fill manually (0 = no cap)
  like: 0, comment: 0, follow: 0, post: 0, resource_share: 0,
};
export const VP_PRICES = {           // spend side, server-only
  // shop_item_id: amount
};
```

## 4. Notification Integration
- Add `'vp_earned'` to `Notification` enum; add text `"You earned X VP from recent activity"` + icon + URL (`/wallet`) in `lib/notifications.js`.
- **Debounce**: `queueVPNotification` buffers into `vp_notify:{userId}` (total + lastReason, 60s TTL). First earn in window → schedule; subsequent earns within window accumulate silently; window end → single `vp_earned` notification (reuses `dedupeKey` so it refreshes to top). Real-time via existing Pusher.
- Honors self-notification rule (system-type, always delivered to self).

## 5. Earning Trigger Wiring (after core action succeeds)
| Action | Route | Call |
|---|---|---|
| Create post | `posts/create/route.js` (after L126) | `awardVP(uid,'post',post._id)` |
| Give like | `posts/like/route.js` (like branch L85) | `awardVP(uid,'like',postId,{ownerId:post.author})` — self-guard |
| Add comment | `posts/[postId]/comments/route.js` (after L146) | `awardVP(uid,'comment',comment._id,{ownerId:post.author})` — self-guard |
| Follow | `follow/route.js` (follow branch L67) | `awardVP(uid,'follow',targetUserId)` + follow-loop TTL guard |
| Share resource | `posts/[postId]/share/route.js` (after L16) | `awardVP(uid,'resource_share',postId)` |
| Upload resource | `resources/route.js` (after L106) | `awardVP(uid,'resource_upload',resource._id)` |
| Daily login | `auth/login/route.js` (after L188) | `awardDailyLoginVP(uid)` |
| Event RSVP | `events/[eventId]/rsvp/route.js` (rsvp branch) | `awardVP(uid,'event_rsvp',eventId)` |

All calls `.catch(console.error)` (never break main action). XP awards stay as-is.

## 6. Rename Campus Coins → VP (Viper Coins)
- Create `/public/icons/viper-coin.svg` (placeholder; swap for provided icons8 PNG — update `CURRENCY.iconPath`).
- Grep + replace:
  - `app/(public)/terms/page.js` — "Campus Coins" → "Viper Coins (VP)".
  - `app/(public)/privacy/page.js` — "campus coin rewards" → "Viper Coins rewards".
  - `components/analytics/tabs/*` — "Coins" labels → "VP"; keys can stay (zeros).
  - `components/admin/AdminShopManager.js`, `AdminActionDialog.js`, `AdminUsersTable.js` — "Coins" → "VP", "Award Coins" → "Award VP".
  - `app/(main)/settings/page.js` — "coins" → "VP".
- All new UI reads `CURRENCY.shortName` / `CURRENCY.name`.

## 7. Admin Award (bypass cap)
- `award_coins` admin action → `awardVP(uid, 'admin_adjust', generatedUuid, { bypassCap: true })`. Wire into existing `/api/admin/users/[id]` handler.

## 8. Anti-Abuse Checklist (mapped to spec)
- ✅ Idempotency — unique `(userId, reason, sourceId)`.
- ✅ Rate limit — `DAILY_VP_LIMITS` via Redis cumulative cap (reuses `lib/redis.js`).
- ✅ Self-action guard — reuse existing checks; `ownerId` passed to `awardVP`.
- ✅ Follow/unfollow loop — 7d Redis TTL window on follow awards.
- ✅ Atomic writes — insert-ledger-then-$inc / conditional-$inc-then-insert.
- ✅ No client amounts — `wallet/spend` ignores request body amounts.

## 9. Performance
- Balance read → `User.vp` only.
- History → indexed cursor pagination, never full scan.
- Ledger TTL prunes old entries.

## Build Order
1. `lib/currency.js`, `models/WalletTransaction.js`, `models/User.js` fields+index.
2. `lib/ranks.js` config stubs.
3. `lib/coins.js` engine (award/spend/balance/history/notify).
4. `Notification` enum + text/icon/url.
5. Wire 8 trigger routes.
6. Wallet API routes (balance/history/spend) + admin award.
7. Rename pass (grep replace) + icon asset.
8. Verify: lint/typecheck, manual smoke of one earn path + idempotency retry.
