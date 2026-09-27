import type { ConnectionState } from '../../../lib/connectionApi';

/** A suggested partner as returned by /api/matching/suggestions. */
export interface PartnerSuggestion {
  id: string;
  name: string;
  profession: string;
  company: string;
  avatar: string;
  matchScore: number;
  commonTags: string[];
  contactPublic: boolean;
  /** Contact details are included (public, or already connected). */
  contactVisible?: boolean;
  connectionState?: ConnectionState;
  connectionId?: string | null;
  email: string;
  phone: string;
  bio: string;
  linkedin: string;
  github: string;
  matchReason?: string | null;
  [key: string]: any;
}
