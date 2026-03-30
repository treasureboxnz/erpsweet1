import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "./db";
import { createTag, getAllTags, getTagById, updateTag, deleteTag } from "./tags";
import { tags } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const TEST_ERP_COMPANY_ID = 1; // 使用测试租户ID

describe("Tag Management", () => {
  let testTagId: number;

  beforeAll(async () => {
    // Clean up any existing test tags for this company
    const db = await getDb();
    if (db) {
      await db.delete(tags).where(eq(tags.erpCompanyId, TEST_ERP_COMPANY_ID));
    }
  });

  afterAll(async () => {
    // Clean up test data
    const db = await getDb();
    if (db) {
      await db.delete(tags).where(eq(tags.erpCompanyId, TEST_ERP_COMPANY_ID));
    }
  });

  it("should create a new tag", async () => {
    const newTag = await createTag({
      name: "测试标签",
      color: "#3b82f6",
      description: "这是一个测试标签",
      createdBy: 1,
    }, TEST_ERP_COMPANY_ID);

    expect(newTag).toBeDefined();
    expect(newTag!.name).toBe("测试标签");
    expect(newTag!.color).toBe("#3b82f6");
    expect(newTag!.description).toBe("这是一个测试标签");
    testTagId = newTag!.id;
  });

  it("should get all tags", async () => {
    const allTags = await getAllTags(TEST_ERP_COMPANY_ID);
    expect(allTags).toBeDefined();
    expect(allTags.length).toBeGreaterThan(0);
    expect(allTags[0].name).toBe("测试标签");
  });

  it("should get tag by id", async () => {
    const tag = await getTagById(testTagId, TEST_ERP_COMPANY_ID);
    expect(tag).toBeDefined();
    expect(tag?.id).toBe(testTagId);
    expect(tag?.name).toBe("测试标签");
  });

  it("should update tag", async () => {
    const updatedTag = await updateTag(testTagId, {
      name: "更新后的标签",
      description: "更新后的描述",
    }, TEST_ERP_COMPANY_ID);

    expect(updatedTag).toBeDefined();
    expect(updatedTag?.name).toBe("更新后的标签");
    expect(updatedTag?.description).toBe("更新后的描述");
  });

  it("should prevent duplicate tag names", async () => {
    await expect(
      createTag({
        name: "更新后的标签",
        color: "#ef4444",
        createdBy: 1,
      }, TEST_ERP_COMPANY_ID)
    ).rejects.toThrow("标签");
  });

  it("should delete tag", async () => {
    await deleteTag(testTagId, TEST_ERP_COMPANY_ID);
    const deletedTag = await getTagById(testTagId, TEST_ERP_COMPANY_ID);
    expect(deletedTag).toBeNull();
  });
});
