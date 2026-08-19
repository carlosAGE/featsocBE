# TikTok Clone — MVP Roadmap

Tracking doc for core features needed for a minimum viable product. Check items off as they're completed. Scope is backend-focused (this repo) but includes the client-facing capability each feature enables.

## 1. Auth & User Accounts
- [x] User signup (email/username + password) — `POST /api/auth/signup`, bcrypt-hashed (see PROJECT_LOG X-003)
- [x] Login / logout (session or JWT) — `POST /api/auth/login` + `POST /api/auth/logout`, JWT via httpOnly cookie or bearer (see PROJECT_LOG X-004, D-002/D-003); Google sign-in also done (D-001)
- [ ] Password reset flow
- [ ] User profile (bio, avatar, display name) — schema + `POST`/`GET /api/users` done; **no edit/PATCH endpoint yet**
- [ ] Follow / unfollow users
- [ ] Followers / following lists

## 2. Video Upload & Storage
- [x] Video upload endpoint (accept file, validate size/format/duration) — `POST /api/videos`, single-shot multipart (see PROJECT_LOG D-013)
- [x] Video storage (object storage bucket, e.g. S3/Azure Blob) — Cloudflare R2 (see PROJECT_LOG D-012)
- [x] Thumbnail generation — ffmpeg grabs a jpg frame on upload
- [x] Video transcoding/compression for playback — ffmpeg normalize pass (capped H.264/AAC mp4, no adaptive bitrate yet)
- [ ] Video metadata (caption, hashtags, sound/music credit, duration) — caption + duration done; hashtags and sound/music credit not started
- [ ] Delete/edit own video (caption, privacy) — delete done (`DELETE /api/videos/:id`); **edit/PATCH not built, no privacy field yet**

## 3. Feed & Discovery
- [ ] "For You" feed endpoint (basic ranking: recency + engagement, no ML needed for MVP)
- [ ] Following feed (videos from followed users only)
- [x] Single video view / detail endpoint — `GET /api/videos/:id`
- [ ] User's own video list (profile grid)
- [ ] Hashtag pages (videos by tag)
- [ ] Basic search (users, captions, hashtags)

## 4. Engagement
- [ ] Like / unlike video
- [ ] Comment on video
- [ ] Reply to comment
- [ ] Delete own comment
- [ ] Share (generate shareable link)
- [ ] View count tracking

## 5. Notifications
- [ ] New follower notification
- [ ] Like/comment notification
- [ ] Notification list endpoint (read/unread state)

## 6. Moderation & Safety (baseline)
- [ ] Report video/comment/user
- [ ] Block user
- [ ] Basic content flagging (profanity filter or manual queue)
- [ ] Private account toggle

## 7. Infrastructure & Cross-Cutting
- [x] Input validation on all routes — `express-validator` on every existing route (auth/posts/users/videos)
- [ ] Rate limiting on upload/engagement endpoints — global (300/15min) + strict auth tier cover what exists (see PROJECT_LOG D-007); **no upload-specific limiter**; engagement endpoints don't exist yet
- [ ] Pagination for feeds/comments/lists — posts support `?limit&before`; feed/comments not built
- [ ] Test coverage for each route above — auth/posts/users/videos/health/rate-limit covered; nothing to cover yet for feed/engagement/notifications/moderation
- [x] API documentation (routes, request/response shapes) — README endpoint table + auth/video sections

## Explicitly Out of Scope for MVP
- Recommendation ML model (start with simple heuristic ranking)
- Live streaming
- Duets/stitches
- In-app messaging/DMs
- Monetization / creator payouts
- Video effects/filters/AR
