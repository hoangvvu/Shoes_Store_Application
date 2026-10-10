const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const { auth, requireRole } = require('../middleware');

const router = express.Router();

router.use(auth, requireRole('ADMIN', 'STAFF'));

router.get('/', inventoryController.getStockList);
router.get('/low-stock', inventoryController.getLowStock);
router.get('/movement-report', inventoryController.getMovementReport);
router.get('/:variantId/ledger', inventoryController.getVariantLedger);
router.post('/adjust', inventoryController.adjustStock);

module.exports = router;
