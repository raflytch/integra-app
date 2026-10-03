const DEFAULT_RETURN_PATH = '/claims';

/** Only same-origin paths, so `?next=` cannot redirect to another site. */
export function toSafeReturnPath(requestedPath: string | null): string {
  const isInternalPath =
    requestedPath?.startsWith('/') && !requestedPath.startsWith('//');
  return isInternalPath ? requestedPath! : DEFAULT_RETURN_PATH;
}
