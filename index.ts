import 'dotenv/config';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';

interface ImageData {
  original: {
    url: string;
  };
}

interface Block {
  class: string;
  image: ImageData;
}

interface ChannelResponse {
  contents: Block[];
}

const CHANNEL_SLUG = process.env.npm_config_channel || process.env.ARENA_CHANNEL_SLUG;
const OUTPUT_FOLDER = `./images/${CHANNEL_SLUG}`;
const ENV_FILE = path.join(process.cwd(), '.env');

let accessToken = process.env.ARENA_ACCESS_TOKEN;

if (!fs.existsSync(OUTPUT_FOLDER)) {
  fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
}

async function fetchChannelContent(slug: string, page: number = 1): Promise<ChannelResponse> {
  const url = `https://api.are.na/v2/channels/${slug}/contents?page=${page}`;
  const headers: Record<string, string> = {};

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await axios.get<ChannelResponse>(url, { headers });
  return response.data;
}

async function downloadImage(url: string, filename: string): Promise<void> {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    maxRedirects: 5,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
  });

  const filepath = path.join(OUTPUT_FOLDER, filename);
  fs.writeFileSync(filepath, response.data);
}

async function promptForToken(): Promise<string> {
  console.log('\nAuthentication required to access this channel.');
  console.log('Please get your access token from: https://dev.are.na/oauth/applications');
  console.log('');

  const response = await prompts({
    type: 'password',
    name: 'token',
    message: 'Enter your Are.na access token:',
    validate: (value: string) => value.length > 0 || 'Token cannot be empty'
  });

  if (!response.token) {
    throw new Error('Authentication cancelled by user');
  }

  return response.token;
}

function saveTokenToEnv(token: string): void {
  let envContent = '';

  if (fs.existsSync(ENV_FILE)) {
    envContent = fs.readFileSync(ENV_FILE, 'utf-8');
  }

  const tokenLine = `ARENA_ACCESS_TOKEN=${token}`;

  if (envContent.includes('ARENA_ACCESS_TOKEN=')) {
    envContent = envContent.replace(/ARENA_ACCESS_TOKEN=.*/g, tokenLine);
  } else {
    envContent += (envContent.endsWith('\n') ? '' : '\n') + tokenLine + '\n';
  }

  fs.writeFileSync(ENV_FILE, envContent);
  console.log('✓ Access token saved to .env file\n');
}

async function downloadAllImages(): Promise<void> {
  let page = 1;
  let hasMorePages = true;

  console.log(`Starting download from channel: ${CHANNEL_SLUG}`);

  while (hasMorePages) {
    console.log(`Fetching page ${page}...`);
    const data = await fetchChannelContent(CHANNEL_SLUG!, page);

    const imageBlocks = data.contents.filter(block => block.class === 'Image');

    if (imageBlocks.length > 0) {
      const downloadPromises = imageBlocks.map(async block => {
        const imageUrl = block.image.original.url;
        const filename = path.basename(new URL(imageUrl).pathname);

        console.log(`Downloading: ${filename}`);
        return downloadImage(imageUrl, filename);
      });

      await Promise.all(downloadPromises);
    }

    hasMorePages = data.contents.length > 0;
    page++;
  }

  console.log('Download complete!');
}

async function main() {
  try {
    await downloadAllImages();
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response && (axiosError.response.status === 401 || axiosError.response.status === 403)) {
      console.log('\n⚠ Authentication failed. The channel may be private.');

      try {
        const token = await promptForToken();
        accessToken = token;
        saveTokenToEnv(token);

        console.log('Retrying download with authentication...\n');
        await downloadAllImages();
      } catch (retryError) {
        const retryAxiosError = retryError as AxiosError;

        if (retryAxiosError.response && (retryAxiosError.response.status === 401 || retryAxiosError.response.status === 403)) {
          console.error('\n✗ Access denied. You either don\'t have permission to access this channel, or it doesn\'t exist.');
        } else if (retryAxiosError.response && retryAxiosError.response.status === 404) {
          console.error('\n✗ Channel not found. The channel may not exist or may have been deleted.');
        } else {
          console.error('\n✗ Error:', (retryError as Error).message);
        }
        process.exit(1);
      }
    } else if (axiosError.response && axiosError.response.status === 404) {
      console.error('\n✗ Channel not found. Please check the channel slug.');
      process.exit(1);
    } else {
      console.error('\n✗ Error:', (error as Error).message);
      process.exit(1);
    }
  }
}

main();
