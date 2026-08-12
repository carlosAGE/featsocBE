const { spawn } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { path: ffprobePath } = require('ffprobe-static');

// MVP normalization targets. No adaptive bitrate/HLS — a single
// consistent-codec mp4 is enough until traffic justifies a real transcoding
// pipeline (see PROJECT_LOG.md).
const MAX_HEIGHT = 1080;
const MAX_VIDEO_BITRATE = '4000k';
const MAX_AUDIO_BITRATE = '128k';
const THUMBNAIL_AT_SECONDS = 1;

function run(bin, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args);
    let stderr = '';
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code === 0) return resolve();
      reject(new Error(`${bin} exited with code ${code}: ${stderr.slice(-2000)}`));
    });
  });
}

// Probes duration/width/height of the raw upload before processing.
async function probe(inputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '-v', 'error',
      '-select_streams', 'v:0',
      '-show_entries', 'stream=width,height:format=duration',
      '-of', 'json',
      inputPath,
    ];
    const proc = spawn(ffprobePath, args);
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    proc.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    proc.on('error', reject);
    proc.on('close', (code) => {
      if (code !== 0) return reject(new Error(`ffprobe exited with code ${code}: ${stderr.slice(-2000)}`));
      try {
        const parsed = JSON.parse(stdout);
        const stream = parsed.streams && parsed.streams[0];
        resolve({
          durationSeconds: parsed.format ? parseFloat(parsed.format.duration) : null,
          width: stream ? stream.width : null,
          height: stream ? stream.height : null,
        });
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Re-encodes to a consistent H.264/AAC mp4, capped at MAX_HEIGHT and
// MAX_VIDEO_BITRATE, with the moov atom moved to the front (`faststart`) so
// playback can start before the whole file downloads. Never upscales.
async function normalize(inputPath, outputPath) {
  await run(ffmpegPath, [
    '-y',
    '-i', inputPath,
    '-vf', `scale=-2:min(ih\\,${MAX_HEIGHT})`,
    '-c:v', 'libx264',
    '-b:v', MAX_VIDEO_BITRATE,
    '-maxrate', MAX_VIDEO_BITRATE,
    '-bufsize', '8000k',
    '-c:a', 'aac',
    '-b:a', MAX_AUDIO_BITRATE,
    '-movflags', '+faststart',
    outputPath,
  ]);
}

// Grabs a single frame as a jpg thumbnail.
async function generateThumbnail(inputPath, outputPath, atSeconds = THUMBNAIL_AT_SECONDS) {
  await run(ffmpegPath, [
    '-y',
    '-ss', String(atSeconds),
    '-i', inputPath,
    '-frames:v', '1',
    outputPath,
  ]);
}

module.exports = { probe, normalize, generateThumbnail };
