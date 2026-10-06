import { OrganizationService } from "../src/services";
import {
  Designation,
  ConflictError,
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

console.log("=== Running Step 3: OrganizationService CRUD & Hierarchy Tests ===");

const org = new OrganizationService();

// 1. Happy path: Building organizational hierarchy
console.log("1. Adding employees across all 5 designations...");

const ceo = org.addEmployee({
  id: "EMP-001",
  name: "Alice Smith",
  dateOfBirth: "01/15/1975",
  designation: Designation.CEO,
});
assert(ceo.id === "EMP-001", "CEO created");
assert(org.getCEO()?.id === "EMP-001", "getCEO returns Alice");

const director = org.addEmployee({
  id: "DIR-001",
  name: "Bob Jones",
  dateOfBirth: "03/20/1980",
  designation: Designation.Director,
  reportsTo: "EMP-001",
});
assert(director.id === "DIR-001", "Director created");
assert(ceo.reportees.includes("DIR-001"), "Bidirectional sync: CEO has DIR-001 as reportee");

const manager = org.addEmployee({
  id: "MGR-001",
  name: "Charlie Brown",
  dateOfBirth: "07/11/1985",
  designation: Designation.Manager,
  reportsTo: "DIR-001",
});
assert(manager.id === "MGR-001", "Manager created");
assert(director.reportees.includes("MGR-001"), "Bidirectional sync: Director has MGR-001");

const lead1 = org.addEmployee({
  id: "LEAD-001",
  name: "Diana Prince",
  dateOfBirth: "11/05/1990",
  designation: Designation.Lead,
  reportsTo: "MGR-001",
});
assert(lead1.id === "LEAD-001", "Lead 1 created");
assert(manager.reportees.includes("LEAD-001"), "Bidirectional sync: Manager has LEAD-001");

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
assert(lead1.reportees.length === 2, "Lead 1 has 2 engineers");
assert(lead1.reportees.includes("ENG-001") && lead1.reportees.includes("ENG-002"), "Lead 1 reportees match");
assert(eng1.reportees.length === 0, "Engineer 1 has 0 reportees");

// 2. Edge Case: Duplicate ID rejection
console.log("2. Testing duplicate ID rejection...");
assertThrows(
  () =>
    org.addEmployee({
      id: "ENG-001", // Already exists
      name: "Duplicate Employee",
      dateOfBirth: "01/01/1990",
      designation: Designation.Engineer,
      reportsTo: "LEAD-001",
    }),
  ConflictError,
  "Adding employee with duplicate ID should throw ConflictError"
);

// 3. Edge Case: Only one CEO can exist
console.log("3. Testing single CEO constraint...");
assertThrows(
  () =>
    org.addEmployee({
      id: "CEO-002",
      name: "Second CEO",
      dateOfBirth: "02/02/1970",
      designation: Designation.CEO,
    }),
  ConflictError,
  "Adding a second CEO should throw ConflictError"
);

// 4. Edge Case: Supervisor existence check
console.log("4. Testing non-existent supervisor rejection...");
assertThrows(
  () =>
    org.addEmployee({
      id: "ENG-003",
      name: "Ghost Supervisor Engineer",
      dateOfBirth: "05/05/1995",
      designation: Designation.Engineer,
      reportsTo: "NON-EXISTENT-LEAD",
    }),
  NotFoundError,
  "Adding employee with non-existent supervisor should throw NotFoundError"
);

// 5. Edge Case: Invalid hierarchy reporting
console.log("5. Testing invalid hierarchy reporting...");
assertThrows(
  () =>
    org.addEmployee({
      id: "ENG-004",
      name: "Skipping Hierarchy Engineer",
      dateOfBirth: "06/06/1994",
      designation: Designation.Engineer,
      reportsTo: "MGR-001", // Skipping Lead to Manager!
    }),
  HierarchyError,
  "Engineer reporting directly to Manager should throw HierarchyError"
);

assertThrows(
  () =>
    org.addEmployee({
      id: "LEAD-002-INVALID",
      name: "Skipping Hierarchy Lead",
      dateOfBirth: "07/07/1988",
      designation: Designation.Lead,
      reportsTo: "EMP-001", // Skipping Manager & Director to CEO!
    }),
  HierarchyError,
  "Lead reporting directly to CEO should throw HierarchyError"
);

// 6. Query operations
console.log("6. Testing query operations...");
assert(org.getAllEmployees().length === 6, "Total employees count is 6");
assert(org.getEmployeeById("DIR-001").name === "Bob Jones", "getEmployeeById works");
assertThrows(
  () => org.getEmployeeById("UNKNOWN-ID"),
  NotFoundError,
  "getEmployeeById with unknown ID throws NotFoundError"
);

// 7. Update operations & supervisor reassignment
console.log("7. Testing update operations...");
// Update name and dateOfBirth
const updatedEng2 = org.updateEmployee("ENG-002", {
  name: "Fiona Wright",
  dateOfBirth: "12/15/1996",
});
assert(updatedEng2.name === "Fiona Wright", "Updated name matches");
assert(updatedEng2.dateOfBirth === "12/15/1996", "Updated DOB matches");

// Add a second Lead
const lead2 = org.addEmployee({
  id: "LEAD-002",
  name: "Gregory House",
  dateOfBirth: "06/11/1988",
  designation: Designation.Lead,
  reportsTo: "MGR-001",
});

// Reassign ENG-001 from LEAD-001 to LEAD-002
org.updateEmployee("ENG-001", { reportsTo: "LEAD-002" });
assert(eng1.reportsTo === "LEAD-002", "Engineer 1 reportsTo updated to LEAD-002");
assert(!lead1.reportees.includes("ENG-001"), "Bidirectional sync: removed from LEAD-001 reportees");
assert(lead2.reportees.includes("ENG-001"), "Bidirectional sync: added to LEAD-002 reportees");

// Updating non-existent employee
assertThrows(
  () => org.updateEmployee("NON-EXISTENT", { name: "Test" }),
  NotFoundError,
  "Updating non-existent employee throws NotFoundError"
);

// Self-reporting prevention
assertThrows(
  () => org.updateEmployee("LEAD-001", { reportsTo: "LEAD-001" }),
  HierarchyError,
  "Employee reporting to themselves throws HierarchyError"
);

console.log("✓ All Step 3 tests passed successfully!\n");
