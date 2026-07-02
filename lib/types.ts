export type UserRole = 'admin' | 'editor' | 'author' | 'reviewer';

export interface DatabaseJournal {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  cover_image: string | null;
  issn: string | null;
  publisher: string | null;
  editorial_board: string | null;
  aims_and_scope: string | null;
  peer_review_policy: string | null;
  license_type: string | null;
  license_url: string | null;
  frequency: string | null;
  subject_areas: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseProfile {
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

export interface DatabaseArticle {
  id: string;
  title: string;
  content: string | null;
  status: 'draft' | 'pending_review' | 'published' | 'rejected';
  journal_id: string;
  abstract: string | null;
  pdf_url: string | null;
  doi: string | null;
  published_at: string | null;
  rejection_reason: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface DatabaseArticleAuthor {
  article_id: string;
  profile_id: string | null;
  co_author_name: string | null;
  co_author_orcid: string | null;
}

export interface DatabaseArticleVersion {
  id: string;
  article_id: string;
  version_number: number;
  content: string | null;
  changelog: string | null;
  created_by: string | null;
  created_at: string;
}

export interface DatabaseReviewerAssignment {
  id: string;
  article_id: string;
  reviewer_id: string;
  status: 'pending' | 'completed' | 'declined';
  comments: string | null;
  recommendation: 'accept' | 'revise' | 'reject' | null;
  created_at: string;
  updated_at: string;
}

export interface DatabaseEditorialBoardMember {
  id: string;
  journal_id: string;
  full_name: string;
  affiliation: string | null;
  role: string | null;
  photo_url: string | null;
  orcid: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Database {
  public: {
    Tables: {
      journals: {
        Row: DatabaseJournal;
        Insert: Omit<DatabaseJournal, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseJournal, 'id'>>;
      };
      profiles: {
        Row: DatabaseProfile;
        Insert: Omit<DatabaseProfile, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseProfile, 'id'>>;
      };
      articles: {
        Row: DatabaseArticle;
        Insert: Omit<DatabaseArticle, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseArticle, 'id'>>;
      };
      article_authors: {
        Row: DatabaseArticleAuthor;
        Insert: DatabaseArticleAuthor;
        Update: Partial<DatabaseArticleAuthor>;
      };
      article_versions: {
        Row: DatabaseArticleVersion;
        Insert: Omit<DatabaseArticleVersion, 'id' | 'created_at'>;
        Update: Partial<Omit<DatabaseArticleVersion, 'id'>>;
      };
      reviewer_assignments: {
        Row: DatabaseReviewerAssignment;
        Insert: Omit<DatabaseReviewerAssignment, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseReviewerAssignment, 'id'>>;
      };
      editorial_board_members: {
        Row: DatabaseEditorialBoardMember;
        Insert: Omit<DatabaseEditorialBoardMember, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DatabaseEditorialBoardMember, 'id'>>;
      };
    };
  };
}

export interface JournalWithMeta extends DatabaseJournal {
  article_count?: number;
}

export interface ArticleWithRelations extends DatabaseArticle {
  journals?: DatabaseJournal;
  article_authors?: Array<{
    profiles?: DatabaseProfile;
  }>;
  article_versions?: DatabaseArticleVersion[];
}

export interface ProfileWithRelations extends DatabaseProfile {
  journals?: DatabaseJournal;
}
