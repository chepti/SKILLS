import { loadFont as loadRubik } from '@remotion/google-fonts/Rubik';
import { loadFont as loadVarela } from '@remotion/google-fonts/VarelaRound';
import { loadFont as loadPlaypen } from '@remotion/google-fonts/PlaypenSansHebrew';

/*
 * REPLACE PER PROJECT.
 * - display: bold headline face (Rubik 800-900 is a safe Hebrew default)
 * - ui: the app's own font (copy from its CSS / tailwind config)
 * - hand: optional handwritten face for paper/notes moments
 * Other Hebrew Google fonts in @remotion/google-fonts: Heebo, Assistant, SecularOne,
 * SuezOne, FrankRuhlLibre, Karantina, AmaticSC.
 */
export const display = loadRubik('normal', { weights: ['500', '700', '800', '900'], subsets: ['hebrew', 'latin'] }).fontFamily;
export const ui = loadVarela('normal', { weights: ['400'], subsets: ['hebrew', 'latin'] }).fontFamily;
export const hand = loadPlaypen('normal', { weights: ['400', '600'], subsets: ['hebrew', 'latin'] }).fontFamily;

/*
 * REPLACE PER PROJECT with the app's real tokens (CSS variables / tailwind theme)
 * plus colors sampled from the motif source (logo, printed product, brand book).
 * Keep the keys so components keep working; add more as needed.
 */
export const C = {
  bg: '#F2F4F7', // app background
  card: '#FFFFFF', // app card surface
  primary: '#2B4C9B',
  secondary: '#4A67B0',
  accent: '#F28C28', // the "energy" color: highlights, motif, wipes
  accent2: '#FFC94D', // secondary energy color
  text: '#222222',
  muted: '#8A96A3',
  ink: '#101829', // dark stage
  paper: '#F7F2E8', // warm analog background
  soft1: '#D8EEEA', // decorative pastel 1
  soft2: '#FAD9CF', // decorative pastel 2
};

export const shadow = '0 2px 12px rgba(0,0,0,0.07)';
export const bigShadow = '0 40px 80px -20px rgba(16,24,41,0.35), 0 18px 36px -18px rgba(16,24,41,0.3)';
