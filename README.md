# are.na.rchive

Download all images from any Are.na channel (public or private).

## Features

- Download all images from public Are.na channels
- Interactive authentication for private channels
- Automatic token storage for future downloads
- Built with TypeScript

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
2. **Are.na Account**: For private channels, you'll need an Are.na account and access token.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/zuyos/are.na.rchive.git are-na-rchive
   cd are-na-rchive
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

## Authentication

### Public Channels

Public channels don't require authentication. Just run the download command.

### Private Channels

For private channels, the tool will automatically prompt you for authentication if needed:

1. Run the download command
2. If authentication is required, you'll be prompted to enter your Are.na access token
3. Your token will be saved to `.env` for future downloads

#### Getting an Access Token

1. Log in to your Are.na account
2. Visit [https://dev.are.na/oauth/applications](https://dev.are.na/oauth/applications)
3. Create a new application or use an existing one
4. Copy your access token

You can also manually add your token to `.env`:

```
ARENA_ACCESS_TOKEN=your-access-token-here
```

## Usage

Run the download command:

```bash
npm run download
```

You'll be prompted to enter an Are.na channel slug:

```
? Enter Are.na channel slug: ›
```

Enter the channel slug (e.g., `arena-influences`). You can find this in the channel's URL: `https://www.are.na/username/channel-slug`

### Output

The script will download all images from the specified Are.na channel and save them in `images/[channel-slug]/` in the root of the project.

## Example

1. Run the script:

   ```bash
   npm run download
   ```

2. Enter a channel slug when prompted:

   ```
   ? Enter Are.na channel slug: › arena-influences
   ```

3. Output:

   ```
   Starting download from channel: arena-influences

   Fetching channel contents...
   Fetching page 1...
   Found 25 images

   Downloading |████████████████| 100% | 25/25 images

   ✓ Download complete!
   ```

   Images will be saved in `images/arena-influences/`.

## Troubleshooting

- **Authentication failed**: Make sure you're using a valid access token from [https://dev.are.na/oauth/applications](https://dev.are.na/oauth/applications)
- **Channel not found**: Ensure the channel slug is valid and the channel exists
- **Access denied**: You may not have permission to access a private channel, even with authentication
- **No images downloaded**: Verify the channel contains image blocks

---

https://github.com/zuyos
