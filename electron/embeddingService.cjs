/**
 * 中文 CLIP 语义搜索服务
 * 使用 @huggingface/transformers 加载 Chinese CLIP 模型，中文查询更准确
 * 模型在首次使用时下载并缓存
 */
const fs = require('fs');
const log = require('electron-log');

const MODEL_NAME = 'Xenova/chinese-clip-vit-base-patch16';
const EMBEDDING_DIM = 512;

let model = null;
let tokenizer = null;
let imageProcessor = null;
let loadingPromise = null;
let isLoaded = false;
let loadError = null;

// 配置 HuggingFace 镜像（国内网络需要）
const { env, Tensor } = require('@huggingface/transformers');
env.remoteHost = 'https://hf-mirror.com/';

// 使用项目内的缓存目录，方便管理
const path = require('path');
const CACHE_DIR = path.join(__dirname, '.model-cache');
env.cacheDir = CACHE_DIR;

// 加载进度回调
let onProgress = null;

function setProgressCallback(cb) {
  onProgress = cb;
}

/**
 * 加载 CLIP 模型（首次调用时下载，后续复用）
 */
async function loadModel(retries = 3) {
  if (isLoaded) return true;
  if (loadError) throw loadError;
  if (loadingPromise) return loadingPromise;

  const TIMEOUT_MS = 5 * 60 * 1000;

  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`模型加载超时 (${TIMEOUT_MS / 1000}s)`)), TIMEOUT_MS)
  );

  const loadAttempt = async (attempt = 1) => {
    try {
      log.info(`[Embedding] 开始加载模型 (第${attempt}次):`, MODEL_NAME);

      const { ChineseCLIPModel, BertTokenizer, ChineseCLIPFeatureExtractor } = require('@huggingface/transformers');

      const config = {};
      if (onProgress) {
        config.progress_callback = onProgress;
      }

      const [tok, imgProc, mdl] = await Promise.all([
        BertTokenizer.from_pretrained(MODEL_NAME, config),
        ChineseCLIPFeatureExtractor.from_pretrained(MODEL_NAME, config),
        ChineseCLIPModel.from_pretrained(MODEL_NAME, config),
      ]);
      tokenizer = tok;
      imageProcessor = imgProc;
      model = mdl;

      isLoaded = true;
      log.info('[Embedding] CLIP 模型加载完成');
      return true;
    } catch (err) {
      log.warn(`[Embedding] 模型加载失败 (第${attempt}次):`, err.message);
      // 如果是缓存错误，尝试清理
      if (err.message?.includes('cache') || err.code === 'ENOENT') {
        try {
          const cachePath = path.join(CACHE_DIR, 'models--Xenova--chinese-clip-vit-base-patch16');
          if (fs.existsSync(cachePath)) {
            fs.rmSync(cachePath, { recursive: true, force: true });
            log.info('[Embedding] 已清理损坏的模型缓存');
          }
        } catch (cleanErr) {
          log.warn('[Embedding] 清理缓存失败:', cleanErr.message);
        }
      }
      if (attempt < retries) {
        log.info('[Embedding] 3秒后重试...');
        await new Promise(r => setTimeout(r, 3000));
        return loadAttempt(attempt + 1);
      }
      loadError = err;
      throw err;
    }
  };

  loadingPromise = Promise.race([
    (async () => loadAttempt())(),
    timeoutPromise,
  ]);

  return loadingPromise;
}

/**
 * 获取文本 embedding（搜索查询用）
 */
async function getTextEmbedding(text) {
  if (!isLoaded) {
    try { await loadModel(); } catch { return null; }
  }

  try {
    const inputs = await tokenizer([text], {
      padding: true,
      truncation: true,
    });

    const dummyPixel = new Tensor('float32', new Float32Array(3 * 224 * 224), [1, 3, 224, 224]);
    const { text_embeds } = await model({
      input_ids: inputs.input_ids,
      attention_mask: inputs.attention_mask,
      pixel_values: dummyPixel,
    });

    return normalizeVector(text_embeds.data);
  } catch (err) {
    log.error('[Embedding] 文本编码失败:', err.message, 'stack:', err.stack);
    return null;
  }
}

/**
 * 获取图片 embedding
 */
async function getImageEmbedding(imagePath) {
  if (!isLoaded) {
    try { await loadModel(); } catch { return null; }
  }

  try {
    if (!fs.existsSync(imagePath)) {
      log.warn('[Embedding] 图片不存在:', imagePath);
      return null;
    }

    const sharp = require('sharp');

    const imageBuffer = await sharp(imagePath)
      .resize(224, 224, { fit: 'cover', position: 'center' })
      .raw()
      .toBuffer();

    const channels = 3;
    const height = 224;
    const width = 224;
    const rgbData = new Float32Array(channels * height * width);

    const mean = [0.48145466, 0.4578275, 0.40821073];
    const std = [0.26862954, 0.26130258, 0.27577711];

    for (let i = 0; i < height * width; i++) {
      for (let c = 0; c < channels; c++) {
        rgbData[c * height * width + i] =
          (imageBuffer[i * channels + c] / 255.0 - mean[c]) / std[c];
      }
    }

    const pixelValues = new Tensor('float32', rgbData, [1, channels, height, width]);

    // 给合并模型补零文本输入（图片编码不需要文本输入）
    const { image_embeds } = await model({
      pixel_values: pixelValues,
      input_ids: new Tensor('int64', BigInt64Array.from([0n]), [1, 1]),
      attention_mask: new Tensor('int64', BigInt64Array.from([0n]), [1, 1]),
    });

    return normalizeVector(image_embeds.data);
  } catch (err) {
    log.error('[Embedding] 图片编码失败:', err.message);
    return null;
  }
}

/**
 * L2 归一化向量
 */
function normalizeVector(data) {
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    sum += data[i] * data[i];
  }
  const norm = Math.sqrt(sum);
  if (norm === 0) return new Float32Array(data);

  const result = new Float32Array(data.length);
  for (let i = 0; i < data.length; i++) {
    result[i] = data[i] / norm;
  }
  return result;
}

function getStatus() {
  return {
    isLoaded,
    isLoading: !!loadingPromise && !isLoaded,
    hasError: !!loadError,
    error: loadError?.message || null,
    modelName: MODEL_NAME,
    embeddingDim: EMBEDDING_DIM,
  };
}

async function warmup() {
  if (isLoaded) return true;
  try { await loadModel(); return true; } catch { return false; }
}

module.exports = {
  loadModel,
  getTextEmbedding,
  getImageEmbedding,
  getStatus,
  warmup,
  setProgressCallback,
  EMBEDDING_DIM,
};
