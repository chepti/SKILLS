export const FPS = 30;

/*
 * SET FROM THE MUSIC ANALYSIS (scripts/analyze_music.py):
 *   BEAT  = beat period in seconds
 *   FIRST = time of the first beat in seconds
 * Then place every scene start on a beat, choosing beats near the track's energy rises.
 */
export const BEAT = 0.75;
export const FIRST = 0.45;
export const beat = (n: number) => Math.round((FIRST + n * BEAT) * FPS);

// Scene start frames — rename/add per script. Keys are only labels.
export const S = {
  open: 0,
  demo: beat(8),
  outro: beat(20),
};

export const TOTAL = beat(28);
