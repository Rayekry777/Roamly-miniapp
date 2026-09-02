import type { UserDTO } from "../types";
import { session } from "../utils/session";
import { feedStore } from "./feed";
import { sectionStore } from "./section";
import { commentStore } from "./comment";

class AuthStore {
  token = "";
  user: UserDTO | null = null;

  restore(): void {
    this.token = session.getToken();
  }

  setToken(token: string): void {
    this.token = token;
    session.setToken(token);
  }

  setSession(token: string, user: UserDTO): void {
    this.token = token;
    this.user = user;
    session.setToken(token);
  }

  clear(): void {
    this.token = "";
    this.user = null;
    session.clear();
    feedStore.clearFollowingAndPersonalization();
    sectionStore.clearPersonalization();
    commentStore.clearPersonalization();
  }

  isLoggedIn(): boolean {
    return Boolean(this.token || session.getToken());
  }
}

export const authStore = new AuthStore();
