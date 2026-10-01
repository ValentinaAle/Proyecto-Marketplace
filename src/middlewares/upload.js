const multer = require('multer');

// Guardamos el archivo en memoria (buffer) para pasarlo directo a Cloudinary,
// sin escribirlo antes en disco.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

  if (!tiposPermitidos.includes(file.mimetype)) {
    return cb(new Error('Formato de imagen no soportado. Usá JPG, PNG o WEBP.'));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

module.exports = upload;
