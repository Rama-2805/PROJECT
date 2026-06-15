# SmartCampus AI — Security Handbook

## Security Principles

1. **Zero-Trust** — Verify every request regardless of origin
2. **Least Privilege** — Minimum access for minimum function
3. **Defense in Depth** — Multiple security layers
4. **Privacy by Design** — Data protection built into architecture

---

## Authentication System

### JWT Token Flow

```
Client                    API                     Database
  │                        │                        │
  │── POST /auth/login ───▶│                        │
  │                        │── Verify credentials ─▶│
  │                        │◀── User + roles ──────│
  │◀── Access + Refresh ───│                        │
  │                        │                        │
  │── Request + JWT ──────▶│                        │
  │                        │── Validate JWT ───────▶│
  │                        │   (stateless, no DB)   │
  │◀── Response ───────────│                        │
```

### Token Configuration

| Token | Lifetime | Storage | Rotation |
|-------|----------|---------|----------|
| Access Token | 15 min | Memory (HTTP-only cookie) | Every request |
| Refresh Token | 7 days | Secure cookie | On use |
| Device Token | 90 days | Device config file | On re-auth |

### Rate Limiting

```typescript
// Global: 100 requests per 60 seconds
// Auth: 10 requests per 60 seconds
// AI endpoints: 30 requests per 60 seconds
// Device heartbeat: 1 request per 10 seconds
```

---

## Authorization (RBAC)

### Roles & Permissions

| Role | Access Level |
|------|-------------|
| `SUPER_ADMIN` | Full system access, cross-institution |
| `INSTITUTION_ADMIN` | Institution-wide management |
| `TEACHER` | Classroom and student data |
| `STUDENT` | Personal data only |
| `DEVICE_MANAGER` | IoT device management |
| `RESEARCH_ANALYST` | Anonymous analytics access |

### Guard Implementation

Every API endpoint is protected by a role guard:
```typescript
@Roles(RoleName.INSTITUTION_ADMIN, RoleName.TEACHER)
@UseGuards(JwtAuthGuard, RolesGuard)
```

---

## Data Encryption

### At Rest

| Data Type | Algorithm | Key Management |
|-----------|-----------|----------------|
| Face embeddings | AES-256-GCM | ENCRYPTION_KEY env var |
| Device tokens | AES-256-GCM | Per-device derived key |
| User passwords | bcrypt (12 rounds) | Salted hash |
| JWT secrets | SHA-256 | Environment variable |

### In Transit

- All HTTP traffic uses TLS 1.3
- MQTT supports TLS (port 8883)
- Database connections use SSL
- Redis connections require password

---

## Biometric Privacy

### Data Retention

| Data Type | Retention | Auto-Delete |
|-----------|-----------|-------------|
| Face embeddings | 365 days | After 730 days |
| Attendance records | 10 years | N/A (policy) |
| Behavior events | 2 years | After 730 days |
| Audit logs | 5 years | After 1825 days |
| Raw video | 30 days | After 30 days |

### Privacy Controls

- **Consent Management** — Student must opt-in for face enrollment
- **Right to Deletion** — Students can request biometric data deletion
- **Data Export** — GDPR-compliant data export in JSON format
- **Access Logging** — Every biometric data access is audited

---

## Audit Logging

### Events Tracked

```
LOGIN_SUCCESS          Login attempt succeeded
LOGIN_FAILED           Login attempt failed
ROLE_CHANGE            User role modified
DATA_EXPORT            Report or data exported
STUDENT_DATA_ACCESS    Student profile viewed
DEVICE_CONFIG_CHANGE   Edge device configuration changed
BIOMETRIC_ACCESS       Face data accessed
BIOMETRIC_ENROLL       Student enrolled in face recognition
BIOMETRIC_DELETE       Biometric data deleted
REPORT_GENERATION      Report generated
```

### Log Format

```json
{
  "id": "log_abc123",
  "userId": "usr_001",
  "action": "STUDENT_DATA_ACCESS",
  "entity": "STUDENT",
  "entityId": "CSE2026001",
  "metadata": { "reason": "profile_view" },
  "ip": "192.168.1.1",
  "createdAt": "2026-06-12T10:00:00Z"
}
```

---

## Incident Response

### Severity Levels

| Level | Definition | Response Time |
|-------|-----------|---------------|
| SEV-1 | Data breach or system compromise | 15 min |
| SEV-2 | Authentication failure or service outage | 30 min |
| SEV-3 | Suspicious activity detected | 4 hours |
| SEV-4 | Minor anomaly | 24 hours |

### Response Flow

1. **Detect** — Monitoring alert or user report
2. **Contain** — Isolate affected component
3. **Investigate** — Review audit logs
4. **Remediate** — Fix vulnerability
5. **Recover** — Restore from backup if needed
6. **Report** — Document incident

---

## Compliance

- **GDPR** — Data portability, right to deletion, consent management
- **FERPA** — Student education record privacy
- **Biometric Privacy** — Clear consent, retention limits, access controls
- **Data Localization** — All data stored in institution's database
