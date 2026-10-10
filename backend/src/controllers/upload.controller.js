const { sendSuccess } = require('../utils/response.util');
const asyncHandler = require('../utils/asyncHandler');
const { BadRequestError } = require('../errors');

const uploadController = {
  /**
   * Upload image or generate upload signature
   */
  uploadImage: asyncHandler(async (req, res) => {
    const { imageBase64, fileName } = req.body;
    if (!imageBase64) {
      throw new BadRequestError('Dữ liệu ảnh base64 là bắt buộc');
    }

    // In production or cloud, this can upload to Cloudinary/S3.
    // For local dev/demo, we can return the imageBase64 directly as data URL or formatted URL.
    const url = imageBase64.startsWith('data:')
      ? imageBase64
      : `data:image/jpeg;base64,${imageBase64}`;

    return sendSuccess(res, {
      url,
      fileName: fileName || 'product-image.jpg',
      uploadedAt: new Date().toISOString(),
    }, 'Tải ảnh lên thành công', 201);
  }),

  getSignUrl: asyncHandler(async (req, res) => {
    // Generate signature for direct cloud upload (Cloudinary/S3 presigned)
    const timestamp = Math.round(new Date().getTime() / 1000);
    return sendSuccess(res, {
      timestamp,
      cloudName: 'shoestore_cloud',
      apiKey: 'shoestore_key_2026',
      uploadPreset: 'shoestore_preset',
      signature: 'demo_sha1_signature_hash',
    }, 'Lấy chữ ký tải ảnh thành công');
  }),
};

module.exports = uploadController;
