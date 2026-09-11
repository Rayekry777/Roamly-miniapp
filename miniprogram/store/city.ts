import type { City, LocationContext } from "../types";

const SELECTED_CITY_KEY = "roamly_selected_city_v1";

export type LocationStatus =
  | "IDLE"
  | "LOCATING"
  | "READY"
  | "DENIED"
  | "FAILED";

export interface CityState {
  selectedCity: City | null;
  locationContext?: LocationContext;
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
    this.state = {
      selectedCity: city,
      locationStatus: "IDLE",
    };
    wx.setStorageSync(SELECTED_CITY_KEY, city.code);
  }

  setLocation(
    locationStatus: LocationStatus,
    coordinates?: { longitude: number; latitude: number },
  ): void {
    this.state = {
      selectedCity: this.state.selectedCity,
      locationStatus,
      ...(locationStatus === "READY" && coordinates ? coordinates : {}),
    };
  }

  setLocationContext(context: LocationContext): void {
    this.state = {
      selectedCity: { code: context.code, name: context.name },
      locationContext: context,
      longitude: context.longitude,
      latitude: context.latitude,
      locationStatus: "READY",
    };
  }
}

export const cityStore = new CityStore();
