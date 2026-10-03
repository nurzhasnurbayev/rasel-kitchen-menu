// @ts-check
/*
 * Progressive enhancement for the public menu. The menu page ships no framework JavaScript
 * (`csr = false`); this file is minified and inlined at the end of the page body
 * (see enhance-script.ts). Without it everything still works: tabs are #anchor links and the
 * language switch is a plain link.
 *
 * 1. Highlights the category tab of the section on screen (IntersectionObserver) and scrolls the
 *    tab strip so that tab stays visible.
 * 2. Tapping a tab scrolls smoothly to its section (instantly with prefers-reduced-motion) without
 *    adding a history entry per tap.
 * 3. The КЗ / РУ switch remembers the choice in the `lang` cookie (read by `/`) and opens the
 *    other language at the same dish (#item-…) instead of at the top.
 *
 * Keep it small and dependency-free: it is sent with every menu page.
 */
(() => {
	const nav = /** @type {HTMLElement | null} */ (document.querySelector('[data-category-nav]'));
	const scroller = /** @type {HTMLElement | null} */ (
		document.querySelector('[data-category-scroller]')
	);
	const tabs = /** @type {HTMLAnchorElement[]} */ ([
		...document.querySelectorAll('a[data-category-tab]')
	]);
	const sections = /** @type {HTMLElement[]} */ ([
		...document.querySelectorAll('[data-category-section]')
	]);
	const menuEnd = document.querySelector('[data-menu-end]');
	const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

	/** @returns {ScrollBehavior} */
	const scrollBehavior = () => (reducedMotion.matches ? 'auto' : 'smooth');

	/** Bottom edge of the sticky bars: content above this line is hidden behind them. */
	function stickyBottom() {
		if (!nav) return 0;
		return (parseFloat(getComputedStyle(nav).top) || 0) + nav.offsetHeight;
	}

	// --- 1. Active tab -------------------------------------------------------------------------

	let activeId = '';
	/** Section chosen by tapping a tab; wins until the guest scrolls by hand. */
	let pinnedId = '';
	let atMenuEnd = false;
	/** Until the page has loaded (and jumped to any #fragment) the tab strip moves without animation. */
	let settled = false;

	/** @param {string} id */
	function setActive(id) {
		if (id === activeId) return;
		activeId = id;
		for (const tab of tabs) {
			if (tab.dataset.categoryTab === id) {
				tab.setAttribute('aria-current', 'true');
				revealTab(tab);
			} else {
				tab.removeAttribute('aria-current');
			}
		}
	}

	/** Scrolls only the tab strip (never the page) so the active tab is centred. */
	function revealTab(
		/** @type {HTMLElement} */ tab,
		/** @type {ScrollBehavior} */ behavior = settled ? scrollBehavior() : 'auto'
	) {
		if (!scroller) return;
		const left = tab.offsetLeft - (scroller.clientWidth - tab.offsetWidth) / 2;
		scroller.scrollTo({ left, behavior });
	}

	/** The section being read is the last one whose top has passed just below the sticky bars. */
	function update() {
		if (!sections.length) return;
		if (pinnedId) return setActive(pinnedId);
		if (atMenuEnd) return setActive(sections[sections.length - 1].id);

		const line = stickyBottom() + 12;
		let current = sections[0];
		for (const section of sections) {
			if (section.getBoundingClientRect().top <= line) current = section;
			else break;
		}
		setActive(current.id);
	}

	/** @type {IntersectionObserver | undefined} */
	let sectionObserver;

	function observeSections() {
		sectionObserver?.disconnect();
		// A thin band just below the sticky bars: a section entering or leaving it changes the tab.
		const top = Math.round(stickyBottom() + 12);
		const bottom = Math.max(0, window.innerHeight - top - 1);
		sectionObserver = new IntersectionObserver(update, {
			rootMargin: `-${top}px 0px -${bottom}px 0px`
		});
		for (const section of sections) sectionObserver.observe(section);
	}

	if ('IntersectionObserver' in window && nav && sections.length) {
		observeSections();

		// At the very bottom of the page the last category counts as current, even if it is too
		// short to reach the top of the screen.
		if (menuEnd) {
			new IntersectionObserver((entries) => {
				atMenuEnd = entries.some((entry) => entry.isIntersecting);
				update();
			}).observe(menuEnd);
		}

		// Rotation / resize: the observer band and the centred tab both depend on the viewport.
		let resizeTimer = 0;
		window.addEventListener('resize', () => {
			clearTimeout(resizeTimer);
			resizeTimer = window.setTimeout(() => {
				observeSections();
				update();
				const active = tabs.find((tab) => tab.dataset.categoryTab === activeId);
				if (active) revealTab(active, 'auto');
			}, 150);
		});

		// Fragment scrolls (#item-12 after a language switch) and back/forward cache restores.
		window.addEventListener('load', () => {
			update();
			requestAnimationFrame(() => (settled = true));
		});
		window.addEventListener('pageshow', update);
		window.addEventListener('hashchange', update);

		// Scrolling by hand releases a tab that was tapped.
		for (const type of ['wheel', 'touchstart', 'keydown']) {
			window.addEventListener(type, () => (pinnedId = ''), { passive: true });
		}

		update();
	}

	// --- 2. Tab taps -----------------------------------------------------------------------------

	nav?.addEventListener('click', (event) => {
		if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
		if (event.shiftKey || event.altKey) return;
		const tab =
			event.target instanceof Element ? event.target.closest('a[data-category-tab]') : null;
		const section =
			tab instanceof HTMLAnchorElement && document.getElementById(tab.dataset.categoryTab ?? '');
		if (!section) return;

		event.preventDefault();
		pinnedId = section.id;
		setActive(section.id);
		section.scrollIntoView({ behavior: scrollBehavior(), block: 'start' });
		// Move focus to the heading for keyboard and screen reader users, without a second scroll.
		section.querySelector('h2')?.focus({ preventScroll: true });
	});

	document.querySelector('[data-scroll-top]')?.addEventListener('click', (event) => {
		event.preventDefault();
		pinnedId = '';
		window.scrollTo({ top: 0, behavior: scrollBehavior() });
	});

	// --- 3. Language switch ----------------------------------------------------------------------

	/** Id of the dish (or category heading) at the top of the screen, or '' near the page top. */
	function readingPosition() {
		const line = stickyBottom();
		if (!sections.length || sections[0].getBoundingClientRect().top > line) return '';
		for (const element of document.querySelectorAll('[data-anchor]')) {
			if (element.getBoundingClientRect().bottom > line + 1) {
				return /** @type {HTMLElement} */ (element).dataset.anchor ?? '';
			}
		}
		return '';
	}

	for (const link of /** @type {NodeListOf<HTMLAnchorElement>} */ (
		document.querySelectorAll('a[data-lang-switch]')
	)) {
		link.addEventListener('click', (event) => {
			if (link.getAttribute('aria-current') === 'page') {
				event.preventDefault();
				return;
			}
			const secure = location.protocol === 'https:' ? '; Secure' : '';
			document.cookie = `lang=${link.dataset.langSwitch}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
			// Let the browser follow the link, now pointing at the same dish in the other language.
			const anchor = readingPosition();
			link.hash = anchor ? `#${anchor}` : '';
		});
	}
})();
