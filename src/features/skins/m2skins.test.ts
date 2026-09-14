import { describe, expect, it } from 'vitest';
import { isHatLayerFullyOpaque, legacyUpgradeCopies } from './legacySkin';
import { fetchSkinByUsername, parseTexturesProperty, UsernameSkinError } from './usernameSkin';

describe('legacyUpgradeCopies', () => {
  it('fills the left arm and leg regions from the right ones, swapping side faces', () => {
    const copies = legacyUpgradeCopies();
    expect(copies).toHaveLength(12);
    // Left leg's "right" face (x=16,y=52) comes from the right leg's "left" face (x=8,y=20).
    expect(copies).toContainEqual({ from: [8, 20, 4, 12], to: [16, 52, 4, 12] });
    // Left arm's front (x=36,y=52) comes from the right arm's front (x=44,y=20).
    expect(copies).toContainEqual({ from: [44, 20, 4, 12], to: [36, 52, 4, 12] });
    // Every destination is inside the bottom half that 64×32 skins lack.
    for (const { to } of copies) expect(to[1]).toBeGreaterThanOrEqual(48);
  });
});

describe('isHatLayerFullyOpaque', () => {
  it('is true only when no hat pixel is transparent', () => {
    expect(isHatLayerFullyOpaque(() => 255, 1)).toBe(true);
    expect(isHatLayerFullyOpaque((x, y) => (x === 40 && y === 8 ? 0 : 255), 1)).toBe(false);
    expect(isHatLayerFullyOpaque((x, y) => (x === 80 && y === 20 ? 0 : 255), 2)).toBe(false);
  });
});

const png = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], { type: 'image/png' });
const texturesValue = btoa(JSON.stringify({ textures: { SKIN: { url: 'http://textures.example/abc', metadata: { model: 'slim' } } } }));

function fakeFetch(routes: Record<string, () => Response | Promise<Response>>): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const route = Object.entries(routes).find(([prefix]) => url.startsWith(prefix));
    if (!route) throw new TypeError(`unexpected fetch ${url}`);
    return route[1]();
  }) as typeof fetch;
}

const json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

describe('parseTexturesProperty', () => {
  it('reads url (upgraded to https) and slim model', () => {
    expect(parseTexturesProperty(texturesValue)).toEqual({ url: 'https://textures.example/abc', model: 'slim' });
  });
  it('defaults to classic on garbage', () => expect(parseTexturesProperty('%%%')).toEqual({ model: 'classic' }));
});

describe('fetchSkinByUsername', () => {
  it('rejects invalid usernames without any request', async () => {
    const fetcher = fakeFetch({});
    await expect(fetchSkinByUsername('a b', fetcher)).rejects.toMatchObject({ code: 'invalid-username' });
  });

  it('uses the profile service and its exact name + model', async () => {
    const fetcher = fakeFetch({
      'https://playerdb.co/': () => json({ success: true, code: 'player.found', data: { player: { username: 'Notch', properties: [{ name: 'textures', value: texturesValue }] } } }),
      'https://textures.example/': () => new Response(png),
    });
    const skin = await fetchSkinByUsername(' notch ', fetcher);
    expect(skin.username).toBe('Notch');
    expect(skin.model).toBe('slim');
  });

  it('falls back to the image mirror when the profile service fails', async () => {
    const fetcher = fakeFetch({
      'https://playerdb.co/': () => {
        throw new TypeError('offline');
      },
      'https://minotar.net/': () => new Response(png),
    });
    const skin = await fetchSkinByUsername('Steve', fetcher);
    expect(skin.username).toBe('Steve');
    expect(skin.model).toBeUndefined();
  });

  it('reports unknown players', async () => {
    const fetcher = fakeFetch({
      'https://playerdb.co/': () => json({ success: false, code: 'minecraft.invalid_username' }),
      'https://minotar.net/': () => new Response('not found', { status: 404 }),
    });
    await expect(fetchSkinByUsername('nobody_here', fetcher)).rejects.toBeInstanceOf(UsernameSkinError);
    await expect(fetchSkinByUsername('nobody_here', fetcher)).rejects.toMatchObject({ code: 'user-not-found' });
  });

  it('reports network failures separately', async () => {
    const fail = () => {
      throw new TypeError('offline');
    };
    const fetcher = fakeFetch({ 'https://playerdb.co/': fail, 'https://minotar.net/': fail });
    await expect(fetchSkinByUsername('Steve', fetcher)).rejects.toMatchObject({ code: 'network' });
  });
});
