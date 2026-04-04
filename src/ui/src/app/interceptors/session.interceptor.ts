import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { SessionService } from '../services/session.service';

/**
 * HTTP interceptor that attaches the X-Session-ID header to all API requests.
 * This identifies the anonymous user session for the backend.
 */
export const sessionInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const sessionId = session.sessionId();

  if (sessionId && req.url.includes('/api/v1')) {
    const cloned = req.clone({
      setHeaders: { 'X-Session-ID': sessionId },
    });
    return next(cloned);
  }

  return next(req);
};
