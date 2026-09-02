import type { City, Result } from "../types";
import { request } from "../utils/request";

export const listCities = (): Promise<Result<City[]>> =>
  request("/v1/cities", { auth: "public" });
