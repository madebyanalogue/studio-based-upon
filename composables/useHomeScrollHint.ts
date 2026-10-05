/** True after the homepage arrival, until the first slider scroll. */
export const useHomeScrollHint = () =>
  useState('home-scroll-hint', () => false)
