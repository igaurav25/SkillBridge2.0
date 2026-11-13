export type InterviewStatus = 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
export type InterviewRound = 'Screening' | 'Technical' | 'System Design' | 'Managerial' | 'HR / Culture Fit' | 'Final';
export type InterviewMode = 'Google Meet' | 'Zoom' | 'Microsoft Teams' | 'In-Person' | 'Phone';

export interface InterviewSchedule {
  _id: string;
  application: any;
  job: any;
  candidate: any;
  recruiter: any;
  title: string;
  round: InterviewRound;
  scheduledAt: string;
  duration: number; // in minutes
  mode: InterviewMode;
  meetingLink?: string;
  status: InterviewStatus;
  notes?: string;
  feedback?: {
    rating: number;
    recommendation?: string;
    strengths?: string;
    areasToImprove?: string;
    notes?: string;
    submittedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}
