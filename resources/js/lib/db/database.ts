import Dexie, { type Table } from 'dexie';
import type { Animal, MilkRecord, HealthEvent, Alert } from '@/types';

export interface DBAnimal extends Animal {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed';
  locallyModifiedAt: string | null;
}

export interface DBMilkRecord extends MilkRecord {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed';
  locallyModifiedAt: string | null;
}

export interface DBHealthEvent extends HealthEvent {
  syncStatus: 'synced' | 'pending' | 'conflict' | 'failed';
  locallyModifiedAt: string | null;
}

export interface DBAlert extends Alert {
  syncStatus: 'synced' | 'pending';
}

export interface DBQueuedOperation {
  id: string;
  entity: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
  status: 'pending' | 'failed';
  error: string | null;
}

export interface DBSyncMeta {
  id: string; // entity type, e.g. 'animals'
  lastSyncedAt: string | null;
}

export interface DBDraft {
  id: string;
  formKey: string;
  data: Record<string, unknown>;
  step: number;
  savedAt: string;
}

class FarmOpsDB extends Dexie {
  animals!: Table<DBAnimal, string>;
  milkRecords!: Table<DBMilkRecord, string>;
  healthEvents!: Table<DBHealthEvent, string>;
  alerts!: Table<DBAlert, string>;
  syncQueue!: Table<DBQueuedOperation, string>;
  syncMeta!: Table<DBSyncMeta, string>;
  drafts!: Table<DBDraft, string>;

  constructor() {
    super('FarmOpsDB');

    this.version(1).stores({
      animals: 'id, farm_id, status, tag_number, syncStatus, [farm_id+status]',
      milkRecords: 'id, farm_id, animal_id, milked_on, session, syncStatus, [animal_id+milked_on], [farm_id+milked_on]',
      healthEvents: 'id, farm_id, animal_id, observed_on, syncStatus, [animal_id+observed_on]',
      alerts: 'id, farm_id, severity, status, due_on, animal_id',
      syncQueue: 'id, entity, entityId, operation, status, createdAt, [entity+entityId]',
      syncMeta: 'id',
      drafts: 'id, formKey, savedAt',
    });
  }
}

export const db = new FarmOpsDB();
