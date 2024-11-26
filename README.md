# are.na.rchive

Download all images from any public channel on Are.na.

## Prerequisites

1. **Node.js**: Ensure you have Node.js installed. You can download it from [nodejs.org](https://nodejs.org/).
2. **Are.na API**: This script works with public channels on Are.na.

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

3. Create a `.env` file in the root of the project to specify a default Are.na channel slug:

   ```
   ARENA_CHANNEL_SLUG=your-default-channel-slug
   ```

   Replace `your-default-channel-slug` with the slug of the Are.na channel you want to download (e.g., `arena-influences`).

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

The script will download all images from the specified Are.na channel and save them inside the `images` folder in the root of the project.

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

- Ensure the channel slug is valid and corresponds to a public Are.na channel.
- If no images are downloaded, verify the channel has image blocks.

---

https://github.com/zuyos
