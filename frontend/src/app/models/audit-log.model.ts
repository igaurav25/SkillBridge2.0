export interface AuditLog {
  _id: string;
  admin: string;
  adminName: string;
  adminEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  targetName: string;
  details: string;
  metadata?: any;
  createdAt: string;
}

