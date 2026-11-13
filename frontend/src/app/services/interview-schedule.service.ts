import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse } from '../models/api-response.model';
import { InterviewSchedule, InterviewMode, InterviewRound } from '../models/interview-schedule.model';

@Injectable({
  providedIn: 'root',
})
export class InterviewScheduleService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/interviews/schedules`;

  getInterviews(filter: { status?: string; month?: number; year?: number; jobId?: string } = {}): Observable<ApiResponse<InterviewSchedule[]>> {
    let params = new HttpParams();
    if (filter.status) params = params.set('status', filter.status);
    if (filter.month) params = params.set('month', filter.month.toString());
    if (filter.year) params = params.set('year', filter.year.toString());
    if (filter.jobId) params = params.set('jobId', filter.jobId);
    return this.http.get<ApiResponse<InterviewSchedule[]>>(this.API_URL, { params });
  }

  scheduleInterview(data: {
    applicationId: string;
    title?: string;
    scheduledAt: string;
    duration?: number;
    round?: InterviewRound | string;
    mode?: InterviewMode | string;
    meetingLink?: string;
    notes?: string;
  }): Observable<ApiResponse<InterviewSchedule>> {
    return this.http.post<ApiResponse<InterviewSchedule>>(this.API_URL, data);
  }

  rescheduleInterview(
    id: string,
    data: {
      scheduledAt: string;
      duration?: number;
      meetingLink?: string;
      notes?: string;
    }
  ): Observable<ApiResponse<InterviewSchedule>> {
    return this.http.patch<ApiResponse<InterviewSchedule>>(`${this.API_URL}/${id}/reschedule`, data);
  }

  cancelInterview(id: string, reason?: string): Observable<ApiResponse<InterviewSchedule>> {
    return this.http.patch<ApiResponse<InterviewSchedule>>(`${this.API_URL}/${id}/cancel`, { reason });
  }

  submitFeedback(
    id: string,
    data: {
      rating: number;
      recommendation?: string;
      strengths?: string;
      areasToImprove?: string;
      notes?: string;
    }
  ): Observable<ApiResponse<InterviewSchedule>> {
    return this.http.post<ApiResponse<InterviewSchedule>>(`${this.API_URL}/${id}/feedback`, data);
  }
}
