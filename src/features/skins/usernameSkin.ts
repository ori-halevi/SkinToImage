import type { SkinModel } from './types';

export const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,16}$/;

export type UsernameErrorCode = 'invalid-username' | 'user-not-found' | 'network';

export class UsernameSkinError extends Error {
  constructor(readonly code: UsernameErrorCode) {
    super(code);
  }
}

export interface RemoteSkin {
  username: string;
  blob: Blob;
  /** Known when the profile service reports it; otherwise detected from pixels. */
  model?: SkinModel;
}

interface PlayerDbResponse {
  success: boolean;
  code: string;
  data?: {
    player?: {
      username: string;
      skin_texture?: string;
      properties?: { name: string; value: string }[];
    };
  };
}

/** Reads the skin URL and model from the (base64 JSON) "textures" profile property. */
export function parseTexturesProperty(value: string): { url?: string; model: SkinModel } {
  try {
    const json = JSON.parse(atob(value)) as { textures?: { SKIN?: { url?: string; metadata?: { model?: string } } } };
    const skin = json.textures?.SKIN;
    return { url: skin?.url?.replace(/^http:/, 'https:'), model: skin?.metadata?.model === 'slim' ? 'slim' : 'classic' };
  } catch {
    return { model: 'classic' };
  }
}

async function fetchImage(url: string, fetcher: typeof fetch): Promise<Blob | null> {
  const response = await fetcher(url);
  if (!response.ok) return null;
  const blob = await response.blob();
  return blob.type.startsWith('image/') ? blob : null;
}

/**
 * Looks up a Java Edition player's skin. Tries a profile service first (exact name + model),
 * then an image mirror as a fallback. Only the username is sent to these services.
 */
export async function fetchSkinByUsername(input: string, fetcher: typeof fetch = fetch): Promise<RemoteSkin> {
  const username = input.trim();
  if (!USERNAME_PATTERN.test(username)) throw new UsernameSkinError('invalid-username');

  let sawNotFound = false;

  try {
    const response = await fetcher(`https://playerdb.co/api/player/minecraft/${encodeURIComponent(username)}`);
    const body = (await response.json()) as PlayerDbResponse;
    const player = body.data?.player;
    if (body.success && player) {
      const textures = player.properties?.find((p) => p.name === 'textures');
      const parsed = textures ? parseTexturesProperty(textures.value) : { model: 'classic' as SkinModel, url: undefined };
      const url = parsed.url ?? player.skin_texture;
      if (url) {
        const blob = await fetchImage(url, fetcher);
        if (blob) return { username: player.username, blob, model: textures ? parsed.model : undefined };
      }
    } else if (body.code === 'minecraft.invalid_username' || body.code === 'player.not_found') {
      sawNotFound = true;
    }
  } catch {
    // Fall through to the mirror.
  }

  try {
    const blob = await fetchImage(`https://minotar.net/skin/${encodeURIComponent(username)}`, fetcher);
    if (blob) return { username, blob };
    sawNotFound = true;
  } catch {
    // Network failure on both services.
  }

  throw new UsernameSkinError(sawNotFound ? 'user-not-found' : 'network');
}
