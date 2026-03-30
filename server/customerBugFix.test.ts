import { describe, expect, it } from "vitest";
import * as customerMgmt from "./customerManagement";

const TEST_ERP_COMPANY_ID = 1; // 使用测试租户ID

describe("Customer Management - Bug Fix: Handle undefined fields", () => {
  it("should create company with minimal required fields only", async () => {
    const companyData = {
      companyName: "Test Company " + Date.now(),
      createdBy: 1,
      // All other fields are undefined
    };

    const id = await customerMgmt.createCompany(companyData as any, TEST_ERP_COMPANY_ID);
    expect(id).toBeTypeOf("number");
    expect(id).toBeGreaterThan(0);

    const company = await customerMgmt.getCompanyById(id, TEST_ERP_COMPANY_ID);
    expect(company).toBeDefined();
    expect(company?.companyName).toContain("Test Company");
  });

  it("should create company with partial fields without errors", async () => {
    const companyData = {
      companyName: "Partial Company " + Date.now(),
      country: "USA",
      createdBy: 1,
      // Other fields like city, website, etc. are undefined
    };

    const id = await customerMgmt.createCompany(companyData as any, TEST_ERP_COMPANY_ID);
    expect(id).toBeTypeOf("number");

    const company = await customerMgmt.getCompanyById(id, TEST_ERP_COMPANY_ID);
    expect(company?.companyName).toContain("Partial Company");
    expect(company?.country).toBe("USA");
  });

  it("should update company with partial fields", async () => {
    // Create a company first
    const id = await customerMgmt.createCompany({
      companyName: "Update Test Company " + Date.now(),
      createdBy: 1,
    } as any, TEST_ERP_COMPANY_ID);

    // Update with only some fields
    await customerMgmt.updateCompany(id, {
      country: "China",
      city: "Shanghai",
      // Other fields are undefined
    } as any, TEST_ERP_COMPANY_ID);

    const company = await customerMgmt.getCompanyById(id, TEST_ERP_COMPANY_ID);
    expect(company?.country).toBe("China");
    expect(company?.city).toBe("Shanghai");
    expect(company?.companyName).toContain("Update Test Company");
  });

  it("should create contact with minimal fields", async () => {
    const contactData = {
      fullName: "John Doe " + Date.now(),
      createdBy: 1,
      erpCompanyId: TEST_ERP_COMPANY_ID,
      // All other fields are undefined
    };

    const id = await customerMgmt.createContact(contactData as any);
    expect(id).toBeTypeOf("number");

    const contact = await customerMgmt.getContactById(id);
    expect(contact?.fullName).toContain("John Doe");
  });

  it("should create follow-up record with minimal fields", async () => {
    // Create a company first
    const companyId = await customerMgmt.createCompany({
      companyName: "Follow-up Test Company " + Date.now(),
      createdBy: 1,
    } as any, TEST_ERP_COMPANY_ID);

    const followUpData = {
      companyId,
      type: "call" as const,
      content: "Test follow-up",
      followUpBy: 1,
      erpCompanyId: TEST_ERP_COMPANY_ID,
      // Other fields are undefined
    };

    const id = await customerMgmt.createFollowUpRecord(followUpData as any);
    expect(id).toBeTypeOf("number");

    const followUps = await customerMgmt.getFollowUpsByCompany(companyId);
    expect(followUps.length).toBeGreaterThan(0);
    expect(followUps[0]?.content).toBe("Test follow-up");
  });
});
