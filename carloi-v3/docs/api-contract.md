# API Contract Baseline

Live API base URL:

- `https://api.carloi.com`

Referenced working backend surfaces from legacy system:

- `/health`
- `/api/bootstrap`
- `/api/auth/login`
- `/api/auth/register`
- `/api/auth/verify-email`
- `/api/auth/send-sms-code`
- `/api/media/upload`
- `/api/posts`
- `/api/profile/settings`
- `/api/profile/media`
- `/api/commercial/status`
- `/api/commercial/profile`
- `/api/commercial/documents`
- `/api/commercial/submit`
- `/api/conversations/direct`
- `/api/conversations/listing`
- `/api/conversations/:conversationId/messages`
- `/api/conversations/:conversationId/agreement`
- `/api/conversations/:conversationId/insurance/pay`
- `/api/ai/chat`
- `/api/ai/clear`
- `/api/admin/commercial/reviews`

V3 API client goals:

- consistent timeout handling
- normalized auth/offline/upload errors
- token storage abstraction
- upload wrapper
- debug logging without leaking secrets
