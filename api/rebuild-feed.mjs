// api/rebuild-feed.mjs

import { exec } from 'child_process';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Only POST allowed');
  }

  exec('node podcast-feed.mjs', (err, stdout, stderr) => {
    if (err) {
      console.error('❌ Feed generation failed:', stderr);
      return res.status(500).send('Feed generation failed');
    }

    console.log('✅ Feed regenerated:', stdout);
    return res.status(200).send('Feed regenerated successfully');
  });
}