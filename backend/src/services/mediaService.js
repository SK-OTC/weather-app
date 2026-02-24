import axios from 'axios';
import * as locationsDb from '../db/locations.js';
import { notFoundError } from '../lib/errors.js';

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
const YOUTUBE_SEARCH_URL = 'https://www.googleapis.com/youtube/v3/search';

/**
 * Get location by id; return YouTube video links and a Google Maps URL for the location.
 * Map URL does not require an API key (static link to lat,lon).
 */
export async function getMediaForLocation(locationId) {
  const location = await locationsDb.getLocationById(Number(locationId));
  if (!location) throw notFoundError('Location not found');

  const mapUrl = buildMapUrl(location.lat, location.lon, location.normalized_name);
  let videos = [];
  if (YOUTUBE_API_KEY) {
    try {
      videos = await fetchYouTubeVideos(location.normalized_name, location.country_code);
    } catch (err) {
      console.warn('YouTube API error:', err.message);
      // Don't fail the whole request; return mapUrl and empty videos
    }
  }

  return {
    location: {
      id: location.id,
      normalized_name: location.normalized_name,
      country_code: location.country_code,
      lat: location.lat,
      lon: location.lon,
    },
    videos,
    mapUrl,
  };
}

function buildMapUrl(lat, lon, label) {
  const base = 'https://www.google.com/maps?q=';
  const q = encodeURIComponent(`${lat},${lon}`);
  return `${base}${q}`;
}

async function fetchYouTubeVideos(query, countryCode) {
  const searchQuery = [query, countryCode].filter(Boolean).join(' ');
  const res = await axios.get(YOUTUBE_SEARCH_URL, {
    params: {
      part: 'snippet',
      q: searchQuery + ' travel',
      type: 'video',
      maxResults: 5,
      key: YOUTUBE_API_KEY,
    },
    timeout: 8000,
  });
  const items = res.data?.items || [];
  return items.map(item => ({
    id: item.id?.videoId,
    title: item.snippet?.title,
    thumbnail: item.snippet?.thumbnails?.medium?.url || item.snippet?.thumbnails?.default?.url,
    link: item.id?.videoId ? `https://www.youtube.com/watch?v=${item.id.videoId}` : null,
  })).filter(v => v.link);
}
