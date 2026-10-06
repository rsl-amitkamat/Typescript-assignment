import { OrganizationService } from "../src/services";
import {
  Designation,
  ConflictError,
  NotFoundError,
  HierarchyError,
  ValidationError,
} from "../src/types";
import {
  validateDateFormat,
  validateRequiredString,
  validateDesignation,
  validateReportingHierarchy,
  isLeapYear,
} from "../src/utils/validator";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`[ASSERTION FAILED]: ${message}`);
  }
}

function assertThrows(
  fn: () => void,
  expectedErrorType: new (...args: any[]) => Error,
  message: string
): void {
  let threw = false;
  try {
    fn();
  } catch (err: unknown) {
    threw = true;
    if (!(err instanceof expectedErrorType)) {
      const errName = err instanceof Error ? err.constructor.name : String(err);
      throw new Error(
        `Expected ${expectedErrorType.name} but caught ${errName} for: ${message}`
      );
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw ${expectedErrorType.name} for: ${message}`);
  }
}

console.log("=============================================================");
console.log("   COMPREHENSIVE AUTOMATED TEST SUITE (ALL REQUIREMENTS)    ");
console.log("=============================================================\n");

let passedTests = 0;
function test(name: string, fn: () => void): void {
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    console.error(`  ✗ ${name}`);
    throw err;
  }
}

// -------------------------------------------------------------
// SECTION 1: VALIDATION UTILITIES & LEAP YEAR RULES
// -------------------------------------------------------------
console.log("Section 1: Validation Utilities & Date Constraints");

test("Should accept valid mm/dd/yyyy dates", () => {
  assert(validateDateFormat("01/15/1990") === "01/15/1990", "Normal date");
  assert(validateDateFormat("12/31/2000") === "12/31/2000", "End of year");
  assert(validateDateFormat("02/29/2024") === "02/29/2024", "Leap year Feb 29");
  assert(validateDateFormat("02/29/2000") === "02/29/2000", "Century leap year Feb 29");
});

test("Should accurately identify leap years", () => {
  assert(isLeapYear(2024) === true, "2024 is leap year");
  assert(isLeapYear(2000) === true, "2000 is century leap year");
  assert(isLeapYear(2023) === false, "2023 is not leap year");
  assert(isLeapYear(1900) === false, "1900 is century non-leap year");
});

test("Should reject invalid date formats and calendar day overruns", () => {
  assertThrows(() => validateDateFormat("1990-01-15"), ValidationError, "ISO format rejected");
  assertThrows(() => validateDateFormat("1/5/1990"), ValidationError, "Missing leading zeros");
  assertThrows(() => validateDateFormat("04/31/2021"), ValidationError, "April 31st rejected");
  assertThrows(() => validateDateFormat("06/31/2022"), ValidationError, "June 31st rejected");
  assertThrows(() => validateDateFormat("02/29/2023"), ValidationError, "Feb 29 on non-leap year rejected");
  assertThrows(() => validateDateFormat("02/29/1900"), ValidationError, "Feb 29 on 1900 rejected");
  assertThrows(() => validateDateFormat("02/30/2024"), ValidationError, "Feb 30 rejected");
  assertThrows(() => validateDateFormat("12/31/2099"), ValidationError, "Future date rejected");
  assertThrows(() => validateDateFormat(""), ValidationError, "Empty date rejected");
});

test("Should validate required strings and designations", () => {
  assert(validateRequiredString("  Alice  ", "name") === "Alice", "Trimmed");
  assertThrows(() => validateRequiredString("   ", "name"), ValidationError, "Blank string rejected");
  assertThrows(() => validateDesignation("VicePresident"), ValidationError, "Invalid designation rejected");
});

// -------------------------------------------------------------
// SECTION 2: REPORTING HIERARCHY RULES
// -------------------------------------------------------------
console.log("\nSection 2: Reporting Hierarchy Constraints");

test("Should allow valid reporting relationships", () => {
  validateReportingHierarchy(Designation.CEO, null);
  validateReportingHierarchy(Designation.Director, Designation.CEO);
  validateReportingHierarchy(Designation.Manager, Designation.Director);
  validateReportingHierarchy(Designation.Lead, Designation.Manager);
  validateReportingHierarchy(Designation.Engineer, Designation.Lead);
});

test("Should reject invalid reporting relationships", () => {
  // CEO cannot report to anyone
  assertThrows(
    () => validateReportingHierarchy(Designation.CEO, Designation.Director),
    HierarchyError,
    "CEO cannot report to Director"
  );
  // Director cannot report to Manager
  assertThrows(
    () => validateReportingHierarchy(Designation.Director, Designation.Manager),
    HierarchyError,
    "Director cannot report to Manager"
  );
  // Engineer cannot report to Manager or Director directly
  assertThrows(
    () => validateReportingHierarchy(Designation.Engineer, Designation.Manager),
    HierarchyError,
    "Engineer cannot report to Manager"
  );
  assertThrows(
    () => validateReportingHierarchy(Designation.Engineer, Designation.Director),
    HierarchyError,
    "Engineer cannot report to Director"
  );
  // Non-CEO must have a supervisor
  assertThrows(
    () => validateReportingHierarchy(Designation.Engineer, null),
    HierarchyError,
    "Engineer must have a supervisor"
  );
});

// -------------------------------------------------------------
// SECTION 3: CRUD & BUSINESS LOGIC IN ORGANIZATIONSERVICE
// -------------------------------------------------------------
console.log("\nSection 3: OrganizationService CRUD & Edge Cases");

const org = new OrganizationService();

test("Should add CEO as root of the organization", () => {
  const ceo = org.addEmployee({
    id: "CEO-001",
    name: "Alice Smith",
    dateOfBirth: "01/15/1975",
    designation: Designation.CEO,
  });
  assert(ceo.id === "CEO-001", "CEO ID");
  assert(ceo.reportsTo === null, "CEO reportsTo is null");
  assert(org.getCEO()?.id === "CEO-001", "getCEO returns CEO");
  assert(org.getEmployeeCount() === 1, "Count is 1");
});

test("Edge Case: Should reject adding duplicate employee ID", () => {
  assertThrows(
    () =>
      org.addEmployee({
        id: "CEO-001",
        name: "Duplicate Alice",
        dateOfBirth: "02/20/1980",
        designation: Designation.CEO,
      }),
    ConflictError,
    "Duplicate ID rejected"
  );
});

test("Edge Case: Should reject adding a second CEO", () => {
  assertThrows(
    () =>
      org.addEmployee({
        id: "CEO-002",
        name: "Second Boss",
        dateOfBirth: "03/12/1972",
        designation: Designation.CEO,
      }),
    ConflictError,
    "Multiple CEOs rejected"
  );
});

test("Should add Directors under CEO with bidirectional sync", () => {
  const dir1 = org.addEmployee({
    id: "DIR-001",
    name: "Bob Jones",
    dateOfBirth: "03/20/1980",
    designation: Designation.Director,
    reportsTo: "CEO-001",
  });
  const dir2 = org.addEmployee({
    id: "DIR-002",
    name: "Carol White",
    dateOfBirth: "07/14/1982",
    designation: Designation.Director,
    reportsTo: "CEO-001",
  });

  const ceo = org.getCEO()!;
  assert(ceo.reportees.includes("DIR-001") && ceo.reportees.includes("DIR-002"), "CEO reportees synchronized");
  assert(dir1.reportsTo === "CEO-001" && dir2.reportsTo === "CEO-001", "Directors report to CEO");
});

test("Edge Case: Should reject employee reporting to non-existent supervisor", () => {
  assertThrows(
    () =>
      org.addEmployee({
        id: "MGR-999",
        name: "Ghost Manager",
        dateOfBirth: "05/05/1985",
        designation: Designation.Manager,
        reportsTo: "NON-EXISTENT-DIR",
      }),
    NotFoundError,
    "Supervisor not found"
  );
});

test("Edge Case: Should reject employee skipping hierarchy levels", () => {
  assertThrows(
    () =>
      org.addEmployee({
        id: "LEAD-999",
        name: "Skip Lead",
        dateOfBirth: "05/05/1990",
        designation: Designation.Lead,
        reportsTo: "DIR-001", // Skipping Manager!
      }),
    HierarchyError,
    "Hierarchy violation rejected"
  );
});

test("Should add Managers, Leads, and Engineers building full hierarchy", () => {
  // Manager
  const mgr = org.addEmployee({
    id: "MGR-001",
    name: "David Miller",
    dateOfBirth: "11/02/1985",
    designation: Designation.Manager,
    reportsTo: "DIR-001",
  });
  assert(org.getEmployeeById("DIR-001").reportees.includes("MGR-001"), "Director manages Manager");

  // Lead
  const lead1 = org.addEmployee({
    id: "LEAD-001",
    name: "Frank Castle",
    dateOfBirth: "08/25/1990",
    designation: Designation.Lead,
    reportsTo: "MGR-001",
  });
  const lead2 = org.addEmployee({
    id: "LEAD-002",
    name: "Grace Hopper",
    dateOfBirth: "12/09/1991",
    designation: Designation.Lead,
    reportsTo: "MGR-001",
  });
  assert(mgr.reportees.length === 2, "Manager manages 2 Leads");

  // Engineers
  const eng1 = org.addEmployee({
    id: "ENG-001",
    name: "Henry Ford",
    dateOfBirth: "05/30/1995",
    designation: Designation.Engineer,
    reportsTo: "LEAD-001",
  });
  const eng2 = org.addEmployee({
    id: "ENG-002",
    name: "Ivy Queen",
    dateOfBirth: "09/15/1996",
    designation: Designation.Engineer,
    reportsTo: "LEAD-001",
  });

  assert(lead1.reportees.length === 2, "Lead manages 2 Engineers");
  assert(eng1.reportees.length === 0 && eng2.reportees.length === 0, "Engineers have no reportees");
  assert(org.getEmployeeCount() === 8, "Total 8 employees");
});

test("Should retrieve employee by ID and retrieve all employees", () => {
  const emp = org.getEmployeeById("ENG-001");
  assert(emp.name === "Henry Ford", "Name matches");
  assert(emp.designation === Designation.Engineer, "Designation matches");

  const all = org.getAllEmployees();
  assert(all.length === 8, "All count matches");

  assertThrows(() => org.getEmployeeById("UNKNOWN"), NotFoundError, "Unknown ID throws NotFoundError");
});

test("Should update employee details and supervisor with bidirectional sync", () => {
  // Update name and date of birth
  const updated = org.updateEmployee("ENG-002", {
    name: "Ivy King",
    dateOfBirth: "09/16/1996",
  });
  assert(updated.name === "Ivy King", "Name updated");
  assert(updated.dateOfBirth === "09/16/1996", "DOB updated");

  // Move ENG-002 from LEAD-001 to LEAD-002
  const lead1 = org.getEmployeeById("LEAD-001");
  const lead2 = org.getEmployeeById("LEAD-002");
  assert(lead1.reportees.includes("ENG-002"), "Initially in Lead 1 reportees");

  org.updateEmployee("ENG-002", { reportsTo: "LEAD-002" });
  assert(updated.reportsTo === "LEAD-002", "reportsTo updated to LEAD-002");
  assert(!lead1.reportees.includes("ENG-002"), "Removed from Lead 1 reportees");
  assert(lead2.reportees.includes("ENG-002"), "Added to Lead 2 reportees");

  // Prevent self-reporting
  assertThrows(
    () => org.updateEmployee("LEAD-001", { reportsTo: "LEAD-001" }),
    HierarchyError,
    "Self reporting prevented"
  );

  // Updating non-existent employee
  assertThrows(
    () => org.updateEmployee("GHOST-ID", { name: "Test" }),
    NotFoundError,
    "Updating non-existent throws NotFoundError"
  );
});

// -------------------------------------------------------------
// SECTION 4: DELETION AND REPORTEE REASSIGNMENT
// -------------------------------------------------------------
console.log("\nSection 4: Deletion & Reportee Reassignment");

test("Should safely delete leaf employee (Engineer)", () => {
  const lead2 = org.getEmployeeById("LEAD-002");
  assert(lead2.reportees.includes("ENG-002"), "Lead 2 has ENG-002");

  const deleted = org.deleteEmployee("ENG-002");
  assert(deleted.id === "ENG-002", "Deleted employee returned");
  assert(!org.hasEmployee("ENG-002"), "Removed from organization store");
  assert(!lead2.reportees.includes("ENG-002"), "Removed from supervisor reportees list");
});

test("Edge Case: Should reject deleting supervisor with active reportees without reassignment", () => {
  assertThrows(
    () => org.deleteEmployee("LEAD-001"),
    HierarchyError,
    "Deleting Lead 1 with reportee ENG-001 rejected"
  );
  assert(org.hasEmployee("LEAD-001"), "Lead 1 still present");
});

test("Edge Case: Should reassign reportees when supervisor is deleted with reassign option", () => {
  const lead2 = org.getEmployeeById("LEAD-002");
  const eng1 = org.getEmployeeById("ENG-001");
  assert(eng1.reportsTo === "LEAD-001", "ENG-001 initially reports to LEAD-001");

  const deletedLead = org.deleteEmployee("LEAD-001", { reassignReporteesTo: "LEAD-002" });
  assert(deletedLead.id === "LEAD-001", "LEAD-001 deleted");
  assert(!org.hasEmployee("LEAD-001"), "LEAD-001 removed from store");
  assert(eng1.reportsTo === "LEAD-002", "ENG-001 reportsTo updated to LEAD-002");
  assert(lead2.reportees.includes("ENG-001"), "LEAD-002 received ENG-001");
});

test("Edge Case: Should reject deletion of non-existent employee", () => {
  assertThrows(
    () => org.deleteEmployee("UNKNOWN-ID"),
    NotFoundError,
    "Deleting non-existent employee throws NotFoundError"
  );
});

test("Should allow bottom-up teardown and adding a new CEO", () => {
  org.deleteEmployee("ENG-001");
  org.deleteEmployee("LEAD-002");
  org.deleteEmployee("MGR-001");
  org.deleteEmployee("DIR-001");
  org.deleteEmployee("DIR-002");

  assert(org.getEmployeeCount() === 1, "Only CEO remains");
  org.deleteEmployee("CEO-001");
  assert(org.getCEO() === null, "CEO is null");
  assert(org.getEmployeeCount() === 0, "Organization empty");

  // Re-add a new CEO
  const brandNewCeo = org.addEmployee({
    id: "CEO-NEW",
    name: "Zoe Taylor",
    dateOfBirth: "08/18/1982",
    designation: Designation.CEO,
  });
  assert(brandNewCeo.id === "CEO-NEW", "New CEO successfully added after teardown");
});

console.log("\n=============================================================");
console.log(`   ALL TESTS PASSED! (${passedTests} test cases verified)     `);
console.log("=============================================================\n");
