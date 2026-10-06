import {
  CEO,
  Director,
  Manager,
  Lead,
  Engineer,
  Employee,
} from "../src/models";
import { Designation, HierarchyError } from "../src/types";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertThrows(fn: () => void, expectedErrorName: string, message: string): void {
  let threw = false;
  try {
    fn();
  } catch (err: unknown) {
    threw = true;
    if (err instanceof Error) {
      if (err.name !== expectedErrorName) {
        throw new Error(
          `Expected error ${expectedErrorName} but got ${err.name}: ${err.message}`
        );
      }
    }
  }
  if (!threw) {
    throw new Error(`Expected function to throw ${expectedErrorName} for: ${message}`);
  }
}

console.log("=== Running Step 1: OOP Models & Hierarchy Tests ===");

// 1. CEO tests
console.log("Testing CEO model...");
const ceo = new CEO("EMP-001", "Alice Smith", "01/15/1975");
assert(ceo instanceof Employee, "CEO should be an instance of Employee");
assert(ceo.id === "EMP-001", "CEO ID matches");
assert(ceo.name === "Alice Smith", "CEO name matches");
assert(ceo.dateOfBirth === "01/15/1975", "CEO DOB matches");
assert(ceo.designation === Designation.CEO, "CEO designation is CEO");
assert(ceo.reportsTo === null, "CEO reportsTo must be null");
assert(ceo.canHaveReportees() === true, "CEO can have reportees");
assert(ceo.getAllowedSupervisorDesignation() === null, "CEO allowed supervisor is null");
assert(ceo.getAllowedReporteeDesignation() === Designation.Director, "CEO allowed reportee is Director");

// CEO cannot report to anyone
assertThrows(
  () => new CEO("EMP-001", "Alice", "01/15/1975", "SOME-LEAD"),
  "HierarchyError",
  "CEO constructor should reject reportsTo"
);
assertThrows(
  () => ceo.setReportsTo("SOME-LEAD"),
  "HierarchyError",
  "CEO.setReportsTo should reject non-null supervisor"
);

// CEO reportees
ceo.addReportee("DIR-001");
assert(ceo.reportees.length === 1 && ceo.reportees[0] === "DIR-001", "CEO addReportee works");
assert(ceo.hasReportee("DIR-001") === true, "CEO hasReportee returns true");
ceo.removeReportee("DIR-001");
assert(ceo.reportees.length === 0, "CEO removeReportee works");

// 2. Director tests
console.log("Testing Director model...");
const dir = new Director("DIR-001", "Bob Jones", "03/22/1980", "EMP-001");
assert(dir instanceof Employee, "Director is an instance of Employee");
assert(dir.designation === Designation.Director, "Director designation is Director");
assert(dir.reportsTo === "EMP-001", "Director reportsTo matches CEO");
assert(dir.getAllowedSupervisorDesignation() === Designation.CEO, "Director supervisor is CEO");
assert(dir.getAllowedReporteeDesignation() === Designation.Manager, "Director reportee is Manager");
assert(dir.canHaveReportees() === true, "Director can have reportees");

// 3. Manager tests
console.log("Testing Manager model...");
const mgr = new Manager("MGR-001", "Charlie Brown", "07/11/1985", "DIR-001");
assert(mgr instanceof Employee, "Manager is an instance of Employee");
assert(mgr.designation === Designation.Manager, "Manager designation is Manager");
assert(mgr.reportsTo === "DIR-001", "Manager reportsTo matches Director");
assert(mgr.getAllowedSupervisorDesignation() === Designation.Director, "Manager supervisor is Director");
assert(mgr.getAllowedReporteeDesignation() === Designation.Lead, "Manager reportee is Lead");
assert(mgr.canHaveReportees() === true, "Manager can have reportees");

// 4. Lead tests
console.log("Testing Lead model...");
const lead = new Lead("LEAD-001", "Diana Prince", "11/05/1990", "MGR-001");
assert(lead instanceof Employee, "Lead is an instance of Employee");
assert(lead.designation === Designation.Lead, "Lead designation is Lead");
assert(lead.reportsTo === "MGR-001", "Lead reportsTo matches Manager");
assert(lead.getAllowedSupervisorDesignation() === Designation.Manager, "Lead supervisor is Manager");
assert(lead.getAllowedReporteeDesignation() === Designation.Engineer, "Lead reportee is Engineer");
assert(lead.canHaveReportees() === true, "Lead can have reportees");

// 5. Engineer tests
console.log("Testing Engineer model...");
const eng = new Engineer("ENG-001", "Evan Wright", "09/30/1995", "LEAD-001");
assert(eng instanceof Employee, "Engineer is an instance of Employee");
assert(eng.designation === Designation.Engineer, "Engineer designation is Engineer");
assert(eng.reportsTo === "LEAD-001", "Engineer reportsTo matches Lead");
assert(eng.getAllowedSupervisorDesignation() === Designation.Lead, "Engineer supervisor is Lead");
assert(eng.getAllowedReporteeDesignation() === null, "Engineer reportee is null");
assert(eng.canHaveReportees() === false, "Engineer cannot have reportees");
assert(eng.reportees.length === 0, "Engineer reportees list is empty");

// Engineer cannot add reportee
assertThrows(
  () => eng.addReportee("ENG-002"),
  "HierarchyError",
  "Engineer.addReportee must throw HierarchyError"
);
assertThrows(
  () => new Engineer("ENG-002", "Evan", "09/30/1995", "LEAD-001", ["ENG-003"]),
  "HierarchyError",
  "Engineer constructor with reportees must throw HierarchyError"
);

// 6. Mutators and serialization
console.log("Testing mutators and toJSON serialization...");
eng.setName("Evan Wright Jr.");
assert(eng.name === "Evan Wright Jr.", "setName works");
eng.setDateOfBirth("10/01/1995");
assert(eng.dateOfBirth === "10/01/1995", "setDateOfBirth works");
eng.setReportsTo("LEAD-002");
assert(eng.reportsTo === "LEAD-002", "setReportsTo works");

const serialized = eng.toJSON();
assert(serialized.id === "ENG-001", "toJSON id matches");
assert(serialized.name === "Evan Wright Jr.", "toJSON name matches");
assert(serialized.dateOfBirth === "10/01/1995", "toJSON dateOfBirth matches");
assert(serialized.designation === Designation.Engineer, "toJSON designation matches");
assert(serialized.reportsTo === "LEAD-002", "toJSON reportsTo matches");
assert(Array.isArray(serialized.reportees) && serialized.reportees.length === 0, "toJSON reportees matches");

console.log("✓ All Step 1 tests passed successfully!\n");
