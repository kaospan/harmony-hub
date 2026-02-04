// Supabase Edge Function: YouTube Search (Server-Side)
// SECURITY: YouTube API key is stored server-side, never exposed to clients

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const YOUTUBE_API_KEY = Deno.env.get('YOUTUBE_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YouTubeSearchResult {
  id: {
    videoId: string;
  };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: {
      high?: { url: string };
      medium?: { url: string };
      default?: { url: string };
    };
  };
}

interface YouTubeVideoDetails {
  id: string;
  snippet: {
    title: string;
    channelTitle: string;
  };
  contentDetails: {
    duration: string;
  };
}

interface NormalizedTrack {
  title: string;
  artists: string[];
  duration_ms?: number;
  artwork_url?: string;
  provider_track_id: string;
  provider: string;
  url_web: string;
  url_app: string;
  url_preview: string;
}

function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);

  return (hours * 3600 + minutes * 60 + seconds) * 1000;
}

function normalizeTrack(
  searchResult: YouTubeSearchResult,
  details?: YouTubeVideoDetails
): NormalizedTrack {
  const videoId = searchResult.id.videoId;
  
  const fullTitle = searchResult.snippet.title;
  const parts = fullTitle.split('-').map(p => p.trim());
  
  let title = fullTitle;
  let artists = [searchResult.snippet.channelTitle];
  
  if (parts.length === 2) {
    title = parts[1];
    artists = [parts[0]];
  } else if (parts.length > 2) {
    title = parts[parts.length - 1];
    artists = [parts.slice(0, -1).join(' - ')];
  }

  const thumbnails = searchResult.snippet.thumbnails;
  const artwork_url = thumbnails.high?.url || thumbnails.medium?.url || thumbnails.default?.url;

  let duration_ms: number | undefined;
  if (details?.contentDetails.duration) {
    duration_ms = parseDuration(details.contentDetails.duration);
  }

  return {
    title,
    artists,
    duration_ms,
    artwork_url,
    provider_track_id: videoId,
    provider: 'youtube',
    url_web: `https://www.youtube.com/watch?v=${videoId}`,
    url_app: `vnd.youtube://watch?v=${videoId}`,
    url_preview: `https://www.youtube.com/watch?v=${videoId}`,
  };
}

async function getVideoDetails(videoIds: string, apiKey: string): Promise<YouTubeVideoDetails[]> {
  if (!videoIds) return [];

  const params = new URLSearchParams({
    part: 'contentDetails,snippet',
    id: videoIds,
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?${params}`
  );

  if (!response.ok) {
    console.error('YouTube video details failed:', response.statusText);
    return [];
  }

  const data = await response.json();
  return data.items || [];
}

async function searchYouTube(
  query: string,
  limit: number,
  apiKey: string
): Promise<NormalizedTrack[]> {
  const params = new URLSearchParams({
    part: 'snippet',
    q: query,
    type: 'video',
    videoCategoryId: '10', // Music category
    maxResults: limit.toString(),
    key: apiKey,
  });

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params}`
  );

  if (!response.ok) {
    throw new Error(`YouTube search failed: ${response.statusText}`);
  }

  const data = await response.json();
  const items: YouTubeSearchResult[] = data.items || [];

  // Get video details for duration
  const videoIds = items.map(item => item.id.videoId).join(',');
  const details = await getVideoDetails(videoIds, apiKey);

  return items.map((item, index) => normalizeTrack(item, details[index]));
}

async function getUser(req: Request) {
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader) return null;
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } }
  });
  
  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Require authentication
    const user = await getUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if YouTube API key is configured
    if (!YOUTUBE_API_KEY) {
      console.error('YOUTUBE_API_KEY not configured');
      return new Response(JSON.stringify({ 
        error: 'YouTube search not configured',
        results: [] 
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { query, limit = 10 } = await req.json();

    if (!query || typeof query !== 'string') {
      return new Response(JSON.stringify({ error: 'Query parameter required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Sanitize input
    const sanitizedQuery = query.trim().slice(0, 200);
    const sanitizedLimit = Math.min(Math.max(1, limit), 50);

    console.log(`YouTube search for user ${user.id}: "${sanitizedQuery}" (limit: ${sanitizedLimit})`);

    const results = await searchYouTube(sanitizedQuery, sanitizedLimit, YOUTUBE_API_KEY);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('YouTube search error:', error);
    return new Response(JSON.stringify({ 
      error: 'Search failed', 
      results: [] 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
