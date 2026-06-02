// controllers/cloudinary.controller.js
const cloudinary = require('cloudinary').v2;
const { Response } = require('../utils/Response');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const isConfigured = () =>
  !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

const ALLOWED_FOLDERS = [
  'ulpgl/articles',
  'ulpgl/events',
  'ulpgl/activities',
  'ulpgl/faculties',
  'ulpgl/programs',
  'ulpgl/avatars',
  'ulpgl/uploads',
];

exports.config = (req, res) => {
  return Response(res, 200, {
    configured: isConfigured(),
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null,
    maxUploadMb: Number(process.env.CLOUDINARY_MAX_UPLOAD_MB) || 35,
  });
};

exports.signature = (req, res) => {
  if (!isConfigured()) {
    return Response(res, 503, { reason: "Cloudinary n'est pas configuré côté serveur" });
  }

  let folder = req.query.folder || 'ulpgl/uploads';
  if (!ALLOWED_FOLDERS.includes(folder)) folder = 'ulpgl/uploads';

  const resourceType = req.query.resourceType === 'raw' ? 'raw' : 'image';
  const timestamp = Math.round(Date.now() / 1000);

  const params = { timestamp, folder };
  if (resourceType === 'raw') {
    params.resource_type = 'raw';
  }

  const signature = cloudinary.utils.api_sign_request(params, process.env.CLOUDINARY_API_SECRET);

  return Response(res, 200, {
    signature,
    timestamp,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    folder,
    resourceType,
  });
};
