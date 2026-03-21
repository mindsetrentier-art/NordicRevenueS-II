export type Role = 'admin' | 'manager';

export interface User {
  uid: string;
  email: string;
  displayName?: string;
  role: Role;
  establishmentIds: string[];
  createdAt: Date;
}

export interface Establishment {
  id: string;
  name: string;
  address?: string;
  city?: string;
  postalCode?: string;
  createdBy?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Payments {
  cb: number;
  cbContactless: number;
  cash: number;
  amex: number;
  amexContactless: number;
  tr: number;
  trContactless: number;
  transfer: number;
}

export interface Revenue {
  id: string;
  establishmentId: string;
  date: string; // YYYY-MM-DD
  service?: 'midi' | 'soir';
  payments: Payments;
  total: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string;
    email?: string | null;
    emailVerified?: boolean;
    isAnonymous?: boolean;
    tenantId?: string | null;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}
