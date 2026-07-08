/**
 * Dumb mode master switch.
 *
 * Flip this to `true` to enable the dumbed-down, clunky version of the
 * site everywhere (server-rendered + client) without needing a `?dumb=`
 * string in the URL. Set it back to `false` to return to the full site.
 *
 * This is only the DEFAULT. It can still be overridden at runtime per
 * browser via `?dumb=0` / `?dumb=1` or `setDumbMode(false)` in the console.
 */
export const DUMB_MODE_DEFAULT = true
