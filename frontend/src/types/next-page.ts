/**
 * Next.js 16 passes dynamic route params as a Promise.
 * Keeping the type local avoids coupling `tsc --noEmit` to `.next/types`.
 */
export type AsyncRouteProps<TParams extends Record<string, string>> = {
  params: Promise<TParams>;
};
