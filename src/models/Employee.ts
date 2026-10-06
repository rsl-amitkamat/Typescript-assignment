import { Designation, IEmployeeData, HierarchyError } from "../types";

/**
 * Abstract base class representing an Employee in the organization.
 * Encapsulates common attributes and defines hierarchical constraints.
 */
export abstract class Employee {
  protected readonly _id: string;
  protected _name: string;
  protected _dateOfBirth: string;
  protected readonly _designation: Designation;
  protected _reportsTo: string | null;
  protected _reportees: string[];

  constructor(
    id: string,
    name: string,
    dateOfBirth: string,
    designation: Designation,
    reportsTo: string | null = null,
    reportees: string[] = []
  ) {
    this._id = id;
    this._name = name;
    this._dateOfBirth = dateOfBirth;
    this._designation = designation;
    this._reportsTo = reportsTo;
    this._reportees = [...reportees];
  }

  // Getters
  public get id(): string {
    return this._id;
  }

  public get name(): string {
    return this._name;
  }

  public get dateOfBirth(): string {
    return this._dateOfBirth;
  }

  public get designation(): Designation {
    return this._designation;
  }

  public get reportsTo(): string | null {
    return this._reportsTo;
  }

  public get reportees(): ReadonlyArray<string> {
    return [...this._reportees];
  }

  // Mutators
  public setName(name: string): void {
    this._name = name;
  }

  public setDateOfBirth(dateOfBirth: string): void {
    this._dateOfBirth = dateOfBirth;
  }

  public setReportsTo(supervisorId: string | null): void {
    this._reportsTo = supervisorId;
  }

  /**
   * Adds a reportee ID to this employee's reportees list.
   * Throws HierarchyError if the designation does not allow reportees.
   */
  public addReportee(reporteeId: string): void {
    if (!this.canHaveReportees()) {
      throw new HierarchyError(
        `${this.designation} (${this.id}) cannot have any reportees.`
      );
    }
    if (!this._reportees.includes(reporteeId)) {
      this._reportees.push(reporteeId);
    }
  }

  /**
   * Removes a reportee ID from this employee's reportees list.
   */
  public removeReportee(reporteeId: string): boolean {
    const index = this._reportees.indexOf(reporteeId);
    if (index !== -1) {
      this._reportees.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Checks whether this employee has a specific reportee.
   */
  public hasReportee(reporteeId: string): boolean {
    return this._reportees.includes(reporteeId);
  }

  /**
   * Replaces all reportees.
   */
  public setReportees(reporteeIds: string[]): void {
    if (!this.canHaveReportees() && reporteeIds.length > 0) {
      throw new HierarchyError(
        `${this.designation} (${this.id}) cannot have any reportees.`
      );
    }
    this._reportees = [...reporteeIds];
  }

  /**
   * Clears all reportees from this employee.
   */
  public clearReportees(): void {
    this._reportees = [];
  }

  /**
   * Abstract methods to be implemented by each concrete role class.
   */
  public abstract canHaveReportees(): boolean;
  public abstract getAllowedSupervisorDesignation(): Designation | null;
  public abstract getAllowedReporteeDesignation(): Designation | null;

  /**
   * Serializes the employee to a plain data object.
   */
  public toJSON(): IEmployeeData {
    return {
      id: this._id,
      name: this._name,
      dateOfBirth: this._dateOfBirth,
      designation: this._designation,
      reportsTo: this._reportsTo,
      reportees: [...this._reportees],
    };
  }
}
