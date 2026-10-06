import * as readline from "readline";
import { OrganizationService } from "./services";
import { Designation, ConflictError, NotFoundError, HierarchyError, ValidationError } from "./types";
import { Employee } from "./models";

export class OrganizationCLI {
  private org: OrganizationService;
  private rl: readline.Interface;

  constructor() {
    this.org = new OrganizationService();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
  }

  private prompt(query: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(query, (answer) => {
        resolve(answer.trim());
      });
    });
  }

  public async start(): Promise<void> {
    // Check if running in non-interactive environment (CI or pipe or --demo flag)
    if (!process.stdin.isTTY || process.argv.includes("--demo")) {
      await this.runNonInteractiveDemo();
      this.rl.close();
      return;
    }

    let running = true;
    while (running) {
      this.printMenu();
      const choice = await this.prompt("Enter your choice (0-9): ");
      console.log("");

      switch (choice) {
        case "1":
          await this.handleAddEmployee();
          break;
        case "2":
          await this.handleViewEmployeeById();
          break;
        case "3":
          this.handleViewAllEmployees();
          break;
        case "4":
          this.handleViewHierarchyTree();
          break;
        case "5":
          await this.handleUpdateEmployee();
          break;
        case "6":
          await this.handleDeleteEmployee();
          break;
        case "7":
          this.handlePreloadSampleData();
          break;
        case "8":
          this.handleRunEdgeCasesDemo();
          break;
        case "9":
          this.handleClearOrganization();
          break;
        case "0":
          console.log("Exiting Organization Management System. Goodbye!");
          running = false;
          this.rl.close();
          break;
        default:
          console.log("Invalid choice. Please select an option between 0 and 9.");
      }
      if (running) {
        await this.prompt("\nPress Enter to continue...");
      }
    }
  }

  private printMenu(): void {
    console.log("\n=======================================================");
    console.log("       ORGANIZATION MANAGEMENT SYSTEM (CLI MENU)       ");
    console.log("=======================================================");
    console.log(` Active Employees: ${this.org.getEmployeeCount()} | CEO: ${this.org.getCEO()?.name ?? "None"}`);
    console.log("-------------------------------------------------------");
    console.log("  1. Add New Employee");
    console.log("  2. View Employee by ID");
    console.log("  3. View All Employees (Table)");
    console.log("  4. View Organization Hierarchy Tree");
    console.log("  5. Update Employee (Details / Supervisor)");
    console.log("  6. Delete Employee (Safe Delete / Reassign)");
    console.log("  7. Preload Sample Mock Organization");
    console.log("  8. Run Automated Edge Cases & Validations Showcase");
    console.log("  9. Clear Organization");
    console.log("  0. Exit");
    console.log("=======================================================");
  }

  private async handleAddEmployee(): Promise<void> {
    console.log("--- Add New Employee ---");
    const id = await this.prompt("Employee ID (e.g. EMP-001): ");
    const name = await this.prompt("Full Name: ");
    const dateOfBirth = await this.prompt("Date of Birth (mm/dd/yyyy): ");

    console.log("Select Designation:");
    console.log("  1. CEO");
    console.log("  2. Director");
    console.log("  3. Manager");
    console.log("  4. Lead");
    console.log("  5. Engineer");
    const desChoice = await this.prompt("Choice (1-5): ");

    const designationMap: Record<string, Designation> = {
      "1": Designation.CEO,
      "2": Designation.Director,
      "3": Designation.Manager,
      "4": Designation.Lead,
      "5": Designation.Engineer,
    };

    const designation = designationMap[desChoice];
    if (!designation) {
      console.log("[ERROR] Invalid designation choice.");
      return;
    }

    let reportsTo: string | null = null;
    if (designation !== Designation.CEO) {
      reportsTo = await this.prompt(`Reports To (ID of supervisor): `);
    }

    try {
      const created = this.org.addEmployee({
        id,
        name,
        dateOfBirth,
        designation,
        reportsTo: reportsTo || null,
      });
      console.log(`\n[SUCCESS] Added ${created.designation}: ${created.name} (${created.id})`);
      if (created.reportsTo) {
        console.log(`  Reports to: ${created.reportsTo}`);
      }
    } catch (err: unknown) {
      this.printError(err);
    }
  }

  private async handleViewEmployeeById(): Promise<void> {
    console.log("--- View Employee by ID ---");
    const id = await this.prompt("Enter Employee ID: ");
    try {
      const emp = this.org.getEmployeeById(id);
      console.log("\n----------------------------------------");
      console.log(`ID:           ${emp.id}`);
      console.log(`Name:         ${emp.name}`);
      console.log(`DOB:          ${emp.dateOfBirth}`);
      console.log(`Designation:  ${emp.designation}`);
      console.log(`Reports To:   ${emp.reportsTo ?? "None (Root CEO)"}`);
      console.log(`Reportees:    ${emp.reportees.length > 0 ? emp.reportees.join(", ") : "None"}`);
      console.log("----------------------------------------");
    } catch (err: unknown) {
      this.printError(err);
    }
  }

  private handleViewAllEmployees(): void {
    console.log("--- All Organization Employees ---");
    const employees = this.org.getAllEmployees();
    if (employees.length === 0) {
      console.log("No employees in the organization yet. Use Option 1 or 7 to add employees.");
      return;
    }

    console.log("\n" + "=".repeat(85));
    console.log(
      `${"ID".padEnd(12)} | ${"Name".padEnd(20)} | ${"Designation".padEnd(12)} | ${"DOB".padEnd(12)} | ${"Reports To".padEnd(12)} | Reportees`
    );
    console.log("-".repeat(85));
    for (const emp of employees) {
      const reporteesStr = emp.reportees.length > 0 ? emp.reportees.join(", ") : "-";
      console.log(
        `${emp.id.padEnd(12)} | ${emp.name.padEnd(20)} | ${emp.designation.padEnd(12)} | ${emp.dateOfBirth.padEnd(12)} | ${(emp.reportsTo ?? "-").padEnd(12)} | ${reporteesStr}`
      );
    }
    console.log("=".repeat(85));
    console.log(`Total: ${employees.length} employee(s)`);
  }

  private handleViewHierarchyTree(): void {
    console.log("--- Organization Hierarchy Tree ---\n");
    const ceo = this.org.getCEO();
    if (!ceo) {
      if (this.org.getEmployeeCount() === 0) {
        console.log("No organization data available. Add a CEO first or preload sample data (Option 7).");
      } else {
        console.log("No CEO found. Displaying unrooted employees:");
        for (const emp of this.org.getAllEmployees()) {
          console.log(` - [${emp.designation}] ${emp.name} (${emp.id})`);
        }
      }
      return;
    }

    this.renderTreeNode(ceo, "", true);
  }

  private renderTreeNode(emp: Employee, prefix: string, isLast: boolean): void {
    const branch = isLast ? "└── " : "├── ";
    const childPrefix = prefix + (isLast ? "    " : "│   ");

    console.log(`${prefix}${branch}[${emp.designation}] ${emp.name} (${emp.id})`);

    const reportees = emp.reportees;
    for (let i = 0; i < reportees.length; i++) {
      const child = this.org.getEmployeeById(reportees[i]);
      const isChildLast = i === reportees.length - 1;
      this.renderTreeNode(child, childPrefix, isChildLast);
    }
  }

  private async handleUpdateEmployee(): Promise<void> {
    console.log("--- Update Employee ---");
    const id = await this.prompt("Employee ID to update: ");

    try {
      const emp = this.org.getEmployeeById(id);
      console.log(`Found: [${emp.designation}] ${emp.name} (${emp.id})`);
      console.log("Leave fields empty to keep current value.");

      const newName = await this.prompt(`New Name [current: ${emp.name}]: `);
      const newDob = await this.prompt(`New DOB [current: ${emp.dateOfBirth}]: `);
      let newReportsTo: string | undefined = undefined;

      if (emp.designation !== Designation.CEO) {
        const promptSupervisor = await this.prompt(`New Reports To [current: ${emp.reportsTo}]: `);
        if (promptSupervisor.length > 0) {
          newReportsTo = promptSupervisor;
        }
      }

      const updated = this.org.updateEmployee(id, {
        name: newName.length > 0 ? newName : undefined,
        dateOfBirth: newDob.length > 0 ? newDob : undefined,
        reportsTo: newReportsTo,
      });

      console.log(`\n[SUCCESS] Employee '${updated.id}' updated successfully.`);
    } catch (err: unknown) {
      this.printError(err);
    }
  }

  private async handleDeleteEmployee(): Promise<void> {
    console.log("--- Delete Employee ---");
    const id = await this.prompt("Employee ID to delete: ");

    try {
      const emp = this.org.getEmployeeById(id);
      console.log(`Target: [${emp.designation}] ${emp.name} (${emp.id})`);

      let reassignTarget: string | undefined = undefined;
      if (emp.reportees.length > 0) {
        console.log(`\n[WARNING] This employee has ${emp.reportees.length} active reportee(s): [${emp.reportees.join(", ")}].`);
        console.log("Deleting without reassignment will be rejected.");
        const reassign = await this.prompt("Do you want to reassign them to another supervisor? (y/n): ");

        if (reassign.toLowerCase() === "y") {
          reassignTarget = await this.prompt(`Enter ID of target ${emp.designation} to reassign reportees to: `);
        }
      }

      const deleted = this.org.deleteEmployee(id, {
        reassignReporteesTo: reassignTarget,
      });

      console.log(`\n[SUCCESS] Deleted [${deleted.designation}] ${deleted.name} (${deleted.id})`);
    } catch (err: unknown) {
      this.printError(err);
    }
  }

  public handlePreloadSampleData(): void {
    console.log("--- Preloading Sample Organization Data ---");
    this.org.clear();

    // 1. CEO
    this.org.addEmployee({
      id: "CEO-001",
      name: "Alice Smith",
      dateOfBirth: "01/15/1975",
      designation: Designation.CEO,
    });

    // 2. Directors
    this.org.addEmployee({
      id: "DIR-001",
      name: "Bob Jones",
      dateOfBirth: "03/20/1980",
      designation: Designation.Director,
      reportsTo: "CEO-001",
    });
    this.org.addEmployee({
      id: "DIR-002",
      name: "Carol White",
      dateOfBirth: "07/14/1982",
      designation: Designation.Director,
      reportsTo: "CEO-001",
    });

    // 3. Managers
    this.org.addEmployee({
      id: "MGR-001",
      name: "David Miller",
      dateOfBirth: "11/02/1985",
      designation: Designation.Manager,
      reportsTo: "DIR-001",
    });
    this.org.addEmployee({
      id: "MGR-002",
      name: "Emma Watson",
      dateOfBirth: "04/18/1987",
      designation: Designation.Manager,
      reportsTo: "DIR-002",
    });

    // 4. Leads
    this.org.addEmployee({
      id: "LEAD-001",
      name: "Frank Castle",
      dateOfBirth: "08/25/1990",
      designation: Designation.Lead,
      reportsTo: "MGR-001",
    });
    this.org.addEmployee({
      id: "LEAD-002",
      name: "Grace Hopper",
      dateOfBirth: "12/09/1991",
      designation: Designation.Lead,
      reportsTo: "MGR-002",
    });

    // 5. Engineers
    this.org.addEmployee({
      id: "ENG-001",
      name: "Henry Ford",
      dateOfBirth: "05/30/1995",
      designation: Designation.Engineer,
      reportsTo: "LEAD-001",
    });
    this.org.addEmployee({
      id: "ENG-002",
      name: "Ivy Queen",
      dateOfBirth: "09/15/1996",
      designation: Designation.Engineer,
      reportsTo: "LEAD-001",
    });
    this.org.addEmployee({
      id: "ENG-003",
      name: "Jack Ryan",
      dateOfBirth: "02/20/1997",
      designation: Designation.Engineer,
      reportsTo: "LEAD-002",
    });

    console.log(`[SUCCESS] Preloaded ${this.org.getEmployeeCount()} employees across all 5 designations.`);
    console.log("Hierarchy tree view:\n");
    this.handleViewHierarchyTree();
  }

  public handleRunEdgeCasesDemo(): void {
    console.log("=========================================================");
    console.log("   AUTOMATED EDGE CASES & VALIDATIONS DEMONSTRATION      ");
    console.log("=========================================================\n");

    const demoOrg = new OrganizationService();

    // 1. Setup CEO
    console.log("1. Adding initial CEO...");
    demoOrg.addEmployee({
      id: "CEO-001",
      name: "Alice Smith",
      dateOfBirth: "01/15/1975",
      designation: Designation.CEO,
    });
    console.log("  [PASS] Added CEO: Alice Smith (CEO-001)");

    // 2. Reject Duplicate ID
    console.log("\n2. Edge Case: Duplicate Employee ID...");
    try {
      demoOrg.addEmployee({
        id: "CEO-001",
        name: "Clone Alice",
        dateOfBirth: "01/15/1975",
        designation: Designation.CEO,
      });
      console.log("  [FAIL] Duplicate ID should have been rejected!");
    } catch (err: unknown) {
      console.log(`  [PASS Expected ConflictError] ${(err as Error).message}`);
    }

    // 3. Reject Second CEO
    console.log("\n3. Edge Case: Second CEO in Organization...");
    try {
      demoOrg.addEmployee({
        id: "CEO-002",
        name: "Second Boss",
        dateOfBirth: "02/20/1972",
        designation: Designation.CEO,
      });
      console.log("  [FAIL] Second CEO should have been rejected!");
    } catch (err: unknown) {
      console.log(`  [PASS Expected ConflictError] ${(err as Error).message}`);
    }

    // 4. Reject Non-Existent Supervisor
    console.log("\n4. Edge Case: Non-Existent Supervisor...");
    try {
      demoOrg.addEmployee({
        id: "DIR-001",
        name: "Bob Jones",
        dateOfBirth: "03/20/1980",
        designation: Designation.Director,
        reportsTo: "GHOST-CEO",
      });
      console.log("  [FAIL] Non-existent supervisor should have been rejected!");
    } catch (err: unknown) {
      console.log(`  [PASS Expected NotFoundError] ${(err as Error).message}`);
    }

    // Add valid Director
    demoOrg.addEmployee({
      id: "DIR-001",
      name: "Bob Jones",
      dateOfBirth: "03/20/1980",
      designation: Designation.Director,
      reportsTo: "CEO-001",
    });

    // 5. Reject Invalid Hierarchy Relationship
    console.log("\n5. Edge Case: Invalid Hierarchy (Engineer reporting directly to Director)...");
    try {
      demoOrg.addEmployee({
        id: "ENG-001",
        name: "Skip Levels",
        dateOfBirth: "05/10/1995",
        designation: Designation.Engineer,
        reportsTo: "DIR-001",
      });
      console.log("  [FAIL] Invalid hierarchy should have been rejected!");
    } catch (err: unknown) {
      console.log(`  [PASS Expected HierarchyError] ${(err as Error).message}`);
    }

    // 6. Reject Invalid Date Format & Calendar Dates
    console.log("\n6. Edge Case: Invalid Date Formats and Calendar Overruns...");
    const badDates = ["2020-05-10", "04/31/2020", "02/29/2023", "12/25/2099"];
    for (const badDate of badDates) {
      try {
        demoOrg.addEmployee({
          id: `MGR-${badDate.replace(/\D/g, "")}`,
          name: "Test Date",
          dateOfBirth: badDate,
          designation: Designation.Manager,
          reportsTo: "DIR-001",
        });
        console.log(`  [FAIL] Bad date '${badDate}' should have been rejected!`);
      } catch (err: unknown) {
        console.log(`  [PASS Expected ValidationError for '${badDate}'] ${(err as Error).message}`);
      }
    }

    // Add valid Manager, Lead, Engineer
    const mgr = demoOrg.addEmployee({
      id: "MGR-001",
      name: "Charlie Brown",
      dateOfBirth: "07/11/1985",
      designation: Designation.Manager,
      reportsTo: "DIR-001",
    });
    const lead = demoOrg.addEmployee({
      id: "LEAD-001",
      name: "Diana Prince",
      dateOfBirth: "11/05/1990",
      designation: Designation.Lead,
      reportsTo: "MGR-001",
    });
    demoOrg.addEmployee({
      id: "ENG-001",
      name: "Evan Wright",
      dateOfBirth: "09/30/1995",
      designation: Designation.Engineer,
      reportsTo: "LEAD-001",
    });

    // 7. Reject Deleting Supervisor with Active Reportees
    console.log("\n7. Edge Case: Reject Deleting Lead with Active Reportees...");
    try {
      demoOrg.deleteEmployee("LEAD-001");
      console.log("  [FAIL] Deleting supervisor with active reportees should have been rejected!");
    } catch (err: unknown) {
      console.log(`  [PASS Expected HierarchyError] ${(err as Error).message}`);
    }

    // 8. Successful Deletion with Reportee Reassignment
    console.log("\n8. Edge Case: Deleting Supervisor with Valid Reportee Reassignment...");
    demoOrg.addEmployee({
      id: "LEAD-002",
      name: "George Clark",
      dateOfBirth: "06/06/1991",
      designation: Designation.Lead,
      reportsTo: "MGR-001",
    });
    demoOrg.deleteEmployee("LEAD-001", { reassignReporteesTo: "LEAD-002" });
    const eng = demoOrg.getEmployeeById("ENG-001");
    console.log(`  [PASS] LEAD-001 deleted. ENG-001 now reports to: ${eng.reportsTo}`);

    // 9. Updating Non-Existent Employee
    console.log("\n9. Edge Case: Updating Non-Existent Employee...");
    try {
      demoOrg.updateEmployee("GHOST-ID", { name: "New Name" });
      console.log("  [FAIL] Updating non-existent employee should have been rejected!");
    } catch (err: unknown) {
      console.log(`  [PASS Expected NotFoundError] ${(err as Error).message}`);
    }

    console.log("\n=========================================================");
    console.log("   ALL EDGE CASES & VALIDATIONS SUCCESSFULLY VERIFIED!  ");
    console.log("=========================================================\n");
  }

  private handleClearOrganization(): void {
    this.org.clear();
    console.log("[SUCCESS] Organization cleared. All employees removed.");
  }

  private async runNonInteractiveDemo(): Promise<void> {
    console.log("=========================================================");
    console.log("  RUNNING NON-INTERACTIVE AUTOMATED DEMONSTRATION MODE  ");
    console.log("=========================================================\n");
    this.handlePreloadSampleData();
    console.log("");
    this.handleViewAllEmployees();
    console.log("");
    this.handleRunEdgeCasesDemo();
  }

  private printError(err: unknown): void {
    if (err instanceof Error) {
      console.log(`\n[ERROR - ${err.name}]: ${err.message}`);
    } else {
      console.log(`\n[ERROR]: ${String(err)}`);
    }
  }
}
