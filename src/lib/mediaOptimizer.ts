import imageCompression from 'browser-image-compression';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import heic2any from 'heic2any';

// Singleton instance to avoid multiple downloads
let ffmpeg: FFmpeg | null = null;

export const MediaOptimizer = {
  /**
   * Optimizes an image file. Converts HEIC to JPEG if needed.
   */
  async optimizeImage(file: File): Promise<File> {
    let processedFile = file;

    // Handle HEIC from iPhone
    if (file.type === 'image/heic' || file.name.toLowerCase().endsWith('.heic')) {
      try {
        const convertedBlob = await heic2any({
          blob: file,
          toType: 'image/jpeg',
          quality: 0.8
        });
        const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        processedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), { type: 'image/jpeg' });
      } catch (err) {
        console.error("HEIC conversion failed:", err);
      }
    }

    const options = {
      maxSizeMB: 1,
      maxWidthOrHeight: 1920,
      useWebWorker: true,
      initialQuality: 0.8
    };

    try {
      return await imageCompression(processedFile, options);
    } catch (error) {
      console.error("Image compression failed:", error);
      return processedFile;
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
   * Immediately stops any current FFmpeg process and kills the instance.
   * Useful for cancelling video optimization without waiting.
   */
  async terminateFFmpeg() {
    if (ffmpeg) {
      try {
        await ffmpeg.terminate();
        ffmpeg = null; // Forces re-loading next time
      } catch (err) {
        console.error("Failed to terminate FFmpeg:", err);
      }
    }
  },

  /**
   * Compresses a video targeting a specific file size (e.g. 10MB for Shopee).
   * Supports MP4 and MOV (Apple).
   */
  async optimizeVideo(
    file: File, 
    onProgress: (percent: number) => void
  ): Promise<File> {
    const ff = await this.loadFFmpeg();
    const isMov = file.name.toLowerCase().endsWith('.mov');
    const inputName = isMov ? 'input.mov' : 'input.mp4';
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
    // - Use CRF 24 (high quality) with a bitrate cap to ensure <10MB.
    // Execute compression: 
    // - Force H264/AAC for compatibility. 
    // - Use CRF 24 (high quality) with a bitrate cap to ensure <10MB.
    // - Scale to 720p (Shopee standard) for extreme speed in WASM environment.
    await ff.exec([
      '-i', inputName,
      '-vcodec', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-crf', '24', 
      '-preset', 'ultrafast',
      '-vf', "scale='if(gt(ih,720),-2,iw)':'if(gt(ih,720),720,ih)'", // Limit to 720p for speed
      '-acodec', 'aac',
      '-b:a', '128k',
      '-maxrate', '3000k', 
      '-bufsize', '6000k',
      outputName
    ]);

    const data = await ff.readFile(outputName);
    const resultBlob = new Blob([data], { type: 'video/mp4' });
    
    return new File([resultBlob], file.name.replace(/\.[^/.]+$/, "") + "_optimized.mp4", {
      type: 'video/mp4'
    });
  }
};
