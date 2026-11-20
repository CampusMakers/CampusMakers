import { before, after, afterEach, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createElement } from 'react';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { createServer } from 'vite';

const listingName = 'Campus Test Mug';
const listingDescription = 'Hand-thrown stoneware mug with a blue glaze.';
const listing = {
    id: 987654,
    post_type: 'listing',
    creator: '@campus_test_maker',
    name: listingName,
    caption: listingName,
    description: listingDescription,
    category: 'Ceramics',
    price: 28,
    created_at: '2026-01-01T00:00:00.000Z'
};
let dom;
let server;
let App;
let render;
let screen;
let within;
let cleanup;
let userEvent;

function seedPublishedListing() {
    dom.window.localStorage.setItem('campusMakersCelestePreview', JSON.stringify({
        maker_posts: [listing]
    }));
}

before(async () => {
    dom = new JSDOM('<!doctype html><html><body></body></html>', {
        url: 'http://localhost/#home'
    });
    for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'MutationObserver', 'getComputedStyle', 'localStorage']) {
        Object.defineProperty(globalThis, key, {
            configurable: true,
            value: key === 'getComputedStyle'
                ? dom.window.getComputedStyle.bind(dom.window)
                : dom.window[key]
        });
    }
    dom.window.scrollTo = () => {};
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    ({ render, screen, within, cleanup } = await import('@testing-library/react'));
    ({ default: userEvent } = await import('@testing-library/user-event'));
    server = await createServer({
        root: fileURLToPath(new URL('..', import.meta.url)),
        server: { middlewareMode: true, ws: false },
        appType: 'custom',
        optimizeDeps: { noDiscovery: true, include: [] }
    });
    ({ default: App } = await server.ssrLoadModule('/src/App.jsx'));
});

afterEach(() => {
    cleanup?.();
    dom?.window.localStorage.clear();
});

after(async () => {
    await server?.close();
    dom?.window.close();
});

test('buyer opens a published preview listing from Home and sees its product details', async () => {
    dom.window.location.hash = '#home';
    seedPublishedListing();
    render(createElement(App));
    const user = userEvent.setup();
    const home = await screen.findByRole('main', { name: 'Home page' });
    const card = await within(home).findByRole('link', { name: /Campus Test Mug/ });
    assert.ok(card);

    await user.click(card);

    const detail = await screen.findByRole('main', { name: 'Explore page' });
    assert.ok(within(detail).getByRole('heading', { name: listingName, level: 2 }));
    assert.ok(within(detail).getByText(listingDescription));
    assert.ok(within(detail).getByText('Ceramics'));
    assert.ok(within(detail.querySelector('.explore-post-detail')).getByText('$28.00'));
    assert.ok(within(detail).getByRole('button', { name: /Back to Home/ }));
});

test('buyer opens the same published preview listing from Explore and sees its product details', async () => {
    dom.window.location.hash = '#explore';
    seedPublishedListing();
    render(createElement(App));
    const user = userEvent.setup();
    const explore = await screen.findByRole('main', { name: 'Explore page' });
    await user.click(within(explore).getByRole('button', { name: 'Filter' }));
    await user.click(within(explore).getByRole('button', { name: 'Products' }));
    const card = await within(explore).findByRole('link', { name: /Campus Test Mug/ });
    assert.ok(card);

    await user.click(card);

    const detail = await screen.findByRole('main', { name: 'Explore page' });
    assert.ok(within(detail).getByRole('heading', { name: listingName, level: 2 }));
    assert.ok(within(detail).getByText(listingDescription));
    assert.ok(within(detail).getByText('Ceramics'));
    assert.ok(within(detail.querySelector('.explore-post-detail')).getByText('$28.00'));
    assert.ok(within(detail).getByRole('button', { name: /Back to Explore/ }));
});
