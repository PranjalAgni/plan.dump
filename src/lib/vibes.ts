import type { PlanVibe } from './database.types';

/**
 * The single source of truth for vibes. Exactly one is required per plan, so the compose
 * chips behave like radio buttons and every feed card always carries a tag.
 *
 * Adding a vibe means a migration (`alter type plan_vibe add value ...`) plus an entry here.
 * Class names are spelled out in full so Tailwind's scanner can see them.
 */
export const VIBES = [
	{ id: 'chill', label: 'Chill', tint: 'bg-vibe-chill', ink: 'text-vibe-chill-ink' },
	{ id: 'active', label: 'Active', tint: 'bg-vibe-active', ink: 'text-vibe-active-ink' },
	{ id: 'food', label: 'Food', tint: 'bg-vibe-food', ink: 'text-vibe-food-ink' },
	{ id: 'movie', label: 'Movie', tint: 'bg-vibe-movie', ink: 'text-vibe-movie-ink' },
	{ id: 'music', label: 'Music', tint: 'bg-vibe-music', ink: 'text-vibe-music-ink' },
	{
		id: 'outdoors',
		label: 'Outdoors',
		tint: 'bg-vibe-outdoors',
		ink: 'text-vibe-outdoors-ink'
	}
] as const satisfies ReadonlyArray<{
	id: PlanVibe;
	label: string;
	tint: string;
	ink: string;
}>;

export type Vibe = (typeof VIBES)[number];

const BY_ID = new Map<PlanVibe, Vibe>(VIBES.map((v) => [v.id, v]));

export function vibe(id: PlanVibe): Vibe {
	const found = BY_ID.get(id);
	if (!found) throw new Error(`Unknown vibe: ${id}`);
	return found;
}
