export interface City {
  code: string;
  name: string;
}

export type LocationMode = "REAL_LOCATION" | "MANUAL_CITY" | "DEFAULT_CITY";

export interface LocationContext extends City {
  districtCode?: string;
  districtName?: string;
  poiName?: string;
  locationLabel?: string;
  longitude?: number;
  latitude?: number;
  accuracy?: number;
  selectionMode?: LocationMode;
}
