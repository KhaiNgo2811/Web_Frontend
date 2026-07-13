import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { describe, expect, it } from 'vitest';

import { AuditRepository, ConfigRepository } from '../data';
import type { BusinessConfig, BusinessConfigInput, ExportJob } from '../models';
import { AdminAuditStore } from './admin-audit.store';
import { AdminConfigStore } from './admin.stores';
import { SessionStore } from './session.store';

const CONFIG: BusinessConfig = {
  minRatingThreshold: 3,
  minComplaintsThreshold: 2,
  tokenPackages: [],
  tokenConversion: { xuPer1000Vnd: 10, maxAdViewsPerDay: 20, tokensPerAdView: 1 },
  updatedAt: '2026-07-11T00:00:00.000Z',
  updatedBy: 'admin-a',
};

const SESSION = { currentUser: () => ({ id: 'admin-a' }) };

describe('admin operation stores', () => {
  it('reports configuration success only after repository completion', () => {
    const save = new Subject<BusinessConfig>();
    const repository = {
      listRegions: () => of([]),
      getBusinessConfig: () => of(CONFIG),
      saveBusinessConfig: () => save,
      restoreDefaults: () => of(CONFIG),
      validateBusinessConfig: () => ({}),
    };
    TestBed.configureTestingModule({
      providers: [
        AdminConfigStore,
        { provide: ConfigRepository, useValue: repository },
        { provide: SessionStore, useValue: SESSION },
      ],
    });
    const store = TestBed.inject(AdminConfigStore);

    expect(store.save(asInput(CONFIG))).toBe(true);
    expect(store.saveState()).toBe('pending');
    save.next({ ...CONFIG, minRatingThreshold: 4 });
    expect(store.saveState()).toBe('pending');
    save.complete();

    expect(store.saveState()).toBe('success');
    expect(store.config()?.minRatingThreshold).toBe(4);
  });

  it('keeps audit export pending until completion and exposes failures', () => {
    const exportRequest = new Subject<ExportJob>();
    let exportListCalls = 0;
    const repository = {
      list: () => of([]),
      listExports: () => {
        exportListCalls += 1;
        return of([exportFixture()]);
      },
      requestExport: () => exportRequest,
    };
    TestBed.configureTestingModule({
      providers: [
        AdminAuditStore,
        { provide: AuditRepository, useValue: repository },
        { provide: SessionStore, useValue: SESSION },
      ],
    });
    const store = TestBed.inject(AdminAuditStore);
    store.requestExport();
    exportRequest.next(exportFixture());

    expect(store.exportState()).toBe('pending');
    expect(store.latestExport()?.id).toBe('export-a');
    expect(exportListCalls).toBe(1);
    exportRequest.complete();
    expect(store.exportState()).toBe('success');
    store.clearExportState();
    expect(store.exportState()).toBe('idle');

    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        AdminAuditStore,
        {
          provide: AuditRepository,
          useValue: {
            list: () => of([]),
            listExports: () => of([]),
            requestExport: () => throwError(() => new Error('Không thể xuất dữ liệu.')),
          },
        },
        { provide: SessionStore, useValue: SESSION },
      ],
    });
    const failedStore = TestBed.inject(AdminAuditStore);
    failedStore.requestExport();

    expect(failedStore.exportState()).toBe('error');
    expect(failedStore.error()).toBe('Không thể xuất dữ liệu.');
  });
});

function asInput(config: BusinessConfig): BusinessConfigInput {
  return {
    minRatingThreshold: config.minRatingThreshold,
    minComplaintsThreshold: config.minComplaintsThreshold,
    tokenPackages: config.tokenPackages,
    tokenConversion: config.tokenConversion,
  };
}

function exportFixture(): ExportJob {
  return {
    id: 'export-a',
    requestedBy: 'admin-a',
    createdAt: '2026-07-11T00:00:00.000Z',
    status: 'queued',
    format: 'csv',
    redaction: 'default',
    retentionUntil: '2026-07-18T00:00:00.000Z',
    scope: 'audit',
  };
}
