export type UserRole = 'admin' | 'editor' | 'author' | 'reviewer';

export type DatabaseJournal = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  issn: string | null;
  publisher: string | null;
  editorial_board: string | null;
  aims_and_scope: string | null;
  peer_review_process: string | null;
  indexing_status: string | null;
  license_type: string | null;
  license_url: string | null;
  frequency: string | null;
  subject_areas: string[] | null;
  created_at: string;
  updated_at: string;
}

export type DatabaseProfile = {
  id: string;
  role: UserRole;
  journal_id: string | null;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  affiliation: string | null;
  email: string | null;
  orcid: string | null;
  created_at: string;
  updated_at: string;
}

export type DatabaseArticle = {
  id: string;
  title: string;
  content: string | null;
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  journal_id: string;
  abstract: string | null;
  pdf_url: string | null;
  canonical_package_url: string | null;
  published_pdf_url: string | null;
  doi: string | null;
  published_at: string | null;
  rejection_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type DatabaseArticleAuthor = {
  article_id: string;
  profile_id: string | null;
  co_author_name: string | null;
  co_author_orcid: string | null;
}

export type DatabaseArticleVersion = {
  id: string;
  article_id: string;
  version_number: number;
  content: string | null;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
}

export type DatabaseReviewerAssignment = {
  id: string;
  article_id: string;
  reviewer_id: string;
  status: 'pending' | 'completed' | 'declined';
  comments: string | null;
  recommendation: 'accept' | 'revise' | 'reject' | null;
  created_at: string;
  updated_at: string;
}

export type DatabaseEditorialBoardMember = {
  id: string;
  journal_id: string;
  full_name: string;
  affiliation: string | null;
  country: string | null;
  role: string | null;
  photo_url: string | null;
  orcid: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type DatabaseStorageManifest = {
  id: string;
  bucket: string;
  logical_path: string;
  physical_hash: string;
  created_at: string;
  updated_at: string;
}

export type DatabaseOutbox = {
  id: string;
  status: string;
  event_type: string;
  payload: any;
  created_at: string;
  processed_at?: string;
  retry_count: number;
  next_retry_at?: string | null;
  last_error?: string | null;
}

export type DatabaseAuditLog = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  metadata: any | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      journals: {
        Row: DatabaseJournal;
        Insert: Omit<DatabaseJournal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseJournal, 'id'>>;
        Relationships: [];
      };
      profiles: {
        Row: DatabaseProfile;
        Insert: Omit<DatabaseProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseProfile, 'id'>>;
        Relationships: [
          {
            foreignKeyName: "profiles_journal_id_fkey",
            columns: ["journal_id"],
            isOneToOne: false,
            referencedRelation: "journals",
            referencedColumns: ["id"]
          }
        ];
      };
      articles: {
        Row: DatabaseArticle;
        Insert: Omit<DatabaseArticle, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseArticle, 'id'>>;
        Relationships: [
          {
            foreignKeyName: "articles_journal_id_fkey",
            columns: ["journal_id"],
            isOneToOne: false,
            referencedRelation: "journals",
            referencedColumns: ["id"]
          }
        ];
      };
      article_authors: {
        Row: DatabaseArticleAuthor;
        Insert: DatabaseArticleAuthor;
        Update: Partial<DatabaseArticleAuthor>;
        Relationships: [
          {
            foreignKeyName: "article_authors_article_id_fkey",
            columns: ["article_id"],
            isOneToOne: false,
            referencedRelation: "articles",
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_authors_profile_id_fkey",
            columns: ["profile_id"],
            isOneToOne: false,
            referencedRelation: "profiles",
            referencedColumns: ["id"]
          }
        ];
      };
      article_versions: {
        Row: DatabaseArticleVersion;
        Insert: Omit<DatabaseArticleVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<DatabaseArticleVersion, 'id'>>;
        Relationships: [];
      };
      reviewer_assignments: {
        Row: DatabaseReviewerAssignment;
        Insert: Omit<DatabaseReviewerAssignment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseReviewerAssignment, 'id'>>;
        Relationships: [];
      };
      editorial_board_members: {
        Row: DatabaseEditorialBoardMember;
        Insert: Omit<DatabaseEditorialBoardMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseEditorialBoardMember, 'id'>>;
        Relationships: [];
      };
      storage_manifest: {
        Row: DatabaseStorageManifest;
        Insert: Omit<DatabaseStorageManifest, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseStorageManifest, 'id'>>;
        Relationships: [];
      };
      outbox: {
        Row: DatabaseOutbox;
        Insert: {
          id?: string;
          event_type: 'pdf_generated' | 'html_generated' | 'jats_generated' | 'AuditRecorded' | 'NotificationQueued' | 'ArticleSubmitted' | 'ReviewSubmitted' | 'ReviewDeclined' | 'DecisionSubmitted';
          payload: any;
          status: 'pending' | 'failed' | 'completed';
          processed_at?: string | null;
          error?: string | null;
        };
        Update: Partial<Omit<DatabaseOutbox, 'id'>>;
        Relationships: [];
      };
      audit_log: {
        Row: DatabaseAuditLog;
        Insert: Omit<DatabaseAuditLog, 'id' | 'created_at'>;
        Update: Partial<Omit<DatabaseAuditLog, 'id'>>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      process_single_audit_event: {
        Args: { p_outbox_id: string };
        Returns: boolean;
      };
      submit_article_transition: {
        Args: {
          p_submission_id: string;
          p_article_id: string;
          p_payload: any;
          p_idempotency_key: string;
          p_intent_hash: string;
        };
        Returns: { success: boolean; submission_id: string; article_id: string; error?: string };
      };
      process_article_submission: {
        Args: { p_outbox_id: string };
        Returns: boolean;
      };
      process_review_submission: {
        Args: { p_outbox_id: string };
        Returns: boolean;
      };
      record_decision: {
        Args: { 
          p_submission_id: string;
          p_editor_id: string;
          p_decision_type: string;
          p_comments_to_author: string | null;
          p_comments_internal: string | null;
          p_review_round: number;
          p_revise_deadline: string | null;
          p_supporting_review_ids: string[] | null;
          p_idempotency_key: string;
        };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never
    };
    CompositeTypes: {
      [_ in never]: never
    };
  };
}

export interface JournalWithMeta extends DatabaseJournal {
  article_count?: number;
}

export type ArticleWithRelations = DatabaseArticle & {
  journals?: DatabaseJournal | null;
  article_authors?: Array<{
    profiles?: DatabaseProfile | null;
  }>;
  article_versions?: DatabaseArticleVersion[];
}

export type ProfileWithRelations = DatabaseProfile & {
  journals?: DatabaseJournal | null;
};
