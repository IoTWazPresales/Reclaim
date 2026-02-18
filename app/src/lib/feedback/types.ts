export type FeedbackIssueCategory =
  | 'visual'
  | 'copy'
  | 'wrong_data'
  | 'duplicate_message'
  | 'performance'
  | 'other';

export type FeedbackSeverity = 'minor' | 'major' | 'critical';

export type FeedbackScopeType = 'screen' | 'card';

export type FeedbackSnapshotValue = Record<string, unknown> | null | undefined;

export type FeedbackScopeInput = {
  scopeType: FeedbackScopeType;
  componentKey: string;
  componentTitle?: string;
  tags?: string[];
  snapshot?: FeedbackSnapshotValue | (() => FeedbackSnapshotValue);
};

export type FeedbackReportDraft = {
  category: FeedbackIssueCategory;
  severity: FeedbackSeverity;
  note: string;
};

export type AlphaFeedbackMetadata = {
  appVersion: string;
  buildNumber: string | number;
  runtimeVersion?: string | null;
  channel?: string | null;
  platform: string;
  osVersion: string;
};

export type AlphaFeedbackPayload = {
  routeName: string | null;
  scope: FeedbackScopeInput;
  category: FeedbackIssueCategory;
  severity: FeedbackSeverity;
  note: string;
  context: Record<string, unknown>;
  stateHash: string;
  metadata: AlphaFeedbackMetadata;
  queuedAt?: string;
};
