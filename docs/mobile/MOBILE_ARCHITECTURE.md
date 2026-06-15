# SmartCampus AI — Mobile Architecture

## Overview

The SmartCampus AI mobile ecosystem consists of three React Native applications sharing a common design system, API layer, and state management. Built with Expo SDK 51, the apps target iOS 15+ and Android 12+.

## Technology Stack

| Technology | Purpose |
|---|---|
| React Native 0.74 | Cross-platform mobile framework |
| Expo SDK 51 | Development toolchain and native modules |
| TypeScript 5.3 | Type safety |
| React Navigation 6 | Screen navigation (stack + bottom tabs) |
| Zustand 4 | Lightweight state management |
| TanStack Query 5 | Server state caching and synchronization |
| Axios | HTTP client with token refresh interceptor |
| Expo SecureStore | Encrypted credential storage |
| Expo LocalAuthentication | Biometric login (Face ID / Fingerprint) |

## Project Structure

```
mobile/
├── src/
│   ├── App.tsx                    # Entry point with initialization
│   ├── navigation/
│   │   └── AppNavigator.tsx       # Root navigator with tab setups
│   ├── screens/
│   │   ├── student/               # Student app screens
│   │   ├── parent/                # Parent portal screens
│   │   └── teacher/               # Teacher app screens
│   ├── components/
│   │   ├── shared/                # Reusable UI components
│   │   ├── student/               # Student-specific components
│   │   ├── parent/                # Parent-specific components
│   │   └── teacher/               # Teacher-specific components
│   ├── services/
│   │   ├── api.ts                 # Axios API client with auth interceptors
│   │   ├── notifications.ts      # FCM push notification service
│   │   └── offline.ts            # Offline mode with cache and sync queue
│   ├── store/
│   │   ├── authStore.ts          # Zustand auth state (persisted)
│   │   ├── appStore.ts           # Global app state
│   │   └── chatStore.ts          # AI chat message history
│   ├── theme/
│   │   └── colors.ts             # Design tokens (colors, spacing, typography)
│   ├── types/
│   │   └── index.ts              # TypeScript interfaces
│   └── constants/
│       └── index.ts              # App constants and configuration
```

## Architecture Decisions

### 1. Three Apps, One Codebase
All three apps (student, parent, teacher) share a single codebase with role-based navigation. The `AppNavigator` switches between tab configurations based on the authenticated user's role.

### 2. Zustand Over Redux
Zustand was chosen for its minimal boilerplate, TypeScript-first design, and built-in persistence middleware. Each store is independent and imported only where needed.

### 3. TanStack Query for Server State
All API data fetching uses TanStack Query for automatic caching, background refetch, stale-while-revalidate, and optimistic updates. This is critical for the offline-first architecture.

### 4. Offline-First with Sync Queue
The `offlineService` caches API responses in AsyncStorage and queues mutations when offline. On reconnection, queued actions are processed in order with retry logic.

### 5. Secure Token Handling
Auth tokens are stored in Expo SecureStore (Keychain on iOS, EncryptedSharedPreferences on Android). The Axios interceptor automatically refreshes expired tokens and retries the original request.

## Navigation Architecture

```
Root Stack
├── Auth (Login Screen)
└── Main (Role-based)
    ├── Student Tabs
    │   ├── Home → Dashboard
    │   ├── Attendance → Subject/Monthly Stats
    │   ├── Chat → AI Assistant
    │   └── Profile → Student Info
    ├── Parent Tabs
    │   ├── Home → Dashboard + Alerts
    │   ├── Analytics → Monthly Reports
    │   ├── Notifications → All Alerts
    │   └── Profile → Parent Info
    └── Teacher Tabs
        ├── Home → Schedule + Active Session
        ├── Live → Live Monitoring View
        ├── Alerts → All Alerts List
        └── Profile → Teacher Info
```

## API Endpoints

### Student
| Method | Endpoint | Description |
|---|---|---|
| GET | `/mobile/student/dashboard` | Student overview with attendance, schedule, insights |
| GET | `/mobile/student/attendance` | Subject-wise attendance stats and monthly trends |
| GET | `/mobile/student/insights` | AI-generated personalized insights |
| GET | `/mobile/student/schedule` | Today's and weekly class schedule |
| POST | `/mobile/chat` | AI Student Assistant chat |

### Parent
| Method | Endpoint | Description |
|---|---|---|
| GET | `/mobile/parent/dashboard` | Parent overview with alerts and trends |
| GET | `/mobile/parent/analytics` | Monthly analytics and subject performance |
| GET | `/mobile/parent/notifications` | Parent notification history |

### Teacher
| Method | Endpoint | Description |
|---|---|---|
| GET | `/mobile/teacher/classes` | Today's class schedule |
| POST | `/mobile/teacher/session/start` | Start a live class session |
| POST | `/mobile/teacher/session/end` | End a live session |
| GET | `/mobile/teacher/alerts` | Active AI alerts |
| GET | `/mobile/teacher/session/:id/qr` | Generate QR code for session |

### QR Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/mobile/attendance/qr` | Submit scanned QR code for attendance |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/notifications` | Get user notifications |
| PATCH | `/notifications/:id/read` | Mark notification as read |
| POST | `/notifications/device` | Register device push token |

## Security Architecture

1. **Authentication:** JWT access tokens (15 min) + refresh tokens (7 days)
2. **Biometric:** Face ID / Fingerprint via `expo-local-authentication`
3. **Storage:** All credentials in `expo-secure-store`
4. **Network:** TLS 1.3, token refresh interceptor, request signing
5. **Offline:** Encrypted cache with minimum data exposure
6. **Device Binding:** Device ID registered with push token for notification targeting

## Push Notifications (FCM)

The notification service:
1. Requests permission on first launch
2. Registers the Expo push token with the backend
3. Creates Android notification channels for different types
4. Listens for foreground notifications via `addNotificationReceivedListener`
5. Handles notification tap actions via `addNotificationResponseReceivedListener`

## Offline Mode

The `offlineService` provides:
- **Cache:** API responses cached in AsyncStorage with TTL (24 hours)
- **Queue:** Offline mutations queued (up to 100 items)
- **Sync:** Auto-sync on reconnection with retry logic (3 retries)
- **Connectivity:** Monitors via NetInfo with callbacks

## Building for Production

```bash
# Install dependencies
cd mobile && npm install

# Start development
npm start

# Build for iOS
expo build:ios

# Build for Android
expo build:android

# EAS Build (recommended for production)
eas build --platform ios
eas build --platform android
eas submit --platform ios
eas submit --platform android
```
