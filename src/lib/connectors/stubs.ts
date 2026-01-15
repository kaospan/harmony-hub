/**
 * Stub connectors for providers not yet implemented
 * These return empty results but maintain the connector interface
 */

import {
  ProviderConnector,
  NormalizedTrack,
  SearchOptions,
} from './base';
import { ProviderLink, MusicProvider } from '@/types';

/**
 * Generic stub connector for providers not yet implemented
 */
class StubConnector implements ProviderConnector {
  readonly enabled = false;

  constructor(public readonly name: MusicProvider) {}

  async searchTracks(options: SearchOptions): Promise<NormalizedTrack[]> {
    console.warn(`${this.name} connector not implemented, returning empty results`);
    return [];
  }

  async resolveLinks(providerTrackId: string): Promise<ProviderLink> {
    return {
      provider: this.name,
      provider_track_id: providerTrackId,
      url_web: undefined,
      url_app: undefined,
      url_preview: undefined,
    };
  }

  async checkHealth(): Promise<boolean> {
    return false;
  }
}

export class AppleMusicConnector extends StubConnector {
  constructor() {
    super('apple_music');
  }
}

export class DeezerConnector extends StubConnector {
  constructor() {
    super('deezer');
  }
}

export class SoundCloudConnector extends StubConnector {
  constructor() {
    super('soundcloud');
  }
}

export class AmazonMusicConnector extends StubConnector {
  constructor() {
    super('amazon_music');
  }
}
