/**
 * A Label of the Space given (a Label belongs to its Item's Space): one made
 * offline, its Space not yet known, counts as my Personal one.
 */
export const labelIn =
  (space: string | null, personal: string | null) => (l: { space_id: string }) =>
    l.space_id ? l.space_id === (space ?? personal) : (space ?? personal) === personal
