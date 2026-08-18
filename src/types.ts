export interface RawRow {
  [columnName: string]: string;
}

export interface DataSource {
  id: string;
  name: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  sampleRows: RawRow[];
  fullRows: RawRow[];
  status: 'connected' | 'analyzed' | 'normalized' | 'error';
  lastSynced: string;
  url?: string;
  isDemo?: boolean;
}

export type CanonicalFieldKey =
  | 'organization_name'
  | 'participant_name'
  | 'email'
  | 'position'
  | 'event_name'
  | 'ignore';

export interface CanonicalFieldDefinition {
  key: CanonicalFieldKey;
  label: string;
  description: string;
  examples: string[];
}

export interface FieldMapping {
  sourceId: string;
  sourceName: string;
  sourceField: string;
  canonicalField: CanonicalFieldKey;
  confidence: number; // 0 to 100
  reasoning: string;
  status: 'auto' | 'user_confirmed' | 'user_modified';
  sampleValues: string[];
}

export interface SchemaAnalysisResult {
  sourceId: string;
  mappings: FieldMapping[];
}

export interface NormalizedRecord {
  id: string;
  participant_name: string;
  organization_name: string;
  email: string;
  position: string;
  event_name: string;
  source_id: string;
  source_name: string;
  original_row: RawRow;
}

export interface DuplicateOrgGroup {
  normalizedKey: string;
  primaryName: string;
  variations: {
    name: string;
    sourceName: string;
    count: number;
  }[];
  totalRecords: number;
  participantCount: number;
  events: string[];
  matchConfidence: number;
}

export interface DuplicateParticipantGroup {
  email: string;
  name: string;
  positions: string[];
  organizations: string[];
  events: string[];
  count: number;
  isCrossEvent: boolean;
}

export interface AIInsight {
  id: string;
  title: string;
  metric: string;
  description: string;
  type: 'duplicate' | 'participation' | 'organization' | 'quality';
  calculatedFact: string;
  actionableRecommendation?: string;
}

export interface GroundedFactDetail {
  calculationType: string;
  matchingCount: number;
  sampleItems: string[];
  rawSummary: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedFollowups?: string[];
  groundedFact?: GroundedFactDetail;
  queryIntent?: {
    intentType: string;
    filterApplied: string;
    recordCount: number;
  };
  isLoading?: boolean;
}

export interface AskAiRequest {
  question: string;
  dataset: NormalizedRecord[];
}

export interface AskAiResponse {
  answer: string;
  groundedFact: GroundedFactDetail;
  suggestedFollowups: string[];
  intentType: string;
}
