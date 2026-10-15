import { Aurora } from './glass';

/**
 * The backdrop of a page with its own shell (a form, a screen opened from a tab): the glass
 * design's warm white page with soft peach and sky-blue light, fixed while the content scrolls.
 * Put it first, so everything paints above it.
 */
export function PageBackground() {
  return <Aurora />;
}
