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

3. (Optional) Create a `.env` file in the root of the project to specify a default Are.na channel slug:

   ```
   ARENA_CHANNEL_SLUG=your-default-channel-slug
   ```

   Replace `your-default-channel-slug` with the slug of the Are.na channel you want to download (e.g., `arena-influences`).

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

### Run the Script with Default Channel

To download images from the default channel specified in `.env`:

```bash
npm run download
```

### Run the Script with a Custom Channel

To override the default channel and download images from another channel:

```bash
npm run download --channel=custom-channel-slug
```

Replace `custom-channel-slug` with the slug of the desired Are.na channel.

### Output

The script will download all images from the specified Are.na channel and save them in `images/[channel-slug]/` in the root of the project.

## Example

1. Set up `.env`:

   ```
   ARENA_CHANNEL_SLUG=arena-influences
   ```

2. Run the script:

   ```bash
   npm run download
   ```

3. Output:

   - Images will be saved in the `images/` directory.

4. To download from another channel:
   ```bash
   npm run download --channel=arena-influences
   ```

## Troubleshooting

- **Authentication failed**: Make sure you're using a valid access token from [https://dev.are.na/oauth/applications](https://dev.are.na/oauth/applications)
- **Channel not found**: Ensure the channel slug is valid and the channel exists
- **Access denied**: You may not have permission to access a private channel, even with authentication
- **No images downloaded**: Verify the channel contains image blocks

---

https://github.com/zuyos
