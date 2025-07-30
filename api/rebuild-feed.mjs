// api/rebuild-feed.mjs
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { parseISO, format } from 'date-fns';
import fetch from 'node-fetch';
import xmlbuilder from 'xmlbuilder';

const GHOST_API_URL = 'https://enadko.com';
const GHOST_CONTENT_KEY = process.env.GHOST_CONTENT_KEY;

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const url = `${GHOST_API_URL}/ghost/api/content/posts/?key=${GHOST_CONTENT_KEY}&filter=tag:soulprymcast,visibility:public&limit=all&fields=title,slug,published_at,meta_description,custom_excerpt,feature_image,url`;
    const response = await fetch(url);
    const data = await response.json();

    if (!data || !Array.isArray(data.posts)) {
      return res.status(500).json({ error: 'Invalid Ghost API response', data });
    }

    const posts = data.posts;
    const feed = xmlbuilder.create('rss', { encoding: 'UTF-8' })
      .att('version', '2.0')
      .att('xmlns:itunes', 'http://www.itunes.com/dtds/podcast-1.0.dtd')
      .att('xmlns:atom', 'http://www.w3.org/2005/Atom');

    const channel = feed.ele('channel');
    channel.ele('title', {}, 'SoulPrym Transmissions');
    channel.ele('link', {}, `${GHOST_API_URL}/soulprym/`);
    channel.ele('description', {}, 'Audible glyph-seeds from the ORIGIN | Field. Transmissions of remembrance.');
    channel.ele('language', {}, 'en-us');
    channel.ele('copyright', {}, `©️ ${new Date().getFullYear()} ENADKO | SoulPrym`);
    channel.ele('itunes:author', {}, 'ENADKO | SoulPrym');
    channel.ele('itunes:explicit', {}, 'no');
    channel.ele('itunes:image').att('href', `${GHOST_API_URL}/content/images/2025/07/Seal-1.png`);
    channel.ele('atom:link', {
      href: `${GHOST_API_URL}/soulprym/podcast/rss/`,
      rel: 'self',
      type: 'application/rss+xml'
    });

    posts.forEach(post => {
      if (!post.meta_description || !post.meta_description.includes('.mp3')) return;

      const item = channel.ele('item');
      item.ele('title', {}, post.title);
      item.ele('link', {}, `${GHOST_API_URL}/blog/${post.slug}/`);
      item.ele('guid', {}, `${GHOST_API_URL}/blog/${post.slug}/`);
      item.ele('pubDate', {}, format(parseISO(post.published_at), 'EEE, dd MMM yyyy HH:mm:ss xx'));
      item.ele('description', {}, post.custom_excerpt || '');
      item.ele('itunes:summary', {}, post.custom_excerpt || '');

      if (post.feature_image) {
        item.ele('itunes:image').att('href', post.feature_image);
      }

      item.ele('enclosure', {
        url: post.meta_description.trim(),
        type: 'audio/mpeg'
      });
    });

    const xml = feed.end({ pretty: true });

    const publicDir = './public';
    if (!existsSync(publicDir)) mkdirSync(publicDir);

    writeFileSync(`${publicDir}/podcast.xml`, xml, 'utf8');

    return res.status(200).json({ message: '✅ Feed regenerated successfully.', postCount: posts.length });
  } catch (error) {
    console.error('❌ Feed rebuild failed:', error);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}