import Dexie, { type Table } from 'dexie';

export interface CachedStudent {
  id: number;
  fullName: string;
  studentCode: string;
  className: string;
  classId: number;
  gender: string;
  dateOfBirth: string;
  status: string;
  phone?: string;
  parentName?: string;
  parentPhone?: string;
  address?: string;
  _cachedAt: number;
}

export interface CachedClass {
  id: number;
  name: string;
  grade: string;
  capacity: number;
  studentCount: number;
  teacherName?: string;
  room?: string;
  academicYear: string;
}

export interface CachedTeacher {
  id: number;
  fullName: string;
  teacherCode: string;
  specialization: string;
  phone: string;
  status: string;
}

export interface CachedSubject {
  id: number;
  name: string;
  className: string;
  classId: number;
  teacherName?: string;
  weeklyHours: number;
}

export interface OfflineAction {
  id?: number;
  tempId: string;
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  body?: Record<string, unknown>;
  entity: 'attendance' | 'grade' | 'student' | 'teacher' | 'subject';
  displayLabel: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed';
  localData?: Record<string, unknown>;
}

class SchoolOfflineDB extends Dexie {
  students!: Table<CachedStudent>;
  classes!: Table<CachedClass>;
  teachers!: Table<CachedTeacher>;
  subjects!: Table<CachedSubject>;
  offlineActions!: Table<OfflineAction>;

  constructor() {
    super('school-offline-db-v2');
    this.version(1).stores({
      students: 'id, classId, status, fullName',
      classes: 'id, grade',
      teachers: 'id, status',
      subjects: 'id, classId',
      offlineActions: '++id, entity, status, timestamp, tempId',
    });
  }
}

export const offlineDb = new SchoolOfflineDB();
