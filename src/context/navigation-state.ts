export type NavigationAction =
  | { type: 'NOOP' }
  | { type: 'NAVIGATE'; targetHref: string }
  | { type: 'CANCEL' };

export interface RouteResolutionResult {
  isTargetReached: boolean;
  targetHref: string | null;
}

/**
 * Normalizes a pathname or href by stripping query params and hashes for clean route matching.
 */
export function normalizePath(path: string | null | undefined): string | null {
  if (!path) return null;
  const cleaned = path.split('?')[0].split('#')[0].trim();
  return cleaned || '/';
}

/**
 * Determines whether the current pathname satisfies the target route.
 */
export function isRouteReached(currentPath: string, targetPath: string | null): boolean {
  if (!targetPath) return false;
  const cleanCurrent = normalizePath(currentPath);
  const cleanTarget = normalizePath(targetPath);
  if (!cleanCurrent || !cleanTarget) return false;

  if (cleanTarget === '/') {
    return cleanCurrent === '/';
  }
  return cleanCurrent === cleanTarget || cleanCurrent.startsWith(`${cleanTarget}/`);
}

/**
 * Evaluates the next navigation intent when a user clicks a route link.
 * Supports preemptive switching mid-flight and cancelling back to the current route.
 */
export function resolveNavigationIntent(
  currentPathname: string,
  currentTarget: string | null,
  requestedHref: string
): NavigationAction {
  const cleanRequested = normalizePath(requestedHref);
  const cleanTarget = normalizePath(currentTarget);
  const cleanCurrent = normalizePath(currentPathname);

  // 1. Ignore duplicate clicks to the target already in-flight
  if (cleanTarget && cleanRequested === cleanTarget) {
    return { type: 'NOOP' };
  }

  // 2. Cancellation: if user clicks the current page while a transition is pending
  if (cleanRequested === cleanCurrent) {
    if (currentTarget !== null) {
      return { type: 'CANCEL' };
    }
    // Already on current page and idle -> no-op
    return { type: 'NOOP' };
  }

  // 3. Preemptive navigation: switch target to new destination
  return { type: 'NAVIGATE', targetHref: requestedHref };
}

/**
 * Handles pathname change when Next.js commits a route transition.
 * Only clears target when the destination is truly reached.
 */
export function resolvePathnameChange(
  newPathname: string,
  currentTarget: string | null
): RouteResolutionResult {
  if (!currentTarget) {
    return { isTargetReached: false, targetHref: null };
  }

  if (isRouteReached(newPathname, currentTarget)) {
    return { isTargetReached: true, targetHref: null };
  }

  // Intermediate route arrived; keep waiting for desired target
  return { isTargetReached: false, targetHref: currentTarget };
}
