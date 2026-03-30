import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { 
  materialSuppliers, 
  materialBoards, 
  materialColors,
  variantMaterials,
  materialTypes
} from "../../drizzle/schema";
import { eq, desc, asc, like, and, sql, getTableColumns } from "drizzle-orm";

export const materialsRouter = router({
  // ==================== Material Categories ====================
  // Note: materialCategories table does not exist in schema
  // Commented out until the table is created
  /*
  categories: router({
    list: protectedProcedure
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const categories = await db
          .select()
          .from(materialCategories)
          .orderBy(materialCategories.name);
        
        return categories;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const [category] = await db.insert(materialCategories).values(input);
        
        return { success: true, id: category.insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { id, ...data } = input;
        
        await db.update(materialCategories)
          .set(data)
          .where(eq(materialCategories.id, id));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        await db.delete(materialCategories)
          .where(eq(materialCategories.id, input.id));
        
        return { success: true };
      }),
  }),
  */
  
  // ==================== Material Suppliers ====================
  
  /**
   * Get all material suppliers
   */
  suppliers: router({
    list: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        materialTypeId: z.number().optional(),
        materialTypeName: z.string().optional(), // filter by attribute name (real data source)
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const conditions = [eq(materialSuppliers.erpCompanyId, ctx.user.erpCompanyId)];
        if (input.search) {
          conditions.push(
            sql`(${materialSuppliers.name} LIKE ${`%${input.search}%`} OR ${materialSuppliers.code} LIKE ${`%${input.search}%`})`
          );
        }
        if (input.status) {
          conditions.push(eq(materialSuppliers.status, input.status));
        }
        if (input.materialTypeName) {
          // Filter by materialTypeName (attribute management data source)
          conditions.push(eq(materialSuppliers.materialTypeName, input.materialTypeName));
        } else if (input.materialTypeId) {
          conditions.push(eq(materialSuppliers.materialTypeId, input.materialTypeId));
        }
        
        const suppliers = await db
          .select()
          .from(materialSuppliers)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(
            sql`CASE WHEN ${materialSuppliers.code} = 'SYS' THEN 0 ELSE 1 END`,
            desc(materialSuppliers.createdAt)
          );
        
        return suppliers;
      }),
    
    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        categoryId: z.number().optional(),
        materialTypeId: z.number().nullable().optional(),
        materialTypeName: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.union([z.string().email(), z.literal("")]).optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const [supplier] = await db.insert(materialSuppliers).values({
          ...input,
          status: "active",
          erpCompanyId: ctx.user.erpCompanyId,
        });
        
        return { success: true, id: supplier.insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        code: z.string().min(1).optional(),
        categoryId: z.number().optional(),
        materialTypeId: z.number().nullable().optional(),
        materialTypeName: z.string().optional(),
        contactPerson: z.string().optional(),
        contactPhone: z.string().optional(),
        contactEmail: z.union([z.string().email(), z.literal("")]).optional(),
        address: z.string().optional(),
        notes: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { id, ...data } = input;
        
        // Update supplier
        await db.update(materialSuppliers)
          .set(data)
          .where(and(eq(materialSuppliers.id, id), eq(materialSuppliers.erpCompanyId, ctx.user.erpCompanyId)));
        
        // Cascade: If supplier is set to inactive, set all related boards and colors to inactive
        if (input.status === "inactive") {
          // Get all boards for this supplier
          const boards = await db
            .select({ id: materialBoards.id })
            .from(materialBoards)
            .where(eq(materialBoards.supplierId, id));
          
          const boardIds = boards.map(b => b.id);
          
          // Set all boards to inactive
          if (boardIds.length > 0) {
            await db.update(materialBoards)
              .set({ status: "inactive" })
              .where(sql`${materialBoards.id} IN (${sql.join(boardIds.map(bid => sql`${bid}`), sql`, `)})`);
            
            // Set all colors related to these boards to inactive
            await db.update(materialColors)
              .set({ status: "inactive" })
              .where(sql`${materialColors.boardId} IN (${sql.join(boardIds.map(bid => sql`${bid}`), sql`, `)})`);
          }
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // 检查是否为锁定的供应商
        const [supplier] = await db.select().from(materialSuppliers)
          .where(eq(materialSuppliers.id, input.id))
          .limit(1);
        
        if (supplier && supplier.isLocked) {
          throw new Error("系统默认材料供应商已锁定，不可删除");
        }
        
        await db.delete(materialSuppliers)
          .where(eq(materialSuppliers.id, input.id));
        
        return { success: true };
      }),
  }),
  
  // ==================== Material Boards ====================
  boards: router({
    list: protectedProcedure
      .input(
        z.object({
          supplierId: z.number().nullable().optional(),
          search: z.string().nullable().optional(),
          status: z.enum(["active", "inactive"]).optional(),
        })
      )
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Build conditions for boards query
        const conditions = [eq(materialBoards.erpCompanyId, ctx.user.erpCompanyId)];
        if (input.supplierId) {
          conditions.push(eq(materialBoards.supplierId, input.supplierId));
        }
        if (input.search) {
          conditions.push(
            sql`(${materialBoards.boardNumber} LIKE ${`%${input.search}%`} OR ${materialBoards.boardName} LIKE ${`%${input.search}%`})`
          );
        }
        if (input.status) {
          conditions.push(eq(materialBoards.status, input.status));
        }
        
        // Query 1: Get all boards
        const boards = await db
          .select()
          .from(materialBoards)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(
            sql`CASE WHEN ${materialBoards.boardNumber} = 'COL' THEN 0 ELSE 1 END`,
            asc(materialBoards.boardNumber)
          );
        
        // Query 2: Get all suppliers (for mapping)
        const supplierIds = Array.from(new Set(boards.map(b => b.supplierId).filter(Boolean)));
        const suppliers = supplierIds.length > 0
          ? await db.select().from(materialSuppliers).where(sql`${materialSuppliers.id} IN (${sql.join(supplierIds.map(id => sql`${id}`), sql`, `)})`)
          : [];
        
        // Manual join: combine boards with suppliers
        const supplierMap = new Map(suppliers.map(s => [s.id, s]));
        const results = boards.map(board => ({
          board,
          supplier: board.supplierId ? supplierMap.get(board.supplierId) || null : null,
        }));
        
        return results;
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const [board] = await db
          .select({
            board: materialBoards,
            supplier: materialSuppliers,
          })
          .from(materialBoards)
          .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
          .where(eq(materialBoards.id, input.id));
        
        if (!board) {
          throw new Error("Material board not found");
        }
        
        return board;
      }),
    
    create: protectedProcedure
      .input(z.object({
        supplierId: z.number(),
        boardNumber: z.string().min(1),
        boardName: z.string().optional(),
        materialType: z.string().optional(),
        pricePerMeter: z.string(),
        currency: z.string().default("CNY"),
        minOrderQuantity: z.number().optional(),
        leadTime: z.number().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const [board] = await db.insert(materialBoards).values({
          ...input,
          status: "active",
          erpCompanyId: ctx.user.erpCompanyId,
        });
        
        return { success: true, id: board.insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        supplierId: z.number().optional(),
        boardNumber: z.string().min(1).optional(),
        boardName: z.string().optional(),
        materialType: z.string().optional(),
        pricePerMeter: z.string().optional(),
        currency: z.string().optional(),
        minOrderQuantity: z.number().optional(),
        leadTime: z.number().optional(),
        description: z.string().optional(),
        notes: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { id, ...data } = input;
        
        // Update board
        await db.update(materialBoards)
          .set(data)
          .where(and(eq(materialBoards.id, id), eq(materialBoards.erpCompanyId, ctx.user.erpCompanyId)));
        
        // Cascade: If board is set to inactive, set all related colors to inactive
        if (input.status === "inactive") {
          await db.update(materialColors)
            .set({ status: "inactive" })
            .where(and(eq(materialColors.boardId, id), eq(materialColors.erpCompanyId, ctx.user.erpCompanyId)));
        }
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // 检查是否为锁定的布板
        const [board] = await db.select().from(materialBoards)
          .where(eq(materialBoards.id, input.id))
          .limit(1);
        
        if (board && board.isLocked) {
          throw new Error("系统默认材料分类已锁定，不可删除");
        }
        
        await db.delete(materialBoards)
          .where(eq(materialBoards.id, input.id));
        
        return { success: true };
      }),
    
    batchUpdateStatus: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
        status: z.enum(["active", "inactive"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Update all boards
        for (const id of input.ids) {
          await db.update(materialBoards)
            .set({ status: input.status })
            .where(and(eq(materialBoards.id, id), eq(materialBoards.erpCompanyId, ctx.user.erpCompanyId)));
        }
        
        // Cascade: If boards are set to inactive, set all related colors to inactive
        if (input.status === "inactive" && input.ids.length > 0) {
          await db.update(materialColors)
            .set({ status: "inactive" })
            .where(sql`${materialColors.boardId} IN (${sql.join(input.ids.map(id => sql`${id}`), sql`, `)})`);
        }
        
        return { success: true };
      }),
  }),
  
  // ==================== Material Colors ====================
  
  colors: router({
    list: protectedProcedure
      .input(z.object({
        materialTypeId: z.number().optional(),
        materialTypeName: z.string().optional(), // filter by attribute name
        supplierId: z.number().optional(),
        boardId: z.number().optional(),
        search: z.string().optional(),
        status: z.enum(["active", "inactive"]).optional(),
        limit: z.number().optional(), // limit results for dropdown preview
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const conditions = [eq(materialSuppliers.erpCompanyId, ctx.user.erpCompanyId)];
        if (input.materialTypeId) {
          conditions.push(eq(materialSuppliers.materialTypeId, input.materialTypeId));
        }
        if (input.materialTypeName) {
          conditions.push(eq(materialSuppliers.materialTypeName, input.materialTypeName));
        }
        if (input.supplierId) {
          conditions.push(eq(materialBoards.supplierId, input.supplierId));
        }
        if (input.boardId) {
          conditions.push(eq(materialColors.boardId, input.boardId));
        }
        if (input.search) {
          conditions.push(
            sql`(
              ${materialColors.colorCode} LIKE ${`%${input.search}%`} 
              OR ${materialColors.colorName} LIKE ${`%${input.search}%`}
              OR ${materialBoards.boardNumber} LIKE ${`%${input.search}%`}
              OR ${materialSuppliers.name} LIKE ${`%${input.search}%`}
            )`
          );
        }
        if (input.status) {
          conditions.push(eq(materialColors.status, input.status));
        }
        
        const query = db
          .select({
            color: materialColors,
            board: materialBoards,
            supplier: materialSuppliers,
          })
          .from(materialColors)
          .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
          .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(
            sql`CASE WHEN ${materialColors.colorCode} = 'ORIG' THEN 0 ELSE 1 END`,
            desc(materialColors.usageCount), // 热度排序：引用次数多的排前面
            materialColors.sortOrder,
            desc(materialColors.createdAt)
          );
        
        const colors = input.limit ? await query.limit(input.limit) : await query;
        
        return colors;
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const [color] = await db
          .select({
            color: materialColors,
            board: materialBoards,
            supplier: materialSuppliers,
          })
          .from(materialColors)
          .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
          .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
          .where(eq(materialColors.id, input.id));
        
        if (!color) {
          throw new Error("Material color not found");
        }
        
        return color;
      }),
    
    create: protectedProcedure
      .input(z.object({
        boardId: z.number(),
        colorCode: z.string().min(1),
        colorName: z.string().optional(),
        hexColor: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
        thumbnailUrl: z.string().optional(),
        stockQuantity: z.number().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().default(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Get board and supplier info to generate fullCode
        const [boardInfo] = await db
          .select({
            boardNumber: materialBoards.boardNumber,
            supplierCode: materialSuppliers.code,
          })
          .from(materialBoards)
          .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
          .where(eq(materialBoards.id, input.boardId));
        
        if (!boardInfo) {
          throw new Error("Board not found");
        }
        
        // Generate fullCode: supplierCode-boardNumber-colorCode
        const fullCode = `${boardInfo.supplierCode}-${boardInfo.boardNumber}-${input.colorCode}`;
        
        const [color] = await db.insert(materialColors).values({
          ...input,
          fullCode,
          stockQuantity: input.stockQuantity ?? 999999, // 默认库存为999999
          status: "active",
          erpCompanyId: ctx.user.erpCompanyId,
        } as any);
        
        return { success: true, id: color.insertId };
      }),
    
    batchCreate: protectedProcedure
      .input(z.object({
        boardId: z.number(),
        colors: z.array(z.object({
          colorCode: z.string().min(1),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // Get board and supplier info to generate fullCode
        const [boardInfo] = await db
          .select({
            boardNumber: materialBoards.boardNumber,
            supplierCode: materialSuppliers.code,
          })
          .from(materialBoards)
          .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
          .where(eq(materialBoards.id, input.boardId));
        
        if (!boardInfo) {
          throw new Error("Board not found");
        }
        
        // Prepare batch insert data
        const colorsToInsert = input.colors.map((color) => ({
          boardId: input.boardId,
          colorCode: color.colorCode,
          fullCode: `${boardInfo.supplierCode}-${boardInfo.boardNumber}-${color.colorCode}`,
          stockQuantity: 999999,
          status: "active" as const,
          sortOrder: 0,
          erpCompanyId: ctx.user.erpCompanyId,
        }));
        
        // Batch insert
        await db.insert(materialColors).values(colorsToInsert as any);
        
        return { success: true, count: colorsToInsert.length };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        boardId: z.number().optional(),
        colorCode: z.string().min(1).optional(),
        colorName: z.string().optional(),
        hexColor: z.string().optional(),
        imageUrl: z.string().nullable().optional(),
        thumbnailUrl: z.string().optional(),
        stockQuantity: z.number().optional(),
        notes: z.string().optional(),
        sortOrder: z.number().optional(),
        status: z.enum(["active", "inactive"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { id, ...data } = input;
        
        // If boardId or colorCode changed, regenerate fullCode
        if (data.boardId || data.colorCode) {
          // Get current color info
          const [currentColor] = await db
            .select()
            .from(materialColors)
            .where(and(eq(materialColors.id, id), eq(materialColors.erpCompanyId, ctx.user.erpCompanyId)));
          
          if (!currentColor) {
            throw new Error("Color not found");
          }
          
          const targetBoardId = data.boardId || currentColor.boardId;
          const targetColorCode = data.colorCode || currentColor.colorCode;
          
          // Get board and supplier info
          const [boardInfo] = await db
            .select({
              boardNumber: materialBoards.boardNumber,
              supplierCode: materialSuppliers.code,
            })
            .from(materialBoards)
            .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
            .where(eq(materialBoards.id, targetBoardId));
          
          if (!boardInfo) {
            throw new Error("Board not found");
          }
          
          // Generate fullCode: supplierCode-boardNumber-colorCode
          (data as any).fullCode = `${boardInfo.supplierCode}-${boardInfo.boardNumber}-${targetColorCode}`;
        }
        
        await db.update(materialColors)
          .set(data)
          .where(and(eq(materialColors.id, id), eq(materialColors.erpCompanyId, ctx.user.erpCompanyId)));
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        // 检查是否为锁定的颜色
        const [color] = await db.select().from(materialColors)
          .where(eq(materialColors.id, input.id))
          .limit(1);
        
        if (color && color.isLocked) {
          throw new Error("系统默认颜色已锁定，不可删除");
        }
        
        await db.delete(materialColors)
          .where(eq(materialColors.id, input.id));
        
        return { success: true };
      }),
    
    updateSortOrder: protectedProcedure
      .input(z.object({
        colors: z.array(z.object({
          id: z.number(),
          sortOrder: z.number(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        for (const color of input.colors) {
          await db.update(materialColors)
            .set({ sortOrder: color.sortOrder })
            .where(eq(materialColors.id, color.id));
        }
        
        return { success: true };
      }),
    
    batchDelete: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        for (const id of input.ids) {
          await db.delete(materialColors)
            .where(and(eq(materialColors.id, id), eq(materialColors.erpCompanyId, ctx.user.erpCompanyId)));
        }
        
        return { success: true };
      }),
    
    batchUpdateStatus: protectedProcedure
      .input(z.object({
        ids: z.array(z.number()),
        status: z.enum(["active", "inactive"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        for (const id of input.ids) {
          await db.update(materialColors)
            .set({ status: input.status })
            .where(and(eq(materialColors.id, id), eq(materialColors.erpCompanyId, ctx.user.erpCompanyId)));
        }
        
        return { success: true };
      }),
  }),
  
  // ==================== Variant Materials ====================
  
  variantMaterials: router({
    list: protectedProcedure
      .input(z.object({
        variantId: z.number(),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const materials = await db
          .select({
            variantMaterial: variantMaterials,
            color: materialColors,
            board: materialBoards,
            supplier: materialSuppliers,
          })
          .from(variantMaterials)
          .leftJoin(materialColors, eq(variantMaterials.materialColorId, materialColors.id))
          .leftJoin(materialBoards, eq(materialColors.boardId, materialBoards.id))
          .leftJoin(materialSuppliers, eq(materialBoards.supplierId, materialSuppliers.id))
          .where(eq(variantMaterials.variantId, input.variantId))
          .orderBy(desc(variantMaterials.createdAt));
        
        return materials;
      }),
    
    add: protectedProcedure
      .input(z.object({
        variantId: z.number(),
        materialColorId: z.number(),
        quantityUsed: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        const [material] = await db.insert(variantMaterials).values({
          ...input,
          erpCompanyId: ctx.user.erpCompanyId,
        });
        
        return { success: true, id: material.insertId };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        quantityUsed: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        const { id, ...data } = input;
        
        await db.update(variantMaterials)
          .set(data)
          .where(eq(variantMaterials.id, id));
        
        return { success: true };
      }),
    
    remove: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database connection failed");
        
        await db.delete(variantMaterials)
          .where(eq(variantMaterials.id, input.id));
        
        return { success: true };
      }),
  }),
});
