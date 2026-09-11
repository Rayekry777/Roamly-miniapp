import { request } from "../utils/request";

export interface LocationContextResponse {
  cityCode: string;
  cityName: string;
  districtCode: string;
  districtName: string;
  poiName?: string;
  locationLabel: string;
  longitude: number;
  latitude: number;
  accuracy?: number;
  locationStatus: "READY";
}

export function resolveLocationContext(data: {
  longitude: number;
  latitude: number;
  accuracy?: number;
}) {
  return request<LocationContextResponse>("/v1/location/context", {
    method: "POST",
    data,
    auth: "public",
    showError: false,
  });
}
