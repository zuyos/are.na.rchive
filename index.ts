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
  image?: ImageData;
}

interface ChannelResponse {
  contents: Block[];
}

const ENV_FILE = path.join(process.cwd(), '.env');
const CONCURRENT_DOWNLOADS = 5;

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

async function downloadImage(url: string, filename: string, retries: number = 3): Promise<boolean> {
  const filepath = path.join(OUTPUT_FOLDER, filename);

  if (fs.existsSync(filepath)) {
    return true;
  }

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        maxRedirects: 5,
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Referer': 'https://www.are.na/'
        }
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Empty response data');
      }

      fs.writeFileSync(filepath, response.data);
      return true;
    } catch (error) {
      if (attempt === retries - 1) {
        console.error(`\nFailed to download ${filename}: ${(error as Error).message}`);
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }
  return false;
}

async function downloadWithConcurrency<T>(
  items: T[],
  concurrency: number,
  downloadFn: (item: T) => Promise<boolean>,
  onProgress: (completed: number) => void
): Promise<{ successful: number; failed: number }> {
  let completed = 0;
  let successful = 0;
  let failed = 0;
  const queue = [...items];

  const worker = async () => {
    while (queue.length > 0) {
      const item = queue.shift();
      if (item) {
        const success = await downloadFn(item);
        if (success) {
          successful++;
        } else {
          failed++;
        }
        completed++;
        onProgress(completed);
      }
    }
  };

  const workers = Array(concurrency).fill(null).map(() => worker());
  await Promise.all(workers);

  return { successful, failed };
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
    try {
      process.stdout.write(`\rFetching page ${page}...`);
      const data = await fetchChannelContent(CHANNEL_SLUG!, page);

      if (!data.contents || data.contents.length === 0) {
        break;
      }

      const imageBlocks = data.contents.filter(block => block.class === 'Image');
      allImageBlocks.push(...imageBlocks);

      page++;
    } catch (error) {
      break;
    }
  }

  console.log(`\nFound ${allImageBlocks.length} images\n`);

  if (allImageBlocks.length === 0) {
    console.log('No images to download.');
    return;
  }

  const existingCount = allImageBlocks.filter(block => {
    const imageUrl = block.image!.original.url;
    const filename = path.basename(new URL(imageUrl).pathname);
    const filepath = path.join(OUTPUT_FOLDER, filename);
    return fs.existsSync(filepath);
  }).length;

  if (existingCount > 0) {
    console.log(`${existingCount} images already downloaded, ${allImageBlocks.length - existingCount} to download\n`);
  }

  const progressBar = new cliProgress.SingleBar({
    format: 'Downloading |{bar}| {percentage}% | {value}/{total} images',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
  });

  progressBar.start(allImageBlocks.length, 0);

  const result = await downloadWithConcurrency(
    allImageBlocks,
    CONCURRENT_DOWNLOADS,
    async (block) => {
      const imageUrl = block.image!.original.url;
      const filename = path.basename(new URL(imageUrl).pathname);
      return await downloadImage(imageUrl, filename);
    },
    (completed) => progressBar.update(completed)
  );

  progressBar.stop();

  if (result.failed > 0) {
    console.log(`\n✓ Download complete! ${result.successful} succeeded, ${result.failed} failed.`);
  } else {
    console.log('\n✓ Download complete!');
  }
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
