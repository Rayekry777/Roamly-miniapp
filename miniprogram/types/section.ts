export type SectionPostSort = "LATEST" | "HOT";

export interface SectionSummary {
  id: string;
  code: string;
  name: string;
  icon?: string;
  allowShopVisit: boolean;
  followedByMe: boolean;
  description?: string;
}

export interface SectionDetail extends SectionSummary {
  description?: string;
  cover?: string;
  postCount?: number;
  followerCount?: number;
}
