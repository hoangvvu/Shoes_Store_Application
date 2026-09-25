const express = require('express');
const router = express.Router();
const { productController } = require('../controllers');

router.get('/', productController.getProducts);
router.get('/:slug', productController.getProductBySlug);

module.exports = router;
