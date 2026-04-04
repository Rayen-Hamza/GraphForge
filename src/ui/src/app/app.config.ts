import { ApplicationConfig, APP_INITIALIZER, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { sessionInterceptor } from './interceptors/session.interceptor';
import { SessionService } from './services/session.service';

function initSession(session: SessionService) {
  return () => session.init();
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZonelessChangeDetection(),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withInterceptors([sessionInterceptor])),
    {
      provide: APP_INITIALIZER,
      useFactory: initSession,
      deps: [SessionService],
      multi: true,
    },
  ]
};
