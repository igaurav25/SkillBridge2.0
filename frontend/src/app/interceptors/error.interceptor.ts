import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred. Please try again.';

      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else if (error.status === 0) {
        errorMessage = 'Unable to connect to the SkillBridge server. Please ensure the backend is running.';
      } else if (error.status === 401) {
        // Sync signals + storage cleanly on token invalidation
        authService.forceClearSession();
        if (!req.url.includes('/auth/login') && !req.url.includes('/auth/register') && !req.url.includes('/auth/me')) {
          errorMessage = 'Session expired. Please log in again.';
          router.navigate(['/login']);
        }
      } else if (error.status === 403) {
        errorMessage = 'Access denied. You do not have permission to view this resource.';
      } else if (error.status === 404) {
        errorMessage = error.error?.message || 'The requested resource was not found.';
      }

      // Don't show toast on routine optional check failures
      if (!req.url.includes('/auth/me')) {
        toastService.show(errorMessage, 'error');
      }

      return throwError(() => error);
    })
  );
};
