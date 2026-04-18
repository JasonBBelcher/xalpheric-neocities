const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { checkDependencies, DEPENDENCIES } = require('../../lib/media/dependencies');
const logger = require('../../lib/utils/logger');

async function createGif(options) {
  const {
    input,
    output,
    outputDir = 'public/assets/',
    start = '0',
    duration,
    fps = '12',
    width = '480',
    loop = '0',
    verbose = false
  } = options;

  if (verbose) logger.setVerbose(true);

  await checkDependencies([DEPENDENCIES.ffmpeg], { logger, autoInstall: false });

  if (!fs.existsSync(input)) {
    logger.error(`Input file not found: ${input}`);
    process.exit(1);
  }

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const basename = path.basename(input, path.extname(input));
  const outputFile = output || `${basename}.gif`;
  const outputPath = path.join(outputDir, outputFile);
  const palettePath = path.join(outputDir, `.palette-${Date.now()}.png`);

  const seekArgs = start !== '0' ? `-ss ${start} ` : '';
  const durationArgs = duration ? `-t ${duration} ` : '';
  const scaleFilter = `fps=${fps},scale=${width}:-1:flags=lanczos`;

  logger.info(`\n🎞️  Creating GIF from ${input}`);
  logger.info(`   Output: ${outputPath}`);
  logger.info(`   Size: ${width}px wide @ ${fps}fps${duration ? ` · ${duration}s` : ''}${start !== '0' ? ` (from ${start}s)` : ''}\n`);

  const stdio = verbose ? 'inherit' : 'pipe';

  try {
    // Pass 1: generate palette
    logger.info('Pass 1/2: Generating palette...');
    const pass1 = `ffmpeg -y ${seekArgs}${durationArgs}-i "${input}" -vf "${scaleFilter},palettegen=stats_mode=diff" "${palettePath}"`;
    execSync(pass1, { stdio });

    // Pass 2: render GIF using palette
    logger.info('Pass 2/2: Rendering GIF...');
    const pass2 = `ffmpeg -y ${seekArgs}${durationArgs}-i "${input}" -i "${palettePath}" -filter_complex "${scaleFilter}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle" -loop ${loop} "${outputPath}"`;
    execSync(pass2, { stdio });

    // Clean up palette
    if (fs.existsSync(palettePath)) fs.unlinkSync(palettePath);

    const inputSize = (fs.statSync(input).size / 1024 / 1024).toFixed(2);
    const outputSize = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

    logger.success(`\nGIF created: ${outputPath}`);
    logger.info(`   Input:  ${inputSize} MB`);
    logger.info(`   Output: ${outputSize} MB\n`);
  } catch (err) {
    if (fs.existsSync(palettePath)) fs.unlinkSync(palettePath);
    logger.error(`GIF creation failed: ${err.message}`);
    process.exit(1);
  }
}

module.exports = createGif;
