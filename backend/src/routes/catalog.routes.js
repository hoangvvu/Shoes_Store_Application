const express = require('express');
const catalogController = require('../controllers/catalog.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

// ================= CATEGORIES (/api/v1/categories) =================
const categoryRouter = express.Router();
categoryRouter.get('/', catalogController.getCategories);
categoryRouter.get('/:id', catalogController.getCategoryById);
categoryRouter.post('/', auth, requireRole('ADMIN'), catalogController.createCategory);
categoryRouter.put('/:id', auth, requireRole('ADMIN'), catalogController.updateCategory);
categoryRouter.delete('/:id', auth, requireRole('ADMIN'), catalogController.deleteCategory);

// ================= BRANDS (/api/v1/brands) =================
const brandRouter = express.Router();
brandRouter.get('/', catalogController.getBrands);
brandRouter.get('/:id', catalogController.getBrandById);
brandRouter.post('/', auth, requireRole('ADMIN'), catalogController.createBrand);
brandRouter.put('/:id', auth, requireRole('ADMIN'), catalogController.updateBrand);
brandRouter.delete('/:id', auth, requireRole('ADMIN'), catalogController.deleteBrand);

// ================= SIZES (/api/v1/sizes) =================
const sizeRouter = express.Router();
sizeRouter.get('/', catalogController.getSizes);
sizeRouter.get('/:id', catalogController.getSizeById);
sizeRouter.post('/', auth, requireRole('ADMIN'), catalogController.createSize);
sizeRouter.put('/:id', auth, requireRole('ADMIN'), catalogController.updateSize);
sizeRouter.delete('/:id', auth, requireRole('ADMIN'), catalogController.deleteSize);

// ================= COLORS (/api/v1/colors) =================
const colorRouter = express.Router();
colorRouter.get('/', catalogController.getColors);
colorRouter.get('/:id', catalogController.getColorById);
colorRouter.post('/', auth, requireRole('ADMIN'), catalogController.createColor);
colorRouter.put('/:id', auth, requireRole('ADMIN'), catalogController.updateColor);
colorRouter.delete('/:id', auth, requireRole('ADMIN'), catalogController.deleteColor);

module.exports = {
  categoryRouter,
  brandRouter,
  sizeRouter,
  colorRouter,
};
