const YT_BASE = 'https://www.googleapis.com/youtube/v3';

export async function fetchYoutubeUploads(apiKey, handle) {
  const cleanHandle = handle.startsWith('@') ? handle : '@' + handle;

  const channelRes = await fetch(
    `${YT_BASE}/channels?part=contentDetails&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`
  );
  const channelData = await channelRes.json();

  if (channelData.error) {
    throw new Error('YouTube API error: ' + (channelData.error.message || 'unknown error'));
  }
  if (!channelData.items || !channelData.items.length) {
    throw new Error(`No YouTube channel found for handle "${cleanHandle}". Double-check YOUTUBE_CHANNEL_HANDLE.`);
  }

  const uploadsPlaylistId = channelData.items[0].contentDetails.relatedPlaylists.uploads;

  let videos = [];
  let pageToken = '';
  let safety = 0;

  do {
    const url = `${YT_BASE}/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=${uploadsPlaylistId}&key=${apiKey}${pageToken ? '&pageToken=' + pageToken : ''}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.error) throw new Error('YouTube API error: ' + (data.error.message || 'unknown error'));

    (data.items || []).forEach(item => {
      videos.push({
        youtubeId: item.contentDetails.videoId,
        title: item.snippet.title,
        publishedDate: (item.contentDetails.videoPublishedAt || item.snippet.publishedAt || '').slice(0, 10),
        thumbnail: item.snippet.thumbnails?.medium?.url || item.snippet.thumbnails?.default?.url || ''
      });
    });

    pageToken = data.nextPageToken;
    safety++;
  } while (pageToken && safety < 40);

  // Batch-fetch statistics (view/like/comment counts) — videos.list allows up to 50 IDs per call.
  for (let i = 0; i < videos.length; i += 50) {
    const batch = videos.slice(i, i + 50);
    const ids = batch.map(v => v.youtubeId).join(',');
    const statsRes = await fetch(`${YT_BASE}/videos?part=statistics&id=${ids}&key=${apiKey}`);
    const statsData = await statsRes.json();
    if (statsData.error) continue; // stats are a nice-to-have; don't fail the whole sync over them
    const statsById = {};
    (statsData.items || []).forEach(item => { statsById[item.id] = item.statistics; });
    batch.forEach(v => {
      const s = statsById[v.youtubeId];
      if (s) {
        v.viewCount = Number(s.viewCount) || 0;
        v.likeCount = Number(s.likeCount) || 0;
        v.commentCount = Number(s.commentCount) || 0;
      }
    });
  }

  return videos;
}
