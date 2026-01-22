import { useState, useCallback, useRef } from 'react';

export type SyncOperation = {
  id: string;
  table: string;
  operation: 'upsert' | 'select' | 'delete';
  count: number;
  success: boolean;
  error?: string;
  timestamp: Date;
  duration?: number;
};

export type RealtimeStatus = {
  table: string;
  status: 'SUBSCRIBED' | 'CLOSED' | 'CHANNEL_ERROR' | 'TIMED_OUT' | 'pending';
  lastEvent?: Date;
  eventCount: number;
};

export type SyncDebugState = {
  operations: SyncOperation[];
  realtimeStatus: Map<string, RealtimeStatus>;
  licenseId: string | null;
  userId: string | null;
  isDebugMode: boolean;
};

const MAX_OPERATIONS = 50;

export function useSyncDebug() {
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [realtimeStatus, setRealtimeStatus] = useState<Map<string, RealtimeStatus>>(new Map());
  const [licenseId, setLicenseId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const operationIdRef = useRef(0);

  const logOperation = useCallback((
    table: string,
    operation: 'upsert' | 'select' | 'delete',
    count: number,
    success: boolean,
    error?: string,
    duration?: number
  ) => {
    const newOp: SyncOperation = {
      id: `op-${++operationIdRef.current}`,
      table,
      operation,
      count,
      success,
      error,
      timestamp: new Date(),
      duration,
    };

    setOperations(prev => [newOp, ...prev].slice(0, MAX_OPERATIONS));
  }, []);

  const updateRealtimeStatus = useCallback((
    table: string,
    status: RealtimeStatus['status'],
    isEvent?: boolean
  ) => {
    setRealtimeStatus(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(table) || { table, status: 'pending', eventCount: 0 };
      newMap.set(table, {
        ...existing,
        status,
        lastEvent: isEvent ? new Date() : existing.lastEvent,
        eventCount: isEvent ? existing.eventCount + 1 : existing.eventCount,
      });
      return newMap;
    });
  }, []);

  const setContext = useCallback((lid: string | null, uid: string | null) => {
    setLicenseId(lid);
    setUserId(uid);
  }, []);

  const toggleDebugMode = useCallback(() => {
    setIsDebugMode(prev => !prev);
  }, []);

  const clearOperations = useCallback(() => {
    setOperations([]);
  }, []);

  return {
    operations,
    realtimeStatus,
    licenseId,
    userId,
    isDebugMode,
    logOperation,
    updateRealtimeStatus,
    setContext,
    toggleDebugMode,
    clearOperations,
  };
}

export type SyncDebugActions = ReturnType<typeof useSyncDebug>;
