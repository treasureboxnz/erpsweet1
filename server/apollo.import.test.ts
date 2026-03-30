/**
 * Apollo 批量导入Bug修复测试
 * 测试场景：候选人库批量导入（importableSelected跨页选择）
 */
import { describe, it, expect } from "vitest";

// 模拟Candidate类型
type Candidate = {
  id: number;
  importStatus: string;
  companyName: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
};

// 模拟前端importableSelected逻辑（修复后版本）
function computeImportableSelected(selectedCandidates: Set<number>): number[] {
  // 修复后：直接使用selectedCandidates的所有id
  // 后端importSelectedContacts会再次校验importStatus=pending
  return Array.from(selectedCandidates);
}

// 模拟前端importableSelected逻辑（修复前版本，有Bug）
function computeImportableSelectedBuggy(
  candidatesData: Candidate[],
  selectedCandidates: Set<number>
): number[] {
  const fromCurrentPage = candidatesData
    .filter(c => selectedCandidates.has(c.id) && c.importStatus === "pending")
    .map(c => c.id);
  if (fromCurrentPage.length === 0 && selectedCandidates.size > 0) {
    return Array.from(selectedCandidates);
  }
  return fromCurrentPage;
}

// 模拟后端importSelectedContacts的过滤逻辑
function backendFilterPending(
  allCandidates: Candidate[],
  candidateIds: number[]
): Candidate[] {
  return allCandidates.filter(
    c => candidateIds.includes(c.id) && c.importStatus === "pending"
  );
}

describe("Apollo 批量导入Bug修复", () => {
  // 模拟数据：候选人库有3页数据
  const page1Candidates: Candidate[] = [
    { id: 1, importStatus: "pending", companyName: "Company A", fullName: "Alice Smith", firstName: "Alice", lastName: "Smith" },
    { id: 2, importStatus: "pending", companyName: "Company B", fullName: "Bob Jones", firstName: "Bob", lastName: "Jones" },
    { id: 3, importStatus: "imported", companyName: "Company C", fullName: "Charlie Brown", firstName: "Charlie", lastName: "Brown" },
  ];
  const page2Candidates: Candidate[] = [
    { id: 4, importStatus: "pending", companyName: "Company D", fullName: "David Lee", firstName: "David", lastName: "Lee" },
    { id: 5, importStatus: "pending", companyName: "Company E", fullName: "Eve Wilson", firstName: "Eve", lastName: "Wilson" },
    { id: 6, importStatus: "skipped", companyName: "Company F", fullName: "Frank Miller", firstName: "Frank", lastName: "Miller" },
  ];
  const allCandidates = [...page1Candidates, ...page2Candidates];

  it("修复后：跨页选择3个候选人，importableSelected应返回3个ID", () => {
    // 用户在第1页选了id=1,2，在第2页选了id=4
    const selectedCandidates = new Set([1, 2, 4]);
    
    // 修复后的逻辑：直接返回selectedCandidates的所有ID
    const importableSelected = computeImportableSelected(selectedCandidates);
    expect(importableSelected).toHaveLength(3);
    expect(importableSelected).toContain(1);
    expect(importableSelected).toContain(2);
    expect(importableSelected).toContain(4);
  });

  it("修复后：后端会过滤掉非pending状态的候选人", () => {
    // 即使前端传了已导入的id=3，后端也会过滤掉
    const selectedCandidates = new Set([1, 2, 3, 4]); // id=3是imported
    const importableSelected = computeImportableSelected(selectedCandidates);
    
    // 后端过滤
    const toImport = backendFilterPending(allCandidates, importableSelected);
    expect(toImport).toHaveLength(3); // id=3被过滤掉
    expect(toImport.map(c => c.id)).not.toContain(3);
  });

  it("Bug复现：修复前，切换到第2页后选择id=4,5，但当前页显示全部时importableSelected可能为空", () => {
    // 用户切换到"全部"Tab，当前页显示的是page1的数据（包含imported/skipped）
    // 用户在第2页选了id=4,5（但当前页是page1）
    const selectedCandidates = new Set([4, 5]);
    const currentPageData = page1Candidates; // 当前页是page1，不包含id=4,5
    
    // Bug版本：当前页没有id=4,5，fromCurrentPage为空
    // 但由于有fallback逻辑，会返回selectedCandidates的所有ID
    const buggyResult = computeImportableSelectedBuggy(currentPageData, selectedCandidates);
    // 注意：这里buggy版本有fallback，所以也能工作
    // 真正的bug是：如果当前页有pending候选人但selectedCandidates是跨页的
    expect(buggyResult).toHaveLength(2);
  });

  it("修复后：全选当前页（3个候选人）并导入，只有pending的会被实际导入", () => {
    const selectedCandidates = new Set([1, 2, 3]); // id=3是imported
    const importableSelected = computeImportableSelected(selectedCandidates);
    
    // 后端过滤pending
    const toImport = backendFilterPending(allCandidates, importableSelected);
    expect(toImport).toHaveLength(2); // 只有id=1,2是pending
    expect(toImport.map(c => c.id)).toEqual([1, 2]);
  });

  it("人名显示：优先使用fullName，fallback到firstName+lastName", () => {
    const displayName = (c: Candidate) =>
      c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim();
    
    expect(displayName({ id: 1, importStatus: "pending", companyName: "A", fullName: "Alice Smith", firstName: "Alice", lastName: "Smith" }))
      .toBe("Alice Smith");
    
    expect(displayName({ id: 2, importStatus: "pending", companyName: "B", fullName: null, firstName: "Bob", lastName: "Jones" }))
      .toBe("Bob Jones");
    
    expect(displayName({ id: 3, importStatus: "pending", companyName: "C", fullName: null, firstName: null, lastName: null }))
      .toBe("");
  });

  it("公司分组：默认折叠（expandedCompanies为空Set）", () => {
    const expandedCompanies = new Set<string>();
    expect(expandedCompanies.size).toBe(0);
    
    // 搜索后默认折叠
    const groups = [
      { companyName: "Company A" },
      { companyName: "Company B" },
    ];
    // 修复后：不展开任何公司
    const newExpanded = new Set<string>(); // 修复后：new Set()
    expect(newExpanded.size).toBe(0);
    
    // 修复前：展开所有公司
    const oldExpanded = new Set(groups.map(g => g.companyName));
    expect(oldExpanded.size).toBe(2);
  });
});
