import 'dotenv/config';
import axios, { AxiosError } from 'axios';
import fs from 'fs';
import path from 'path';
import prompts from 'prompts';
import cliProgress from 'cli-progress';

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

const ENV_FILE = path.join(process.cwd(), '.env');

let accessToken = process.env.ARENA_ACCESS_TOKEN;
let CHANNEL_SLUG = '';
let OUTPUT_FOLDER = '';

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

async function promptForChannelSlug(): Promise<string> {
  const defaultSlug = process.env.ARENA_CHANNEL_SLUG;

  const response = await prompts({
    type: 'text',
    name: 'slug',
    message: 'Enter Are.na channel slug:',
    initial: defaultSlug,
    validate: (value: string) => value.length > 0 || 'Channel slug cannot be empty'
  });

  if (!response.slug) {
    throw new Error('Channel input cancelled by user');
  }

  return response.slug.trim();
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
  console.log(`Starting download from channel: ${CHANNEL_SLUG}\n`);

  console.log('Fetching channel contents...');
  let page = 1;
  const allImageBlocks: Block[] = [];

  while (true) {
    process.stdout.write(`\rFetching page ${page}...`);
    const data = await fetchChannelContent(CHANNEL_SLUG!, page);

    if (!data.contents || data.contents.length === 0) {
      break;
    }

    const imageBlocks = data.contents.filter(block => block.class === 'Image');
    allImageBlocks.push(...imageBlocks);

    if (data.contents.length < 50) {
      break;
    }

    page++;
  }

  console.log(`\nFound ${allImageBlocks.length} images\n`);

  if (allImageBlocks.length === 0) {
    console.log('No images to download.');
    return;
  }

  const progressBar = new cliProgress.SingleBar({
    format: 'Downloading |{bar}| {percentage}% | {value}/{total} images',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  progressBar.start(allImageBlocks.length, 0);

  let completed = 0;
  for (const block of allImageBlocks) {
    const imageUrl = block.image.original.url;
    const filename = path.basename(new URL(imageUrl).pathname);

    await downloadImage(imageUrl, filename);
    completed++;
    progressBar.update(completed);
  }

  progressBar.stop();
  console.log('\n✓ Download complete!');
}

async function main() {
  try {
    CHANNEL_SLUG = await promptForChannelSlug();
    OUTPUT_FOLDER = `./images/${CHANNEL_SLUG}`;

    if (!fs.existsSync(OUTPUT_FOLDER)) {
      fs.mkdirSync(OUTPUT_FOLDER, { recursive: true });
    }

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
