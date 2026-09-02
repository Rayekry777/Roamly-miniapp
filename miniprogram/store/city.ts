import type { City } from "../types";

const SELECTED_CITY_KEY = "roamly_selected_city_v1";

export type LocationStatus =
  | "IDLE"
  | "LOCATING"
  | "READY"
  | "DENIED"
  | "FAILED";

export interface CityState {
  selectedCity: City | null;
  longitude?: number;
  latitude?: number;
  locationStatus: LocationStatus;
}

export class CityStore {
  private state: CityState = {
    selectedCity: null,
    locationStatus: "IDLE",
  };

  getState(): CityState {
    return { ...this.state };
  }

  initialize(cities: City[]): City | null {
    if (this.state.selectedCity) return this.state.selectedCity;

    const storedCode = String(wx.getStorageSync(SELECTED_CITY_KEY) || "");
    const selectedCity =
      cities.find((city) => city.code === storedCode) || cities[0] || null;

    this.state = { ...this.state, selectedCity };
    if (selectedCity) wx.setStorageSync(SELECTED_CITY_KEY, selectedCity.code);
    return selectedCity;
  }

  select(city: City): void {
    this.state = { ...this.state, selectedCity: city };
    wx.setStorageSync(SELECTED_CITY_KEY, city.code);
  }

  setLocation(
    locationStatus: LocationStatus,
    coordinates?: { longitude: number; latitude: number },
  ): void {
    this.state = {
      ...this.state,
      locationStatus,
      ...(coordinates || {}),
    };
  }
}

export const cityStore = new CityStore();
