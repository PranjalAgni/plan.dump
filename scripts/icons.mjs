/**
 * Renders the PWA icon set from the single logo SVG, so there is one source of truth for
 * the mark. Re-run after changing src/lib/assets/logo.svg:
 *
 *   node scripts/icons.mjs
 */
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';

const OUT = 'static/icons';
const CREAM = '#faf9f5';
const RUST = '#aa3500';

// The file carries intrinsic dimensions so it renders predictably as an <img> elsewhere;
// here we want it to fill whatever box we give it instead.
const logo = (await readFile('src/lib/assets/logo.svg', 'utf8')).replace(
	/\swidth="\d+"\s+height="\d+"/,
	' width="100%" height="100%"'
);

/**
 * `inset` is the share of the square left empty around the mark. Maskable icons need a
 * generous margin because the platform crops them to whatever shape it likes — Android
 * can take a circle inscribed in the middle 80%, and anything outside gets cut.
 */
const ICONS = [
	{ file: 'icon-192.png', size: 192, background: CREAM, inset: 0.1 },
	{ file: 'icon-512.png', size: 512, background: CREAM, inset: 0.1 },
	{ file: 'icon-maskable-512.png', size: 512, background: RUST, inset: 0.26, invert: true },
	{ file: 'apple-touch-icon.png', size: 180, background: CREAM, inset: 0.12 }
];

await mkdir(OUT, { recursive: true });

const browser = await chromium.launch();

for (const { file, size, background, inset, invert } of ICONS) {
	const page = await browser.newPage({
		viewport: { width: size, height: size },
		deviceScaleFactor: 1
	});

	await page.setContent(
		`<!doctype html><html><body style="margin:0;width:${size}px;height:${size}px;
			background:${background};display:flex;align-items:center;justify-content:center">
			<div style="width:${Math.round(size * (1 - inset * 2))}px;
				${invert ? 'filter:brightness(0) invert(1);' : ''}">${logo}</div>
		</body></html>`
	);

	await page.screenshot({ path: `${OUT}/${file}`, omitBackground: false });
	console.log(`${OUT}/${file} (${size}px)`);
	await page.close();
}

await browser.close();
