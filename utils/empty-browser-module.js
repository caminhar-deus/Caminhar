/**
 * Empty stand-in for Node.js built-ins (`fs`, `path`, `url`, `crypto`) when they
 * are resolved for the BROWSER bundle.
 *
 * Referenced by `turbopack.resolveAlias` in `next.config.js`: a client-side
 * import of one of those built-ins resolves here instead of failing the bundle
 * with "Module not found". Server-side code keeps using the real built-ins —
 * only the `browser` condition is aliased.
 *
 * This is deliberately NOT load-bearing: nothing in the client bundle imports
 * these aliases today (see the honest note in `next.config.js`). Keep it empty.
 */
export {};
