export type DataProvenance =
  | 'LIVE'
  | 'LOCAL_DETECTED'
  | 'REMOTE_REPORTED'
  | 'PERSISTED'
  | 'CACHED'
  | 'CONFIGURED'
  | 'UNKNOWN'
  | 'UNAVAILABLE'
  | 'SIMULATED'
  | 'TEST_FIXTURE';

export interface ProvenanceValue<T> {
  value: T;
  provenance: DataProvenance;
  lastUpdated?: number;
  diagnosticNotes?: string;
}
