import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import {
  getProductImages,
  addProductImages,
  updateProductImageOrder,
  deleteProductImage,
  setPrimaryImage,
} from "../productImages";
import { getProductById } from "../db";
import { storagePut } from "../storage";
import { randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";

export const productImagesRouter = router({
  // 获取产品的所有图片
  getByProductId: protectedProcedure
    .input(z.object({ productId: z.number() }))
    .query(async ({ input, ctx }) => {
      // 验证产品所有权
      const product = await getProductById(input.productId, ctx.user.erpCompanyId);
      if (!product) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "产品不存在或无权访问",
        });
      }
      
      return await getProductImages(input.productId);
    }),

  // 批量添加图片到产品
  addImages: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        images: z.array(
          z.object({
            imageUrl: z.string(),
            imageKey: z.string(),
            sortOrder: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证产品所有权
      const product = await getProductById(input.productId, ctx.user.erpCompanyId);
      if (!product) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "产品不存在或无权访问",
        });
      }
      
      const imagesToInsert = input.images.map((img, index) => ({
        erpCompanyId: ctx.user.erpCompanyId,
        productId: input.productId,
        imageUrl: img.imageUrl,
        imageKey: img.imageKey,
        sortOrder: img.sortOrder ?? index,
        isPrimary: index === 0, // 第一张图片设为主图
      }));
      
      return await addProductImages(imagesToInsert);
    }),

  // 更新图片排序
  updateOrder: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        imageOrders: z.array(
          z.object({
            id: z.number(),
            sortOrder: z.number(),
            isPrimary: z.boolean(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证产品所有权
      const product = await getProductById(input.productId, ctx.user.erpCompanyId);
      if (!product) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "产品不存在或无权访问",
        });
      }
      
      return await updateProductImageOrder(input.productId, input.imageOrders);
    }),

  // 删除图片
  deleteImage: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        imageId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证产品所有权
      const product = await getProductById(input.productId, ctx.user.erpCompanyId);
      if (!product) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "产品不存在或无权访问",
        });
      }
      
      return await deleteProductImage(input.productId, input.imageId);
    }),

  // 设置主图
  setPrimary: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        imageId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证产品所有权
      const product = await getProductById(input.productId, ctx.user.erpCompanyId);
      if (!product) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "产品不存在或无权访问",
        });
      }
      
      return await setPrimaryImage(input.productId, input.imageId);
    }),

  // 直接上传图片到产品（不经过媒体库）
  uploadImage: protectedProcedure
    .input(
      z.object({
        productId: z.number(),
        productSku: z.string(),
        fileName: z.string(),
        fileData: z.string(), // base64 encoded
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // 验证产品所有权
      const product = await getProductById(input.productId, ctx.user.erpCompanyId);
      if (!product) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "产品不存在或无权访问",
        });
      }
      
      // 生成随机后缀防止文件名冲突
      const randomSuffix = randomBytes(4).toString('hex');
      const fileExtension = input.fileName.split('.').pop();
      const newFileName = `${input.fileName.replace(/\.[^/.]+$/, '')}-${randomSuffix}.${fileExtension}`;
      
      // 上传到S3，路径为 product-media/{SKU}/{fileName}
      const fileKey = `product-media/${input.productSku}/${newFileName}`;
      const buffer = Buffer.from(input.fileData, 'base64');
      
      const { url } = await storagePut(fileKey, buffer, input.mimeType);
      
      // 获取当前产品的图片数量，用于设置sortOrder
      const existingImages = await getProductImages(input.productId);
      const sortOrder = existingImages.length;
      
      // 添加图片记录到数据库
      await addProductImages([
        {
          erpCompanyId: ctx.user.erpCompanyId,
          productId: input.productId,
          imageUrl: url,
          imageKey: fileKey,
          sortOrder,
          isPrimary: sortOrder === 0, // 第一张图片设为主图
        },
      ]);
      
      return { url, fileKey, sortOrder };
    }),
});
