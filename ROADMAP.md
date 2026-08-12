# TikTok Clone — MVP Roadmap

Tracking doc for core features needed for a minimum viable product. Check items off as they're completed. Scope is backend-focused (this repo) but includes the client-facing capability each feature enables.

## 1. Auth & User Accounts
- [ ] User signup (email/username + password)
- [ ] Login / logout (session or JWT)
- [ ] Password reset flow
- [ ] User profile (bio, avatar, display name)
- [ ] Follow / unfollow users
- [ ] Followers / following lists

## 2. Video Upload & Storage
- [ ] Video upload endpoint (accept file, validate size/format/duration)
- [ ] Video storage (object storage bucket, e.g. S3/Azure Blob)
- [ ] Thumbnail generation
- [ ] Video transcoding/compression for playback
- [ ] Video metadata (caption, hashtags, sound/music credit, duration)
- [ ] Delete/edit own video (caption, privacy)

## 3. Feed & Discovery
- [ ] "For You" feed endpoint (basic ranking: recency + engagement, no ML needed for MVP)
- [ ] Following feed (videos from followed users only)
- [ ] Single video view / detail endpoint
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
- [ ] Input validation on all routes
- [ ] Rate limiting on upload/engagement endpoints
- [ ] Pagination for feeds/comments/lists
- [ ] Test coverage for each route above
- [ ] API documentation (routes, request/response shapes)

## Explicitly Out of Scope for MVP
- Recommendation ML model (start with simple heuristic ranking)
- Live streaming
- Duets/stitches
- In-app messaging/DMs
- Monetization / creator payouts
- Video effects/filters/AR
