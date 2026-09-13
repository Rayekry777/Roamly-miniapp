import type { Shop, ShopSort } from "../types";
export interface DiscoverySnapshot {
  locationKey: string;
  keyword: string;
  typeId: string;
  sort: ShopSort;
  shops: Shop[];
  page: number;
  hasMore: boolean;
  scrollTop: number;
}
const snapshots = new Map<string, DiscoverySnapshot>();
export const discoveryState = {
  save(categoryId: string, value: DiscoverySnapshot) {
    snapshots.set(categoryId, { ...value, shops: [...value.shops] });
  },
  read(categoryId: string, locationKey: string) {
    const value = snapshots.get(categoryId);
    return value?.locationKey === locationKey ? value : undefined;
  },
};
