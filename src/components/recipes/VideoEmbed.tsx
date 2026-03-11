import { InstagramEmbed, TikTokEmbed } from 'react-social-media-embed';
import type { VideoPlatform } from '@/types/recipe';
import { Play, ExternalLink } from 'lucide-react';

interface VideoEmbedProps {
  url: string;
  platform?: VideoPlatform;
}

/**
 * Auto-detect video platform from URL
 */
export function detectPlatform(url: string): VideoPlatform | null {
  if (!url) return null;
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'youtube';
  if (lower.includes('instagram.com')) return 'instagram';
  if (lower.includes('tiktok.com')) return 'tiktok';
  if (lower.includes('vimeo.com')) return 'vimeo';
  return null;
}

/**
 * Extract YouTube video ID from various URL formats
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([^&]+)/,
    /youtu\.be\/([^?]+)/,
    /youtube\.com\/embed\/([^?]+)/,
    /youtube\.com\/shorts\/([^?]+)/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Extract Vimeo video ID
 */
function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(\d+)/);
  return match ? match[1] : null;
}

export function VideoEmbed({ url, platform }: VideoEmbedProps) {
  const detectedPlatform = platform || detectPlatform(url);

  if (!detectedPlatform) {
    // Unknown platform — show as link
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 p-4 rounded-xl border bg-secondary/30 hover:bg-secondary/50 transition-colors"
      >
        <Play className="h-5 w-5 text-primary" />
        <span className="text-sm font-medium">Watch video</span>
        <ExternalLink className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
      </a>
    );
  }

  if (detectedPlatform === 'youtube') {
    const videoId = getYouTubeId(url);
    if (!videoId) return null;
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          title="Recipe video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (detectedPlatform === 'vimeo') {
    const videoId = getVimeoId(url);
    if (!videoId) return null;
    return (
      <div className="aspect-video rounded-xl overflow-hidden">
        <iframe
          src={`https://player.vimeo.com/video/${videoId}`}
          title="Recipe video"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full"
        />
      </div>
    );
  }

  if (detectedPlatform === 'instagram') {
    return (
      <div className="rounded-xl overflow-hidden">
        <InstagramEmbed url={url} width="100%" />
      </div>
    );
  }

  if (detectedPlatform === 'tiktok') {
    return (
      <div className="rounded-xl overflow-hidden">
        <TikTokEmbed url={url} width="100%" />
      </div>
    );
  }

  return null;
}

/**
 * Small play icon overlay for recipe cards
 */
export function VideoIndicator() {
  return (
    <div className="absolute top-2 right-2 bg-black/70 rounded-full p-1.5">
      <Play className="h-3 w-3 text-white fill-white" />
    </div>
  );
}
