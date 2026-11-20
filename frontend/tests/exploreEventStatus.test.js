import { strict as assert } from 'node:assert';
import { test, before, after } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';

let server;
let PostCard;
before(async () => {
    server = await createServer({ root: new URL('..', import.meta.url).pathname, server: { middlewareMode: true, ws: false }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
    ({ PostCard } = await server.ssrLoadModule('/src/pages/Explore Page/Explore.jsx'));
});
after(async () => { await server?.close(); });

const base = { id: 'event-test', type: 'text', layout: 'wide', creator: '@maker', caption: 'Campus market', is_event: true, event_title: 'Campus market', event_status_mode: 'automatic', event_status: 'Upcoming' };
for (const [label, starts, ends] of [
    ['Upcoming', '2999-01-01', '2999-01-02'],
    ['In Progress', '2000-01-01', '2999-01-02'],
    ['Completed', '2000-01-01', '2000-01-02']
]) {
    test(`Explore event card visibly identifies ${label} events`, () => {
        const html = renderToStaticMarkup(createElement(PostCard, { post: { ...base, event_starts_at: starts, event_ends_at: ends }, onOpenPost() {}, onOpenSeller() {} }));
        assert.ok(html.includes(`>${label}</span>`), `Expected visible ${label} badge; received ${html}`);
    });
}
test('ordinary Explore posts do not display an event status badge', () => {
    const html = renderToStaticMarkup(createElement(PostCard, { post: { ...base, is_event: false }, onOpenPost() {}, onOpenSeller() {} }));
    assert.doesNotMatch(html, /event-status-badge/);
});
