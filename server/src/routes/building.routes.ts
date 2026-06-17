import express from 'express';
import { buildingController } from '../controllers/building.controller';

const router = express.Router();

// GET /api/buildings - Lấy danh sách
router.get('/', buildingController.getAllBuildings);

// POST /api/buildings - Tạo mới
router.post('/', buildingController.createBuilding);

// PUT /api/buildings/:id - Cập nhật
router.put('/:id', buildingController.updateBuilding);

// DELETE /api/buildings/:id - Xóa
router.delete('/:id', buildingController.deleteBuilding);

export default router;