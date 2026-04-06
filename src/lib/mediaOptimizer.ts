import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

// Singleton instance to avoid multiple downloads
let ffmpeg: FFmpeg | null = null;

export const MediaOptimizer = {
  /**
   * Optimizes an image file using browser-image-compression.
   * Targets a max size and standard resolution.
   */
  async optimizeImage(file: File): Promise<File> {
    const options = {
      maxSizeMB: 1, // Target max 1MB per image for ERP speed
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8
    };
    try {
      return await imageCompression(file, options);
    } catch (error) {
      console.error("Image compression failed:", error);
      return file;
    }
  },

  /**
   * Lazy loads FFmpeg directly from CDN to keep the main bundle extremely light.
   */
  async loadFFmpeg(onProgress?: (msg: string) => void) {
    if (ffmpeg) return ffmpeg;
    
    ffmpeg = new FFmpeg();
    const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
    
    ffmpeg.on('log', ({ message }) => {
      onProgress?.(message);
    });

    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    });
    
    return ffmpeg;
  },

  /**
   * Compresses a video targeting a specific file size (e.g. 10MB for Shopee).
   */
  async optimizeVideo(
    file: File, 
    onProgress: (percent: number) => void
  ): Promise<File> {
    const ff = await this.loadFFmpeg();
    const inputName = 'input.mp4';
    const outputName = 'output.mp4';
    
    onProgress(0);
    
    // Write the file to FFmpeg's virtual filesystem
    await ff.writeFile(inputName, await fetchFile(file));

    // Listen for progress
    ff.on('progress', ({ progress }) => {
      onProgress(Math.round(progress * 100));
    });

    // Execute compression: 
    // - Force H264/AAC for compatibility. 
    // - Use CRF 28 (good balance) or a constant bitrate if size is priority.
    // - Scale to 720p if needed to guarantee <10MB.
    await ff.exec([
      '-i', inputName,
      '-vcodec', 'libx264',
      '-crf', '28',
      '-preset', 'veryfast',
      '-vf', 'scale=-2:720', // Scale to 720p height, preserving aspect ratio
      '-acodec', 'aac',
      '-maxrate', '1500k',
      '-bufsize', '3000k',
      outputName
    ]);

    const data = await ff.readFile(outputName);
    const resultBlob = new Blob([data], { type: 'video/mp4' });
    
    return new File([resultBlob], file.name.replace(/\.[^/.]+$/, "") + "_optimized.mp4", {
      type: 'video/mp4'
    });
  }
};
