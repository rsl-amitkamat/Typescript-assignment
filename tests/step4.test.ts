import { OrganizationService } from "../src/services";
import {
  Designation,
  NotFoundError,
  HierarchyError,
  ValidationError,
} from "../src/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
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
        `Expected ${expectedErrorType.name} but got ${errName} for: ${message}`
      );
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw ${expectedErrorType.name} for: ${message}`);
  }
}

console.log("=== Running Step 4: Deletion & Reportee Reassignment Tests ===");

const org = new OrganizationService();

// Build initial tree
const ceo = org.addEmployee({
  id: "CEO-001",
  name: "Alice Smith",
  dateOfBirth: "01/15/1975",
  designation: Designation.CEO,
});

const dir = org.addEmployee({
  id: "DIR-001",
  name: "Bob Jones",
  dateOfBirth: "03/20/1980",
  designation: Designation.Director,
  reportsTo: "CEO-001",
});

const mgr = org.addEmployee({
  id: "MGR-001",
  name: "Charlie Brown",
  dateOfBirth: "07/11/1985",
  designation: Designation.Manager,
  reportsTo: "DIR-001",
});

const lead1 = org.addEmployee({
  id: "LEAD-001",
  name: "Diana Prince",
  dateOfBirth: "11/05/1990",
  designation: Designation.Lead,
  reportsTo: "MGR-001",
});

const eng1 = org.addEmployee({
  id: "ENG-001",
  name: "Evan Wright",
  dateOfBirth: "09/30/1995",
  designation: Designation.Engineer,
  reportsTo: "LEAD-001",
});

const eng2 = org.addEmployee({
  id: "ENG-002",
  name: "Fiona Gallagher",
  dateOfBirth: "12/14/1996",
  designation: Designation.Engineer,
  reportsTo: "LEAD-001",
});

assert(org.getEmployeeCount() === 6, "Initial employee count is 6");

// 1. Deleting leaf employee (Engineer 1)
console.log("1. Testing safe leaf employee deletion...");
const deletedEng1 = org.deleteEmployee("ENG-001");
assert(deletedEng1.id === "ENG-001", "Deleted employee returned");
assert(!org.hasEmployee("ENG-001"), "ENG-001 no longer in store");
assert(!lead1.reportees.includes("ENG-001"), "Bidirectional cleanup: removed from Lead reportees");
assert(lead1.reportees.length === 1, "Lead now has 1 reportee");
assert(org.getEmployeeCount() === 5, "Employee count is now 5");

// 2. Edge Case: Deleting supervisor with reportees without reassignment
console.log("2. Testing rejection of deleting supervisor with active reportees...");
assertThrows(
  () => org.deleteEmployee("LEAD-001"),
  HierarchyError,
  "Deleting Lead with active reportee without reassignment should throw HierarchyError"
);
assert(org.hasEmployee("LEAD-001"), "LEAD-001 remains in the organization");

// 3. Edge Case: Reassignment to non-existent supervisor
console.log("3. Testing deletion with non-existent reassignment target...");
assertThrows(
  () => org.deleteEmployee("LEAD-001", { reassignReporteesTo: "GHOST-LEAD" }),
  NotFoundError,
  "Reassigning to non-existent supervisor should throw NotFoundError"
);

// 4. Edge Case: Reassignment to incompatible role
console.log("4. Testing deletion with incompatible reassignment role...");
assertThrows(
  () => org.deleteEmployee("LEAD-001", { reassignReporteesTo: "MGR-001" }),
  HierarchyError,
  "Reassigning Lead reportees (Engineers) to Manager should throw HierarchyError"
);

// 5. Deletion of supervisor with valid reassignment
console.log("5. Testing successful supervisor deletion with reassignment...");
const lead2 = org.addEmployee({
  id: "LEAD-002",
  name: "George Clark",
  dateOfBirth: "04/04/1991",
  designation: Designation.Lead,
  reportsTo: "MGR-001",
});

const deletedLead1 = org.deleteEmployee("LEAD-001", { reassignReporteesTo: "LEAD-002" });
assert(deletedLead1.id === "LEAD-001", "Deleted Lead 1 returned");
assert(!org.hasEmployee("LEAD-001"), "LEAD-001 removed from store");
assert(eng2.reportsTo === "LEAD-002", "ENG-002 reportsTo reassigned to LEAD-002");
assert(lead2.reportees.includes("ENG-002"), "LEAD-002 reportees contains ENG-002");
assert(!mgr.reportees.includes("LEAD-001"), "Manager reportees updated to remove LEAD-001");
assert(mgr.reportees.includes("LEAD-002"), "Manager reportees still contains LEAD-002");

// 6. Edge Case: Deleting non-existent employee
console.log("6. Testing deleting non-existent employee...");
assertThrows(
  () => org.deleteEmployee("NON-EXISTENT-ID"),
  NotFoundError,
  "Deleting non-existent employee throws NotFoundError"
);

// 7. Cascading teardown and CEO replacement
console.log("7. Testing bottom-up teardown and CEO replacement...");
org.deleteEmployee("ENG-002"); // delete last engineer
org.deleteEmployee("LEAD-002"); // delete lead (now has 0 reportees)
org.deleteEmployee("MGR-001");  // delete manager
org.deleteEmployee("DIR-001");  // delete director

assert(org.getEmployeeCount() === 1, "Only CEO remains");
const deletedCeo = org.deleteEmployee("CEO-001");
assert(deletedCeo.id === "CEO-001", "CEO deleted successfully");
assert(org.getCEO() === null, "CEO is now null");
assert(org.getEmployeeCount() === 0, "Organization is now empty");

// Now we can add a new CEO without ConflictError!
const newCeo = org.addEmployee({
  id: "CEO-NEW",
  name: "Zoe Taylor",
  dateOfBirth: "08/18/1982",
  designation: Designation.CEO,
});
assert(newCeo.id === "CEO-NEW", "New CEO added successfully to clean organization");
assert(org.getCEO()?.name === "Zoe Taylor", "getCEO returns new CEO");

console.log("✓ All Step 4 tests passed successfully!\n");
