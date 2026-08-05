import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getAccessToken } from "@/api/eduhubClient";

/**
 * Route guard that requires an active access token.
 *
 * <h3>Usage</h3>
 * Wrap any route group that must be authenticated:
 * ```tsx
 * <Route element={<AuthRouteGuard />}>
 *   <Route path="/dashboard/courses" element={<StudentCoursesPage />} />
 * </Route>
 * ```
 *
 * <h3>Design decision — token-presence check</h3>
 * We check for the presence of an access token in storage (not its validity).
 * The access token's actual validity is enforced server-side on every request.
 * If the token is expired, individual API calls will fail with 401 and the
 * app's global 401 handler in {@link eduhubClient} clears tokens + redirects
 * to sign-in. This avoids a blocking JWT parse on every navigation.
 *
 * Role-specific guards ({@link AdminRouteGuard}) compose on top of this guard.
 */
export function AuthRouteGuard() {
  const location = useLocation();

  if (!getAccessToken()) {
    // Redirect to sign-in and remember where the user was trying to go
    return <Navigate to="/signin" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
