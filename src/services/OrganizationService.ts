import {
  Employee,
  CEO,
  Director,
  Manager,
  Lead,
  Engineer,
} from "../models";
import {
  Designation,
  CreateEmployeeDTO,
  UpdateEmployeeDTO,
  ConflictError,
  NotFoundError,
  HierarchyError,
  ValidationError,
  IEmployeeData,
} from "../types";
import {
  validateCreateEmployeeInput,
  validateUpdateEmployeeInput,
  validateReportingHierarchy,
  getAllowedSupervisorRole,
} from "../utils/validator";

/**
 * Service managing all organizational employees, enforcing business rules,
 * reporting hierarchies, and bidirectional relationship synchronization.
 */
export class OrganizationService {
  private employees: Map<string, Employee> = new Map();
  private ceoId: string | null = null;

  /**
   * Adds a new employee to the organization.
   *
   * Validations enforced:
   * 1. Payload validity (non-empty fields, mm/dd/yyyy date, valid designation).
   * 2. ID uniqueness (rejects duplicate IDs).
   * 3. Single CEO constraint (rejects multiple CEOs).
   * 4. Supervisor existence (reportsTo must reference an existing employee).
   * 5. Strict reporting hierarchy (Engineer -> Lead -> Manager -> Director -> CEO -> null).
   * 6. Bidirectional synchronization: updates supervisor's reportees list.
   */
  public addEmployee(dto: CreateEmployeeDTO): Employee {
    validateCreateEmployeeInput(dto);

    const id = dto.id.trim();

    // Edge case 1: Employee ID must be unique
    if (this.employees.has(id)) {
      throw new ConflictError(
        `Employee with ID '${id}' already exists in the organization.`
      );
    }

    // Edge case 2: Only one CEO can exist
    if (dto.designation === Designation.CEO) {
      if (this.ceoId !== null) {
        const currentCeo = this.employees.get(this.ceoId);
        throw new ConflictError(
          `Cannot add CEO '${dto.name}' (${id}). The organization already has a CEO: '${currentCeo?.name}' (${this.ceoId}).`
        );
      }
    }

    let supervisor: Employee | null = null;

    if (dto.designation !== Designation.CEO) {
      const supervisorId = dto.reportsTo!.trim();

      // Edge case 3: Supervisor must exist in the organization
      if (!this.employees.has(supervisorId)) {
        throw new NotFoundError(
          `Cannot add ${dto.designation} '${dto.name}' (${id}): Supervisor with ID '${supervisorId}' was not found.`
        );
      }

      supervisor = this.employees.get(supervisorId)!;

      // Edge case 4: reportsTo must follow defined reporting hierarchy
      validateReportingHierarchy(dto.designation, supervisor.designation);
    }

    // Instantiate concrete OOP subclass
    let newEmployee: Employee;
    const name = dto.name.trim();
    const dob = dto.dateOfBirth.trim();
    const reportsToId = supervisor ? supervisor.id : null;

    switch (dto.designation) {
      case Designation.CEO:
        newEmployee = new CEO(id, name, dob);
        this.ceoId = id;
        break;
      case Designation.Director:
        newEmployee = new Director(id, name, dob, reportsToId);
        break;
      case Designation.Manager:
        newEmployee = new Manager(id, name, dob, reportsToId);
        break;
      case Designation.Lead:
        newEmployee = new Lead(id, name, dob, reportsToId);
        break;
      case Designation.Engineer:
        newEmployee = new Engineer(id, name, dob, reportsToId);
        break;
    }

    // Save to store
    this.employees.set(id, newEmployee);

    // Bidirectional sync: add to supervisor's reportees list
    if (supervisor) {
      supervisor.addReportee(id);
    }

    return newEmployee;
  }

  /**
   * Retrieves a specific employee by ID.
   * Throws NotFoundError if the employee does not exist.
   */
  public getEmployeeById(id: string): Employee {
    const trimmedId = id.trim();
    const employee = this.employees.get(trimmedId);
    if (!employee) {
      throw new NotFoundError(`Employee with ID '${trimmedId}' does not exist.`);
    }
    return employee;
  }

  /**
   * Retrieves all employees in the organization.
   */
  public getAllEmployees(): Employee[] {
    return Array.from(this.employees.values());
  }

  /**
   * Retrieves the current CEO of the organization, or null if no CEO has been added.
   */
  public getCEO(): CEO | null {
    if (this.ceoId && this.employees.has(this.ceoId)) {
      return this.employees.get(this.ceoId) as CEO;
    }
    return null;
  }

  /**
   * Checks if an employee exists in the organization.
   */
  public hasEmployee(id: string): boolean {
    return this.employees.has(id.trim());
  }

  /**
   * Returns total employee count.
   */
  public getEmployeeCount(): number {
    return this.employees.size;
  }

  /**
   * Updates an existing employee's details.
   *
   * Validations enforced:
   * 1. Target employee must exist (throws NotFoundError).
   * 2. Valid updated fields (name non-empty, date valid mm/dd/yyyy).
   * 3. If updating supervisor (reportsTo):
   *    - CEO cannot report to anyone.
   *    - Cannot report to oneself.
   *    - Cannot introduce circular reporting.
   *    - New supervisor must exist.
   *    - New supervisor must match required hierarchy role.
   *    - Bidirectional sync: removes employee from old supervisor's reportees and adds to new.
   */
  public updateEmployee(id: string, dto: UpdateEmployeeDTO): Employee {
    validateUpdateEmployeeInput(dto);

    const employee = this.getEmployeeById(id);

    // Update name
    if (dto.name !== undefined) {
      employee.setName(dto.name.trim());
    }

    // Update date of birth
    if (dto.dateOfBirth !== undefined) {
      employee.setDateOfBirth(dto.dateOfBirth.trim());
    }

    // Update reportsTo if specified
    if (dto.reportsTo !== undefined) {
      if (employee.designation === Designation.CEO) {
        if (dto.reportsTo !== null) {
          throw new HierarchyError("A CEO cannot report to anyone.");
        }
      } else {
        if (dto.reportsTo === null || dto.reportsTo.trim() === "") {
          const allowedSupervisor = getAllowedSupervisorRole(employee.designation);
          throw new ValidationError(
            `Field 'reportsTo' cannot be null for ${employee.designation}. Must report to a ${allowedSupervisor}.`
          );
        }

        const newSupervisorId = dto.reportsTo.trim();

        // Edge case: cannot report to self
        if (newSupervisorId === employee.id) {
          throw new HierarchyError(
            `Employee '${employee.id}' cannot report to themselves.`
          );
        }

        // Edge case: new supervisor must exist
        const newSupervisor = this.getEmployeeById(newSupervisorId);

        // Edge case: new supervisor must match allowed hierarchy role
        validateReportingHierarchy(employee.designation, newSupervisor.designation);

        // Edge case: prevent circular reporting
        if (this.isDescendantOf(newSupervisor.id, employee.id)) {
          throw new HierarchyError(
            `Circular reporting detected: Supervisor '${newSupervisor.id}' already reports directly or indirectly to '${employee.id}'.`
          );
        }

        // Only update if changed
        if (employee.reportsTo !== newSupervisorId) {
          // Remove from old supervisor's reportees list
          if (employee.reportsTo) {
            const oldSupervisor = this.employees.get(employee.reportsTo);
            if (oldSupervisor) {
              oldSupervisor.removeReportee(employee.id);
            }
          }

          // Add to new supervisor's reportees list
          newSupervisor.addReportee(employee.id);

          // Update employee's reportsTo
          employee.setReportsTo(newSupervisor.id);
        }
      }
    }

    return employee;
  }

  /**
   * Helper to check if a potential descendant reports (directly or indirectly) to ancestorId.
   */
  private isDescendantOf(targetId: string, ancestorId: string): boolean {
    let current = this.employees.get(targetId);
    while (current && current.reportsTo) {
      if (current.reportsTo === ancestorId) {
        return true;
      }
      current = this.employees.get(current.reportsTo);
    }
    return false;
  }

  /**
   * Internal access to employee map (used by deletion / service helpers).
   */
  protected getEmployeeMap(): Map<string, Employee> {
    return this.employees;
  }

  /**
   * Reassigns all reportees from an existing supervisor to another valid supervisor.
   * Both supervisors must share the same designation to preserve the reporting hierarchy.
   */
  public reassignReportees(fromSupervisorId: string, toSupervisorId: string): void {
    const fromSupervisor = this.getEmployeeById(fromSupervisorId);
    const toSupervisor = this.getEmployeeById(toSupervisorId);

    if (fromSupervisor.id === toSupervisor.id) {
      throw new ValidationError("Source and target supervisors cannot be the same.");
    }

    if (fromSupervisor.designation !== toSupervisor.designation) {
      throw new HierarchyError(
        `Cannot reassign reportees: Target supervisor '${toSupervisor.name}' (${toSupervisor.id}) has designation '${toSupervisor.designation}', but '${fromSupervisor.designation}' is required to preserve hierarchy.`
      );
    }

    const reporteeIds = [...fromSupervisor.reportees];
    for (const reporteeId of reporteeIds) {
      const reportee = this.getEmployeeById(reporteeId);
      reportee.setReportsTo(toSupervisor.id);
      toSupervisor.addReportee(reporteeId);
      fromSupervisor.removeReportee(reporteeId);
    }
  }

  /**
   * Deletes an employee from the organization.
   *
   * Edge cases handled:
   * 1. Target employee must exist (throws NotFoundError).
   * 2. If the employee has active reportees:
   *    - If no reassignment target is provided: Rejects deletion (throws HierarchyError).
   *    - If reassignment target is provided: Reassigns all reportees to target supervisor
   *      (target must exist and have the same designation).
   * 3. Cleans up bidirectional reference: removes deleted employee from supervisor's reportees list.
   * 4. If deleted employee is the CEO, clears the CEO reference.
   */
  public deleteEmployee(id: string, options?: { reassignReporteesTo?: string }): Employee {
    const employee = this.getEmployeeById(id);

    // Check if employee has active reportees
    if (employee.reportees.length > 0) {
      if (!options?.reassignReporteesTo) {
        throw new HierarchyError(
          `Cannot delete ${employee.designation} '${employee.name}' (${employee.id}): ` +
            `Employee has ${employee.reportees.length} active reportee(s) [${employee.reportees.join(", ")}]. ` +
            `Please reassign reportees before deleting or specify 'reassignReporteesTo'.`
        );
      }

      // Reassign reportees to the designated supervisor
      this.reassignReportees(employee.id, options.reassignReporteesTo);
    }

    // Bidirectional cleanup: remove from supervisor's reportees list
    if (employee.reportsTo) {
      const supervisor = this.employees.get(employee.reportsTo);
      if (supervisor) {
        supervisor.removeReportee(employee.id);
      }
    }

    // If CEO is being deleted, reset ceoId
    if (employee.designation === Designation.CEO) {
      this.ceoId = null;
    }

    // Remove from in-memory store
    this.employees.delete(employee.id);

    return employee;
  }

  /**
   * Resets the entire organization (clears store).
   */
  public clear(): void {
    this.employees.clear();
    this.ceoId = null;
  }
}
