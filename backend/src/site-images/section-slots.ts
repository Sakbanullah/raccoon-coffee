/**
 * Allowed landing-page sections and the slots each one supports.
 *
 * Single source of truth for both DTO validation and the service's
 * replace-vs-append behavior. Anything not listed here is rejected, so an
 * admin cannot create arbitrary sections or slots.
 */
export const SECTION_SLOTS = {
  // Single-image sections: one record per slot, replaced in place.
  hero: ['primary', 'secondary'],
  brand_story: ['primary', 'secondary'],
  // Multi-image gallery section: many records per slot.
  atmosphere: ['gallery'],
} as const;

export type SectionKey = keyof typeof SECTION_SLOTS;

export const SECTION_KEYS = Object.keys(SECTION_SLOTS) as SectionKey[];

/** Every slot name used by any section (L-6): the DTO-level allowlist. */
export const SLOT_KEYS: string[] = [...new Set(Object.values(SECTION_SLOTS).flat())];

/** Sections where a slot holds exactly one image. */
export const SINGLE_SLOT_SECTIONS: SectionKey[] = ['hero', 'brand_story'];

export function isValidSection(value: unknown): value is SectionKey {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(SECTION_SLOTS, value);
}

export function isValidSlot(section: unknown, slot: unknown): boolean {
  if (!isValidSection(section) || typeof slot !== 'string') return false;
  return (SECTION_SLOTS[section] as readonly string[]).includes(slot);
}

export function isSingleSlotSection(section: SectionKey): boolean {
  return SINGLE_SLOT_SECTIONS.includes(section);
}
