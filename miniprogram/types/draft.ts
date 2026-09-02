import type { UploadedMedia } from "./media";
import type { SectionSummary } from "./section";
import type { ShopSummary } from "./post";

export interface PostDraft {
  title: string;
  content: string;
  media: UploadedMedia[];
  shopVisit: boolean;
  section: SectionSummary | null;
  shop: ShopSummary | null;
  submitting: boolean;
  updatedAt: number;
}
