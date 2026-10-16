import "@testing-library/jest-dom";
import { afterEach } from "vitest";

afterEach(() => {
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
  }
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.clear();
  }
});
