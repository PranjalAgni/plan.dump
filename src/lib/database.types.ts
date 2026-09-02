/**
 * Hand-written to match supabase/migrations until a Supabase project exists.
 * Regenerate with `pnpm db:types` once the project is linked, then delete this notice.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type PlanVibe = 'chill' | 'active' | 'food' | 'movie' | 'music' | 'outdoors';
export type PlanVisibility = 'public' | 'private';

export type Database = {
	public: {
		Tables: {
			profiles: {
				Row: {
					id: string;
					display_name: string;
					avatar_url: string | null;
					last_seen_at: string;
					show_presence: boolean;
					created_at: string;
				};
				Insert: {
					id: string;
					display_name: string;
					avatar_url?: string | null;
					last_seen_at?: string;
					show_presence?: boolean;
					created_at?: string;
				};
				Update: {
					display_name?: string;
					avatar_url?: string | null;
					last_seen_at?: string;
					show_presence?: boolean;
				};
				Relationships: [
					{
						foreignKeyName: 'profiles_id_fkey';
						columns: ['id'];
						isOneToOne: true;
						referencedRelation: 'users';
						referencedColumns: ['id'];
					}
				];
			};
			plans: {
				Row: {
					id: string;
					creator_id: string;
					body_text: string | null;
					audio_path: string | null;
					audio_mime: string | null;
					audio_duration_ms: number | null;
					audio_peaks: number[] | null;
					transcript: string | null;
					vibe: PlanVibe;
					visibility: PlanVisibility;
					starts_at: string;
					created_at: string;
				};
				Insert: {
					id?: string;
					creator_id: string;
					body_text?: string | null;
					audio_path?: string | null;
					audio_mime?: string | null;
					audio_duration_ms?: number | null;
					audio_peaks?: number[] | null;
					transcript?: string | null;
					vibe: PlanVibe;
					visibility?: PlanVisibility;
					starts_at: string;
					created_at?: string;
				};
				Update: {
					body_text?: string | null;
					transcript?: string | null;
					vibe?: PlanVibe;
					visibility?: PlanVisibility;
					starts_at?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'plans_creator_id_fkey';
						columns: ['creator_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
			plan_participants: {
				Row: {
					plan_id: string;
					user_id: string;
					created_at: string;
				};
				Insert: {
					plan_id: string;
					user_id: string;
					created_at?: string;
				};
				Update: {
					plan_id?: string;
					user_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: 'plan_participants_plan_id_fkey';
						columns: ['plan_id'];
						isOneToOne: false;
						referencedRelation: 'plans';
						referencedColumns: ['id'];
					},
					{
						foreignKeyName: 'plan_participants_user_id_fkey';
						columns: ['user_id'];
						isOneToOne: false;
						referencedRelation: 'profiles';
						referencedColumns: ['id'];
					}
				];
			};
		};
		Views: Record<never, never>;
		Functions: {
			touch_last_seen: {
				Args: Record<string, never>;
				Returns: undefined;
			};
		};
		Enums: {
			plan_vibe: PlanVibe;
			plan_visibility: PlanVisibility;
		};
		CompositeTypes: Record<never, never>;
	};
};
