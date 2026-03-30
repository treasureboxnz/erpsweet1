export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Generate login URL - redirect to custom login page
export const getLoginUrl = (returnPath?: string) => {
  const loginUrl = "/login";
  if (returnPath) {
    return `${loginUrl}?return=${encodeURIComponent(returnPath)}`;
  }
  return loginUrl;
};
