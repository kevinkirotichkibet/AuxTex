import { Material } from './api';

// Plain wool/cotton/linen/silk are accurately represented by a flat colour
// swatch. Prints aren't — a solid block doesn't read as "Kitenge" or
// "Maasai shuka" — so these generate a small CSS-only pattern keyed off the
// material name. No images are fetched; this is pure background-image CSS.
export function swatchBackground(material: Pick<Material, 'name' | 'color'>): string {
  const name = material.name.toLowerCase();
  const c = material.color;

  if (name.includes('maasai') || name.includes('shuka')) {
    // Red/black check, evoking the classic Maasai shuka.
    return `repeating-linear-gradient(45deg, ${c} 0px, ${c} 10px, #1c1a17 10px, #1c1a17 14px), repeating-linear-gradient(-45deg, ${c} 0px, ${c} 10px, #1c1a17 10px, #1c1a17 14px)`;
  }
  if (name.includes('kitenge') || name.includes('ankara')) {
    // Bold repeating sunburst dots.
    return `repeating-radial-gradient(circle at 8px 8px, ${c} 0px, ${c} 5px, #1c1a17 5px, #1c1a17 6px, transparent 6px, transparent 16px)`;
  }
  if (name.includes('kente')) {
    // Multi-colour horizontal bands.
    return `repeating-linear-gradient(0deg, ${c} 0px 6px, #1c1a17 6px 9px, #2f6690 9px 15px, #b1272c 15px 18px)`;
  }
  if (name.includes('kikoy')) {
    // Simple horizontal stripe.
    return `repeating-linear-gradient(0deg, ${c} 0px 10px, #ffffff 10px 14px)`;
  }
  return c;
}
