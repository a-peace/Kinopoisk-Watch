// ==UserScript==
// @name            Kinopoisk Watch
// @namespace       kinopoisk-watch
// @author          peace
// @description     Watch movies on IMDB, TMDB, Kinopoisk and Letterboxd!
// @version         3.3.6
// @icon            https://github.com/a-peace/Kinopoisk-Watch/raw/main/assets/favicon.png
// @updateURL       https://github.com/a-peace/Kinopoisk-Watch/raw/main/userscript/tape-operator.user.js
// @downloadURL     https://github.com/a-peace/Kinopoisk-Watch/raw/main/userscript/tape-operator.user.js
// @run-at          document-idle
// @grant           GM.info
// @grant           GM.setValue
// @grant           GM.getValue
// @grant           GM.openInTab
// @grant           GM.deleteValue
// @match           *://www.kinopoisk.ru/*
// @match           *://shiki.one/animes/*
// @match           *://hd.kinopoisk.ru/*
// @match           *://*.imdb.com/title/*
// @match           *://www.themoviedb.org/movie/*
// @match           *://www.themoviedb.org/tv/*
// @match           *://letterboxd.com/film/*
// @match           *://tapeop.dev/*
// ==/UserScript==
// original author  https://github.com/Kirlovon/Tape-Operator

(function () {
	// Current version of the script
	const VERSION = GM.info?.script?.version;

	// Banner image
	const BANNER_IMAGE = `
	<svg width="100%" height="100%" viewBox="0 0 128 512" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xml:space="preserve" xmlns:serif="http://www.serif.com/" style="fill-rule:evenodd;clip-rule:evenodd;stroke-linejoin:round;stroke-miterlimit:2;">
		<path id="Banner" d="M128,0L0,0L0,512L64,480L128,512L128,0Z" style="fill:url(#bg);"/>
		<g id="icon" transform="matrix(1,0,0,1,-64,0)">
			<path d="M168,382C168,360.057 149.943,342 128,342C106.057,342 88,360.057 88,382C88,403.943 106.057,422 128,422L165,422L168,410L162,410L160,414L152,414C162.065,406.452 168,394.581 168,382ZM96,382C96,364.445 110.445,350 128,350C145.555,350 160,364.445 160,382C160,399.555 145.555,414 128,414C110.445,414 96,399.555 96,382ZM128,393C132.415,393 136,396.585 136,401C136,405.415 132.415,409 128,409C123.585,409 120,405.415 120,401C120,396.585 123.585,393 128,393ZM144,383C148.415,383 152,386.585 152,391C152,395.415 148.415,399 144,399C139.585,399 136,395.415 136,391C136,386.585 139.585,383 144,383ZM112,383C116.415,383 120,386.585 120,391C120,395.415 116.415,399 112,399C107.585,399 104,395.415 104,391C104,386.585 107.585,383 112,383ZM144,365C148.415,365 152,368.585 152,373C152,377.415 148.415,381 144,381C139.585,381 136,377.415 136,373C136,368.585 139.585,365 144,365ZM112,365C116.415,365 120,368.585 120,373C120,377.415 116.415,381 112,381C107.585,381 104,377.415 104,373C104,368.585 107.585,365 112,365ZM128,355C132.415,355 136,358.585 136,363C136,367.415 132.415,371 128,371C123.585,371 120,367.415 120,363C120,358.585 123.585,355 128,355Z" style="fill:rgb(235,255,255);fill-rule:nonzero;"/>
		</g>
		<defs>
			<linearGradient id="bg" x1="0" y1="0" x2="1" y2="0" gradientUnits="userSpaceOnUse" gradientTransform="matrix(128,512,-2048,512,0,0)"><stop offset="0" style="stop-color:rgb(248,12,101);stop-opacity:1"/><stop offset="1" style="stop-color:rgb(247,88,27);stop-opacity:1"/></linearGradient>
		</defs>
	</svg>
	`;
	// URL to the player
	const KINO_PLAYER_URL = 'https://kinopoisk.plus/film/';
	const SHIKI_PLAYER_URL = 'https://kinops.web.app/shikimori/';
	const OTHER_PLAYER_URL = 'https://tapeop.dev/';
	// .cx
	// .fun
	// sspoisk.ru/film/

	// ID of the banner, attached to the page
	const BANNER_ID = 'kinopoisk-watch-banner';

	// URL Matchers
	const KINOPOISK_MATCHER = /kinopoisk\.ru\/(film|series)\/.*/;
	const IMDB_MATCHER = /imdb\.com\/title\/tt\.*/;
	const TMDB_MATCHER = /themoviedb\.org\/(movie|tv)\/\.*/;
	const LETTERBOXD_MATCHER = /letterboxd\.com\/film\/\.*/;
	const SHIKI_MATCHER = /shiki\.one\/animes\/\.*/;
	const MATCHERS = [KINOPOISK_MATCHER, IMDB_MATCHER, TMDB_MATCHER, LETTERBOXD_MATCHER, SHIKI_MATCHER];

	// Logging utility
	const logger = {
		info: (...args) => console.info('[Tape Operator Script]', ...args),
		warn: (...args) => console.warn('[Tape Operator Script]', ...args),
		error: (...args) => console.error('[Tape Operator Script]', ...args),
	}

	let previousUrl = '/';

	/**
	 * Initialize banner on the page
	 */
	async function initBanner() {
		const observer = new MutationObserver(() => updateBanner());
		observer.observe(document, { subtree: true, childList: true });
		updateBanner();
	}

	/**
	 * Update banner based on the current movie data on page
	 */
	function updateBanner() {
		const url = getCurrentURL();

		// Skip to prevent unnecessary updates
		if (url === previousUrl) return;

		// Check if URL matches
		const urlMatches = MATCHERS.some((matcher) => url.match(matcher));
		if (!urlMatches) return removeBanner();

		// Check if title is present
		const extractedTitle = extractTitle();
		if (!extractedTitle) return removeBanner();

		// Movie found, now we can stop searching
		previousUrl = url;
		attachBanner();
	}

	/**
	 * Extract movie data from the page
	 */
	function extractMovieData() {
		const url = getCurrentURL();

		// Movie title
		const title = extractTitle();
		if (!title) return null;

		// Kinopoisk ID
		if (url.match(KINOPOISK_MATCHER)) {

			// If its a Kinopoisk HD page
			if (url.includes('hd.kinopoisk.ru')) {
				try {
					const element = document.getElementById('__NEXT_DATA__');
					const jsonData = JSON.parse(element.innerText);
					const apolloState = Object.values(jsonData?.props?.pageProps?.apolloState?.data || {});

					const id = apolloState.find((item) => item?.__typename === 'TvSeries' || item?.__typename === 'Film')?.id;
					if (!id) throw new Error('No ID was found in the page data');

					return { kinopoisk: id, title };
				} catch (error) {
					console.error('Failed to extract ID from Kinopoisk HD page:', error);
					return null;
				}
			}

			const id = url.split('/').at(4);
			return { kinopoisk: id, title };
		}

		// IMDB ID
		if (url.match(IMDB_MATCHER)) {
			const seriesBlock = document.querySelector('a[data-testid="hero-title-block__series-link"]');

			// In case of opened episode of the series, get ID from "Go back to series" link
			if (seriesBlock) {
				const id = seriesBlock.href.split('/').at(4);
				return { imdb: id, title };
			}

			const id = url.split('/').at(4);
			return { imdb: id, title };
		}

		// TMDB ID
		if (url.match(TMDB_MATCHER)) {
			const id = url.split('/').at(4).split('-').at(0);
			return { tmdb: id, title };
		}

		// SHIKI ID
		if (url.match(SHIKI_MATCHER)) {
			const seriesBlock = document.querySelector('div.kinopoisk > a');

			if (seriesBlock) {
				const id = seriesBlock.href.split('/').at(4);
				if (id) return {kinopoisk: id, title}
			}

			const id = url.split('/').at(4).split('-').at(0);
			return { shikiId: id, title };
		}

		// IMDB ID from Letterboxd
		if (url.match(LETTERBOXD_MATCHER)) {
			const elements = document.querySelectorAll('a');
			const elementsArray = Array.from(elements);

			// Find IMDB ID
			const imdbLink = elementsArray.find((link) => link?.href?.match(IMDB_MATCHER));
			if (imdbLink) {
				const imdbId = imdbLink.href.split('/').at(4);
				if (imdbId) return { imdb: imdbId, title };
			}

			// Find TMDB ID
			const tmdbLink = elementsArray.find((link) => link?.href?.match(TMDB_MATCHER));
			if (tmdbLink) {
				const tmdbId = tmdbLink.href.split('/').at(4)?.split('-')?.at(0);
				if (tmdbId) return { tmdbId: tmdbId, title };
			}

			return null;
		}

		return null;
	}

	/**
	 * Get current URL.
	 * @returns {string} Current url without query parameters and hashes.
	 */
	function getCurrentURL() {
		return location.origin + location.pathname;
	}

	/**
	 * Extract movie title from the page
	 * @returns {string} The extracted title
	 */
	function extractTitle() {
		try {
			const titleElement = document.querySelector('meta[property="og:title"]') || document.querySelector('meta[name="twitter:title"]');
			if (!titleElement) return null;

			const title = titleElement?.content?.trim();
			if (!title) return null;

			// Skip default Kinopoisk title
			if (title.startsWith('Кинопоиск.')) return null;

			// Remove addition attachments on Kinopoisk HD
			if (title.includes('— смотреть онлайн в хорошем качестве — Кинопоиск')) {
				return title.replace('— смотреть онлайн в хорошем качестве — Кинопоиск', '').trim();
			}

			// Remove title attachment from IMDB
			if (title.includes('⭐')) {
				return title.split('⭐').at(0).trim();
			}

			// Any other IMDB attachment
			if (title.endsWith('- IMDb') && title.includes(')')) {
				const lastParenthesisIndex = title.lastIndexOf(')');
				return title.slice(0, lastParenthesisIndex + 1).trim();
			}

			return title;
		} catch (error) {
			return null;
		}
	}

	/**
	 * Add banner element to the page
	 */
	function attachBanner() {
		if (document.getElementById(BANNER_ID)) return;

		const banner = document.createElement('a');
		banner.target = '_blank';
		banner.id = BANNER_ID;
		banner.innerHTML = BANNER_IMAGE;
		banner.style.width = '32px';
		banner.style.height = '128px';
		banner.style.top = '-128px';
		banner.style.left = '8px';
		banner.style.outline = 'none';
		banner.style.cursor = 'pointer';
		banner.style.position = 'fixed';
		banner.style.zIndex = '9999999999';
		banner.style.transition = 'top 0.2s ease';

		// security
		banner.rel = 'noopener noreferrer nofollow';

		// Show with delay
		setTimeout(() => { banner.style.top = '-32px' }, 300);

		document.body.appendChild(banner);

		// Events
		banner.addEventListener('mouseover', () => (banner.style.top = '-12px'));
		banner.addEventListener('mouseout', () => (banner.style.top = '-24px'));
		banner.addEventListener('click', () => openPlayer());
		banner.addEventListener('mousedown', (event) => event.button === 1 && openPlayer(true));

		setTimeout(() => {
			banner.style.top = '-24px';
			banner.style.opacity = '1';
		}, 300);

		document.body.appendChild(banner);
	}

	/**
	 * Remove banner from the page
	 */
	function removeBanner() {
		document.getElementById(BANNER_ID)?.remove();
	}

	/**
	 * Open player with the extracted data
	 * @param {boolean} loadInBackground If true, page will be opened in background
	 */
	async function openPlayer(loadInBackground = false) {
		const data = extractMovieData();
		if (!data) return logger.error('Failed to extract movie data');

		await GM.setValue('movie-data', data);

        let link;
        if (data?.kinopoisk) {
            const url = new URL(KINO_PLAYER_URL);
            url.pathname += data.kinopoisk;
            link = url.toString();
        } else if (data?.shikiId) {
			const url = new URL(SHIKI_PLAYER_URL);
            url.pathname += data.shikiId;
            link = url.toString();
		} else {
            link = OTHER_PLAYER_URL;
        }


		logger.info('Opening player for movie', data, link);
		GM.openInTab(link, loadInBackground);
	}

	/**
	 * Init player with the extracted data.
	 * Executed on the player page only.
	 */
	async function initPlayer() {
		const data = await GM.getValue('movie-data', {});
		await GM.deleteValue('movie-data');

		// Skip initialization if no data
		if (!data || Object.keys(data).length === 0) return;

		// Stringify data twice to prevent XSS and automatically escape quotes
		const dataSerialized = JSON.stringify(JSON.stringify(data));
		const versionSerialized = JSON.stringify(VERSION);

		// Inject data to the player
		const scriptElement = document.createElement('script');
		scriptElement.innerHTML = `globalThis.init(JSON.parse(${dataSerialized}), ${versionSerialized});`;
		document.body.appendChild(scriptElement);

		logger.info('Injected movie data:', data);
	}

	// Init player or banner
	logger.info('Script executed');
	(location.href.includes(KINO_PLAYER_URL) || location.href.includes(OTHER_PLAYER_URL)) ? initPlayer() : initBanner();
})();
