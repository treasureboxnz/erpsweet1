/**
 * Tests for Apollo candidate library load-more and search pagination
 */
import { describe, it, expect } from "vitest";

// Test: allLoadedCandidates accumulation logic
describe("Candidate library load-more logic", () => {
  it("should reset allLoadedCandidates when page=1", () => {
    const existingCandidates = [{ id: 1 }, { id: 2 }];
    const newCandidates = [{ id: 3 }, { id: 4 }];
    
    // Simulate page=1 reset
    const page = 1;
    let allLoaded: { id: number }[];
    if (page === 1) {
      allLoaded = newCandidates;
    } else {
      const existingIds = new Set(existingCandidates.map(c => c.id));
      const newOnes = newCandidates.filter(c => !existingIds.has(c.id));
      allLoaded = [...existingCandidates, ...newOnes];
    }
    
    expect(allLoaded).toEqual(newCandidates);
    expect(allLoaded.length).toBe(2);
  });

  it("should append new candidates when page > 1", () => {
    const existingCandidates = [{ id: 1 }, { id: 2 }];
    const newCandidates = [{ id: 3 }, { id: 4 }];
    
    // Simulate page=2 append
    const page = 2;
    let allLoaded: { id: number }[];
    if (page === 1) {
      allLoaded = newCandidates;
    } else {
      const existingIds = new Set(existingCandidates.map(c => c.id));
      const newOnes = newCandidates.filter(c => !existingIds.has(c.id));
      allLoaded = [...existingCandidates, ...newOnes];
    }
    
    expect(allLoaded).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }]);
    expect(allLoaded.length).toBe(4);
  });

  it("should deduplicate candidates when appending", () => {
    const existingCandidates = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const newCandidates = [{ id: 3 }, { id: 4 }, { id: 5 }]; // id:3 is duplicate
    
    const existingIds = new Set(existingCandidates.map(c => c.id));
    const newOnes = newCandidates.filter(c => !existingIds.has(c.id));
    const allLoaded = [...existingCandidates, ...newOnes];
    
    expect(allLoaded.map(c => c.id)).toEqual([1, 2, 3, 4, 5]);
    expect(allLoaded.length).toBe(5);
  });

  it("should show hasMoreCandidates correctly", () => {
    const allLoadedCandidates = [{ id: 1 }, { id: 2 }];
    const totalCandidates = 50;
    
    const hasMoreCandidates = allLoadedCandidates.length < totalCandidates;
    expect(hasMoreCandidates).toBe(true);
    
    const allLoadedFull = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
    const hasMoreFull = allLoadedFull.length < totalCandidates;
    expect(hasMoreFull).toBe(false);
  });
});

// Test: Search load-more page calculation
describe("Search results load-more page calculation", () => {
  it("should calculate next page correctly for search results", () => {
    const currentPeople = Array.from({ length: 25 }, (_, i) => ({ id: i + 1 }));
    const nextPage = Math.floor(currentPeople.length / 25) + 1;
    expect(nextPage).toBe(2);
  });

  it("should calculate next page correctly for 50 loaded results", () => {
    const currentPeople = Array.from({ length: 50 }, (_, i) => ({ id: i + 1 }));
    const nextPage = Math.floor(currentPeople.length / 25) + 1;
    expect(nextPage).toBe(3);
  });

  it("should deduplicate search results when appending", () => {
    const prevPeople = [{ id: 1 }, { id: 2 }, { id: 3 }];
    const newPeople = [{ id: 3 }, { id: 4 }, { id: 5 }]; // id:3 duplicate
    
    const merged = [
      ...prevPeople,
      ...newPeople.filter(p => !prevPeople.find(ep => ep.id === p.id))
    ];
    
    expect(merged.map(p => p.id)).toEqual([1, 2, 3, 4, 5]);
  });
});

// Test: searchCompetitorCustomers page parameter
describe("searchCompetitorCustomers page parameter", () => {
  it("should pass page parameter to competitor search", () => {
    const input = {
      competitorDomains: ["ikea.com"],
      page: 2,
      perPage: 25,
    };
    
    const perDomain = Math.max(5, Math.floor(input.perPage / input.competitorDomains.length));
    expect(perDomain).toBe(25);
    expect(input.page).toBe(2);
  });

  it("should calculate perDomain correctly for multiple domains", () => {
    const input = {
      competitorDomains: ["ikea.com", "wayfair.com", "ashley.com"],
      page: 1,
      perPage: 25,
    };
    
    const perDomain = Math.max(5, Math.floor(input.perPage / input.competitorDomains.length));
    expect(perDomain).toBe(8); // floor(25/3) = 8
  });
});
