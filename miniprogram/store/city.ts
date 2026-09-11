import type { City, LocationContext, LocationMode } from "../types";

const SELECTED_CITY_KEY = "roamly_selected_city_v1";
const DEFAULT_CITY: City = { code: "330100", name: "杭州" };

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
  selectionMode: LocationMode;
}

export class CityStore {
  private state: CityState = {
    selectedCity: null,
    locationStatus: "IDLE",
    selectionMode: "DEFAULT_CITY",
  };

  getState(): CityState {
    return { ...this.state };
  }

  initialize(cities: City[]): City | null {
    if (this.state.selectedCity) return this.state.selectedCity;

    const storedCode = String(wx.getStorageSync(SELECTED_CITY_KEY) || "");
    const storedCity = cities.find((city) => city.code === storedCode);
    const selectedCity =
      storedCity ||
      cities.find((city) => city.code === DEFAULT_CITY.code) ||
      cities[0] ||
      DEFAULT_CITY;

    this.state = {
      selectedCity,
      locationStatus: "IDLE",
      selectionMode: storedCity ? "MANUAL_CITY" : "DEFAULT_CITY",
    };
    if (selectedCity && storedCity) {
      wx.setStorageSync(SELECTED_CITY_KEY, selectedCity.code);
    }
    return selectedCity;
  }

  select(city: City): void {
    this.state = {
      selectedCity: city,
      locationStatus: "IDLE",
      selectionMode: "MANUAL_CITY",
    };
    wx.setStorageSync(SELECTED_CITY_KEY, city.code);
  }

  setDefaultCity(
    city: City = DEFAULT_CITY,
    status: LocationStatus = "FAILED",
  ): void {
    this.state = {
      selectedCity: city,
      locationStatus: status,
      selectionMode: "DEFAULT_CITY",
    };
  }

  setLocation(
    locationStatus: LocationStatus,
    coordinates?: { longitude: number; latitude: number },
  ): void {
    this.state = {
      selectedCity: this.state.selectedCity,
      locationStatus,
      selectionMode:
        locationStatus === "READY" ? "REAL_LOCATION" : this.state.selectionMode,
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
      selectionMode: "REAL_LOCATION",
    };
  }

  context(): LocationContext | null {
    const city = this.state.selectedCity;
    if (!city) return null;
    const context = this.state.locationContext;
    return context && this.state.selectionMode === "REAL_LOCATION"
      ? { ...context, selectionMode: "REAL_LOCATION" }
      : { ...city, selectionMode: this.state.selectionMode };
  }
}

export const cityStore = new CityStore();
