import fs from 'fs';
import path from 'path';
import { parseISO, format } from 'date-fns';
import xmlbuilder from 'xmlbuilder';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GHOST_API_URL = 'https://enadko.com';
const GHOST_CONTENT_KEY = process.env.GHOST_CONTENT_KEY;

if (!GHOST_CONTENT_KEY) {
  console.error('❌ ERROR: Missing GHOST_CONTENT_KEY environment variable.');
  process.exit(1);
}

async function generateFeed() {
  const apiUrl = `${GHOST_API_URL}/ghost/api/content/posts/?key=${GHOST_CONTENT_KEY}&filter=tag:soulprymcast,visibility:public&limit=all&fields=title,slug,published_at,meta_description,custom_excerpt,feature_image,url`;

  console.log('📡 Fetching data from Ghost API...');
  const res = await fetch(apiUrl);
  const data = await res.json();

  if (!data || !Array.isArray(data.posts)) {
    console.error('❌ ERROR: Unexpected response structure:', data);
    return;
  }

  const posts = data.posts;
  console.log(`✅ Found ${posts.length} post(s). Building feed...`);

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
    if (!post.meta_description || !post.meta_description.includes('.mp3')) {
      console.warn(`⚠️ Skipping "${post.title}" — no .mp3 link in meta description.`);
      return;
    }

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

  const outputDir = path.join(__dirname, 'public');
  const outputFile = path.join(outputDir, 'podcast.xml');

  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputFile, xml, 'utf8');
  console.log(`✅ Podcast RSS feed generated at ${outputFile}`);
}

generateFeed().catch(err => {
  console.error('⚠️ Feed generation failed. Skipping but continuing build.');
  console.error(err);
});