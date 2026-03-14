/**
 * YouTube Channel Sync
 * Fetches all (or latest N) videos from a channel and ingests their transcripts
 */

import { ingestSource } from './ingest'

const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY!
const YT_API = 'https://www.googleapis.com/youtube/v3'

export interface ChannelSyncResult {
  channelName: string
  totalVideos: number
  ingested: number
  skipped: number
  errors: string[]
}

/**
 * Get the uploads playlist ID for a channel handle or ID.
 * handle: '@AIDailyBrief' or 'UCxxxxxxx'
 */
async function getUploadsPlaylistId(channelHandle: string): Promise<{ playlistId: string; channelName: string }> {
  // Try by handle first
  const isHandle = channelHandle.startsWith('@')
  const param = isHandle
    ? `forHandle=${encodeURIComponent(channelHandle)}`
    : `id=${channelHandle}`

  const res = await fetch(
    `${YT_API}/channels?part=contentDetails,snippet&${param}&key=${YOUTUBE_API_KEY}`
  )
  const json = await res.json()

  if (!json.items?.length) throw new Error(`Channel not found: ${channelHandle}`)

  const channel = json.items[0]
  return {
    playlistId: channel.contentDetails.relatedPlaylists.uploads,
    channelName: channel.snippet.title
  }
}

/**
 * List videos from an uploads playlist (latest first).
 */
async function listPlaylistVideos(
  playlistId: string,
  maxResults = 50
): Promise<Array<{ videoId: string; title: string; publishedAt: string }>> {
  const videos: Array<{ videoId: string; title: string; publishedAt: string }> = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      part: 'snippet',
      playlistId,
      maxResults: Math.min(maxResults - videos.length, 50).toString(),
      key: YOUTUBE_API_KEY,
      ...(pageToken ? { pageToken } : {})
    })

    const res = await fetch(`${YT_API}/playlistItems?${params}`)
    const json = await res.json()

    for (const item of json.items || []) {
      videos.push({
        videoId: item.snippet.resourceId.videoId,
        title: item.snippet.title,
        publishedAt: item.snippet.publishedAt
      })
    }

    pageToken = json.nextPageToken
  } while (pageToken && videos.length < maxResults)

  return videos
}

/**
 * Sync a YouTube channel: fetch latest N videos and ingest their transcripts.
 * @param channelHandle  e.g. '@AIDailyBrief' or channel ID
 * @param maxVideos      how many recent videos to ingest (default 20)
 */
export async function syncYouTubeChannel(
  channelHandle: string,
  maxVideos = 20
): Promise<ChannelSyncResult> {
  if (!YOUTUBE_API_KEY) throw new Error('YOUTUBE_API_KEY not configured')

  const { playlistId, channelName } = await getUploadsPlaylistId(channelHandle)
  const videos = await listPlaylistVideos(playlistId, maxVideos)

  let ingested = 0
  let skipped = 0
  const errors: string[] = []

  for (const video of videos) {
    const url = `https://www.youtube.com/watch?v=${video.videoId}`
    try {
      const result = await ingestSource(url, 'youtube')
      if (result.alreadyExists) {
        skipped++
      } else {
        ingested++
        console.log(`[kb/channel] Ingested: ${video.title} (${result.chunkCount} chunks)`)
      }
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500))
    } catch (err: any) {
      const msg = `${video.title}: ${err.message}`
      errors.push(msg)
      console.error(`[kb/channel] Error ingesting ${video.title}:`, err.message)
    }
  }

  return {
    channelName,
    totalVideos: videos.length,
    ingested,
    skipped,
    errors
  }
}
