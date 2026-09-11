export interface City {
  code: string;
  name: string;
}

export interface LocationContext extends City {
  districtCode: string;
  districtName: string;
  poiName?: string;
  locationLabel: string;
  longitude: number;
  latitude: number;
  accuracy?: number;
}
