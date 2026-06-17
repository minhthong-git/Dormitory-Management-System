import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient() as PrismaClient & { building: any };

export const buildingController = {
  // 1. Lấy danh sách tất cả Tòa nhà
  getAllBuildings: async (_req: Request, res: Response) => {
    try {
      const buildings = await prisma.building.findMany({
        orderBy: { createdAt: 'desc' },
        // THÊM ĐOẠN NÀY ĐỂ LẤY KÈM DANH SÁCH PHÒNG
        include: {
          rooms: true 
        }
      });
      return res.status(200).json({ success: true, data: buildings });
    } catch (error) {
      console.error("Lỗi khi lấy danh sách tòa nhà:", error);
      return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // 2. Thêm mới một Tòa nhà
  createBuilding: async (req: Request, res: Response) => {
    try {
      const { name, genderType, description } = req.body;

      const existingBuilding = await prisma.building.findUnique({
        where: { name }
      });
      if (existingBuilding) {
        return res.status(400).json({ success: false, message: 'Tên tòa nhà đã tồn tại!' });
      }

      const newBuilding = await prisma.building.create({
        data: { name, genderType, description }
      });

      return res.status(201).json({ success: true, data: newBuilding, message: 'Thêm tòa nhà thành công' });
    } catch (error) {
      console.error("Lỗi khi tạo tòa nhà:", error);
      return res.status(500).json({ success: false, message: 'Lỗi server' });
    }
  },

  // 3. Cập nhật thông tin Tòa nhà
  updateBuilding: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { name, genderType, description } = req.body;

      const updatedBuilding = await prisma.building.update({
        where: { id },
        data: { name, genderType, description }
      });

      return res.status(200).json({ success: true, data: updatedBuilding, message: 'Cập nhật thành công' });
    } catch (error) {
      console.error("Lỗi khi cập nhật tòa nhà:", error);
      return res.status(500).json({ success: false, message: 'Lỗi server hoặc tòa nhà không tồn tại' });
    }
  },

  // 4. Xóa Tòa nhà
  deleteBuilding: async (req: Request, res: Response) => {
    try {
      const { id } = req.params;

      await prisma.building.delete({
        where: { id }
      });

      return res.status(200).json({ success: true, message: 'Xóa tòa nhà thành công' });
    } catch (error) {
      console.error("Lỗi khi xóa tòa nhà:", error);
      return res.status(500).json({ success: false, message: 'Không thể xóa tòa nhà này' });
    }
  }
};