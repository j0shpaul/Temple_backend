# Temple Digital Platform — Production Operational Runbook

This document outlines standard operating procedures (SOPs) for site reliability engineers (SREs), backend architects, and system administrators running the Temple Digital Platform.

---

## 1. Request Traceability & Log Investigation

Every incoming request is tagged with a unique `x-request-id` header (either passed by upstream reverse proxy / Cloudflare or generated as UUID v4).

### Finding logs for a specific request ID:
```bash
# Using grep on structured JSON logs
grep '"reqId":"9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d"' /var/log/temple-backend/app.log | jq .
```

---

## 2. Payment & Webhook Incident Runbook

### Issue: Devotee completed payment on Cashfree, but booking shows `PENDING_PAYMENT`

**Cause**: Webhook delivery delayed or network timeout during Cashfree callback.

**Procedure**:
1. Run server-side authoritative reconciliation endpoint:
   ```bash
   curl -X GET "https://api.temple.example.com/api/v1/payments/{paymentId}/status" \
     -H "Authorization: Bearer <ADMIN_OR_USER_TOKEN>"
   ```
2. `PaymentService.reconcilePayment()` will query Cashfree directly, verify payment status, transition payment to `SUCCESS`, and fulfill booking / generate receipt inside an atomic transaction.
3. Check `PaymentEvent` table in DB:
   ```sql
   SELECT * FROM "PaymentEvent" WHERE "paymentId" = '<paymentId>' ORDER BY "createdAt" DESC;
   ```

---

## 3. Rate Limit Violations & IP Blocking

### Issue: Client reporting HTTP 429 "Too Many Requests"

**Investigation**:
1. Search logs for `Rate limit exceeded`:
   ```bash
   grep "Rate limit exceeded" /var/log/temple-backend/app.log
   ```
2. Inspect Redis rate limit counter:
   ```bash
   redis-cli -u $REDIS_URL GET "ratelimit:/api/v1/auth/send-otp:<client_ip>"
   redis-cli -u $REDIS_URL TTL "ratelimit:/api/v1/auth/send-otp:<client_ip>"
   ```
3. To reset rate limit for a legitimate user:
   ```bash
   redis-cli -u $REDIS_URL DEL "ratelimit:/api/v1/auth/send-otp:<client_ip>"
   ```

---

## 4. Releasing Expired Reservation Holds On-Demand

### Procedure:
Although the automated background scheduler (`ReservationCleanupScheduler`) runs every 5 minutes with distributed locks, an admin can manually trigger hold cleanup:
```bash
curl -X POST "https://api.temple.example.com/api/v1/admin/cleanup-expired-reservations" \
  -H "Authorization: Bearer <ADMIN_JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"cutoffMinutes": 30}'
```

---

## 5. Cache Management & Invalidation

### Invalidate Specific Temple Page Cache:
```bash
# Invalidate Darshan Page Cache for Temple
redis-cli -u $REDIS_URL DEL "page:darshan:<templeId>"

# Invalidate Home Page Cache for Temple
redis-cli -u $REDIS_URL DEL "page:home:<templeId>"
```

---

## 6. Health Probes & Load Balancer Monitoring

```bash
# Liveness Probe (Should return HTTP 200)
curl -s https://api.temple.example.com/api/v1/health/live

# Readiness Probe (Checks Postgres & Redis connectivity)
curl -s https://api.temple.example.com/api/v1/health/ready
```
