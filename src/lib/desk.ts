/** Public URL segment for the locked editor desk (not `/admin`). */
export const DESK_PATH = "/desk";

export function isDeskPath(pathname: string) {
  return pathname === DESK_PATH || pathname.startsWith(`${DESK_PATH}/`);
}
