import { describe, expect, it } from 'vitest';
import { initialsOf, sizedAvatarUrl } from './avatar';

describe('sizedAvatarUrl', () => {
	it('replaces an existing size directive, keeping the crop flag', () => {
		expect(sizedAvatarUrl('https://lh3.googleusercontent.com/a/ACg8oc=s96-c', 128)).toBe(
			'https://lh3.googleusercontent.com/a/ACg8oc=s128-c'
		);
	});

	it('replaces a size directive that has no crop flag', () => {
		expect(sizedAvatarUrl('https://lh3.googleusercontent.com/a/ACg8oc=s96', 128)).toBe(
			'https://lh3.googleusercontent.com/a/ACg8oc=s128'
		);
	});

	it('appends a directive when Google gave us a bare URL', () => {
		expect(sizedAvatarUrl('https://lh3.googleusercontent.com/a/ACg8oc', 128)).toBe(
			'https://lh3.googleusercontent.com/a/ACg8oc=s128-c'
		);
	});

	it('rounds up to a bucket so near-identical sizes share a single URL', () => {
		const bare = 'https://lh3.googleusercontent.com/a/ACg8oc';
		// The four sizes the app asks for, doubled for retina: 28, 40, 44 and 56 CSS px.
		expect(sizedAvatarUrl(bare, 56)).toBe(`${bare}=s64-c`);
		expect(sizedAvatarUrl(bare, 80)).toBe(`${bare}=s128-c`);
		expect(sizedAvatarUrl(bare, 88)).toBe(`${bare}=s128-c`);
		expect(sizedAvatarUrl(bare, 112)).toBe(`${bare}=s128-c`);
	});

	it('clamps past the largest bucket rather than dropping the directive', () => {
		expect(sizedAvatarUrl('https://lh3.googleusercontent.com/a/ACg8oc', 999)).toBe(
			'https://lh3.googleusercontent.com/a/ACg8oc=s256-c'
		);
	});

	it('leaves non-Google URLs untouched', () => {
		const other = 'https://example.com/avatar.png?size=96';
		expect(sizedAvatarUrl(other, 80)).toBe(other);
	});
});

describe('initialsOf', () => {
	it('takes the first letter of the first two words', () => {
		expect(initialsOf('Alex Chen')).toBe('AC');
		expect(initialsOf('Sam Taylor Jones')).toBe('ST');
	});

	it('handles a single name', () => {
		expect(initialsOf('Pranjal')).toBe('P');
	});

	it('collapses extra whitespace', () => {
		expect(initialsOf('  Alex   Chen  ')).toBe('AC');
	});

	it('falls back to a placeholder for an empty name', () => {
		expect(initialsOf('   ')).toBe('?');
	});

	it('keeps accented letters whole', () => {
		expect(initialsOf('José Álvarez')).toBe('JÁ');
	});

	it('keeps a Devanagari cluster whole rather than orphaning its combining marks', () => {
		// Slicing by code point here would yield a bare "प" and drop the conjunct.
		expect(initialsOf('प्रांजल अग्निहोत्री')).toBe('प्रांअ');
	});

	it('keeps an emoji ZWJ sequence whole instead of splitting it', () => {
		expect(initialsOf('👩‍🚀 Nova')).toBe('👩‍🚀N');
	});
});
