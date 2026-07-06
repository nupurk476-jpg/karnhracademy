/**
 * Domain types mirroring the Supabase schema (supabase/migrations).
 * Kept hand-curated so the app layer reads naturally; regenerate with
 * `supabase gen types` if you prefer generated types later.
 */

export type UserRole = "student" | "faculty" | "admin";

export type QuestionStatus =
  | "processing"
  | "pending_review"
  | "approved"
  | "published"
  | "rejected"
  | "duplicate"
  | "archived";

export type QuestionType = "mcq_single" | "mcq_multi" | "true_false" | "numeric" | "descriptive";

export type DifficultyLevel = "easy" | "medium" | "hard";

export type JobStatus =
  | "pending"
  | "extracting"
  | "parsing"
  | "enriching"
  | "completed"
  | "failed"
  | "cancelled";

export type DocumentKind = "questions" | "answer_key" | "mixed" | "unknown";

export type DuplicateStatus = "open" | "dismissed" | "merged";

export type SessionKind = "practice" | "adaptive" | "mock" | "bookmarks";

export type SessionStatus = "active" | "completed" | "abandoned";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SyllabusUnit {
  id: string;
  code: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface Topic {
  id: string;
  unit_id: string;
  title: string;
  description: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface QuestionOption {
  key: string; // "A", "B", ...
  text: string;
}

/** Per-field confidence scores in [0, 1]; absent = not assessed. */
export interface ConfidenceScores {
  overall?: number;
  stem?: number;
  options?: number;
  answer?: number;
  explanation?: number;
  classification?: number;
  ocr?: number;
}

export interface Question {
  id: string;
  status: QuestionStatus;
  question_type: QuestionType;
  stem: string;
  options: QuestionOption[] | null;
  correct_options: string[] | null;
  answer_text: string | null;
  explanation: string | null;
  explanation_is_ai: boolean;
  unit_id: string | null;
  topic_id: string | null;
  difficulty: DifficultyLevel | null;
  keywords: string[];
  confidence: ConfidenceScores;
  overall_confidence: number | null;
  document_id: string | null;
  ingestion_job_id: string | null;
  source_page: number | null;
  source_order: number | null;
  source_chunk: number | null;
  source_excerpt: string | null;
  import_warnings: string[];
  normalized_hash: string | null;
  duplicate_of: string | null;
  times_answered: number;
  times_correct: number;
  created_by: string | null;
  reviewed_by: string | null;
  published_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string;
  file_ext: string;
  mime_type: string | null;
  size_bytes: number;
  sha256: string | null;
  page_count: number | null;
  kind: DocumentKind;
  linked_document_id: string | null;
  extracted_text: string | null;
  needs_ocr: boolean;
  extraction_meta: Record<string, unknown>;
  created_at: string;
}

export interface IngestionJob {
  id: string;
  document_id: string;
  created_by: string;
  status: JobStatus;
  stage_detail: string | null;
  progress: number;
  questions_found: number;
  questions_imported: number;
  duplicates_found: number;
  error: string | null;
  config: Record<string, unknown>;
  lock_token: string | null;
  locked_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IngestionEvent {
  id: number;
  job_id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
}

export interface QuestionRevision {
  id: number;
  question_id: string;
  actor_id: string | null;
  action: string;
  changes: Record<string, unknown>;
  note: string | null;
  created_at: string;
}

export interface QuestionDuplicate {
  id: string;
  question_id: string;
  duplicate_id: string;
  similarity: number;
  method: "hash" | "trigram" | "embedding";
  status: DuplicateStatus;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface PracticeSession {
  id: string;
  user_id: string;
  kind: SessionKind;
  status: SessionStatus;
  unit_id: string | null;
  topic_id: string | null;
  question_ids: string[];
  current_index: number;
  total_answered: number;
  correct_count: number;
  duration_sec: number | null;
  ends_at: string | null;
  config: Record<string, unknown>;
  started_at: string;
  completed_at: string | null;
}

export interface Attempt {
  id: number;
  user_id: string;
  question_id: string;
  session_id: string | null;
  selected_options: string[] | null;
  answer_text: string | null;
  is_correct: boolean | null;
  time_taken_ms: number | null;
  kind: SessionKind;
  created_at: string;
}

export interface UserTopicStats {
  user_id: string;
  topic_id: string;
  attempts: number;
  correct: number;
  last_attempt_at: string;
}
