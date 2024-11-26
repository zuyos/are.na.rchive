require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const CHANNEL_SLUG = process.env.npm_config_channel || process.env.ARENA_CHANNEL_SLUG;
const OUTPUT_FOLDER = `./images/${CHANNEL_SLUG}`;

if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
}

async function fetchChannelContent(slug, page = 1) {
  const url = `https://api.are.na/v2/channels/${slug}/contents?page=${page}`;
  const headers = {};

  const response = await axios.get(url, { headers });
  return response.data;
}

async function downloadImage(url, filename) {
  const response = await axios.get(url, { responseType: 'stream' });
  const filepath = path.join(OUTPUT_FOLDER, filename);

  return new Promise((resolve, reject) => {
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);

    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function downloadAllImages() {
  let page = 1;
  let hasMorePages = true;

  console.log(`Starting download from channel: ${CHANNEL_SLUG}`);

  while (hasMorePages) {
    console.log(`Fetching page ${page}...`);
    const data = await fetchChannelContent(CHANNEL_SLUG, page);

    const imageBlocks = data.contents.filter(block => block.class === 'Image');

    const downloadPromises = imageBlocks.map(async block => {
      const imageUrl = block.image.original.url;
      const filename = path.basename(new URL(imageUrl).pathname);

      console.log(`Downloading: ${filename}`);
      return downloadImage(imageUrl, filename);
    });

    await Promise.all(downloadPromises);

    hasMorePages = data.contents.length > 0;
    page++;
  }

  console.log('Download complete!');
}

downloadAllImages().catch(error => {
  console.error('Error:', error.message);
});
