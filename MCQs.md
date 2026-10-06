# TypeScript Assignment

## Part 1: Multiple Choice Questions (MCQs)

---

### Question 1
**What is the compile-time type of `value`?**

```typescript
const arr = [1, "two", 3] as const;
const value = arr[1];
```

#### Options:
- **A.** `string`
- **B.** `"two"`
- **C.** `string | number`
- **D.** `1 | "two" | 3`

#### **Correct Answer:** `B. "two"`

#### **Explanation:**
When an array literal is declared with `as const` (const assertion), TypeScript infers it as a readonly tuple of literal types: `readonly [1, "two", 3]`. Indexing at constant index `1` (`arr[1]`) retrieves the exact literal type at that position, which is `"two"`.

---

### Question 2
**Given the following, what error (if any) occurs, and why?**

```typescript
interface A { x: number; y?: number; }
class C implements A {
  x = 0;
}
const c = new C();
c.y = 10;
```

#### Options:
- **A.** No error - optional interface properties are automatically added to any implementing class
- **B.** Error: Property 'y' does not exist on type 'C', implementing an interface with an optional property doesn't create that property on the class itself
- **C.** Error: Class 'C' incorrectly implements interface 'A' - missing property y
- **D.** No error, but c.y will be undefined at runtime since it was never declared

#### **Correct Answer:** `B. Error: Property 'y' does not exist on type 'C', implementing an interface with an optional property doesn't create that property on the class itself`

#### **Explanation:**
In TypeScript, the `implements` clause is only a compile-time check ensuring the class satisfies the interface shape. It does not declare or inject properties into the class definition. Since `y` is optional in interface `A`, class `C` satisfies `A` without defining `y`, but `c` (of type `C`) does not have `y` declared. Thus, assigning `c.y = 10` results in compile-time error `TS2339: Property 'y' does not exist on type 'C'`.

---

### Question 3
**What does the following code print, and why?**

```typescript
enum Status {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
}
enum Level {
  Active = "ACTIVE",
  Low = "LOW",
}
function check(s: Status) {
  return s;
}
check(Level.Active);
```

#### Options:
- **A.** Compiles and prints "ACTIVE", TypeScript enums are compared structurally, like objects
- **B.** Compile-time error, string enum members are nominally typed, so Level.Active isn't assignable to Status despite identical string values
- **C.** Compiles fine only because both enums happen to share the exact same member names
- **D.** Runtime error, two enums cannot declare the same string value across a project

#### **Correct Answer:** `B. Compile-time error, string enum members are nominally typed, so Level.Active isn't assignable to Status despite identical string values`

#### **Explanation:**
TypeScript enums (especially string enums) have nominal typing characteristics rather than structural typing. Even though `Status.Active` and `Level.Active` share the same underlying string value `"ACTIVE"`, `Level.Active` is not assignable to type `Status`. Passing `Level.Active` causes compile-time error `TS2345: Argument of type 'Level.Active' is not assignable to parameter of type 'Status'`.

---

### Question 4
**What is the type of `A["id"]` in the following code?**

```typescript
type A = { id: number } & { id: string };
```

#### Options:
- **A.** `number | string`
- **B.** `string`
- **C.** `never`
- **D.** Compile-time error at the type declaration itself

#### **Correct Answer:** `C. never`

#### **Explanation:**
When intersecting object types (`&`), properties with identical keys are intersected. Therefore, the type of property `id` is `number & string`. Since a value cannot be both a `number` and a `string` simultaneously (disjoint primitive types), their intersection resolves to `never`. Hence, lookup type `A["id"]` evaluates to `never`.

---

### Question 5
**What is the inferred return type of `getArea` below, and what compiler issue exists?**

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "triangle"; base: number; height: number };

function getArea(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
  }
}
```

#### Options:
- **A.** number, no issue, since switch statements exhaustively narrow discriminated unions by default
- **B.** Compile-time error, not all code paths return a value; the triangle case is unhandled and there's no default/never-based exhaustiveness check
- **C.** number | undefined, TypeScript silently allows the missing case and treats the fallthrough as undefined
- **D.** No issue, since shape.kind for triangle is automatically narrowed to never by the compiler

#### **Correct Answer:** `B. Compile-time error, not all code paths return a value; the triangle case is unhandled and there's no default/never-based exhaustiveness check`

#### **Explanation:**
The function signature explicitly specifies `: number` as its return type. When `shape` is of kind `"triangle"`, the switch statement has no matching branch and falls through without returning a value. TypeScript flags this with compile-time error `TS2366: Function lacks ending return statement and return type does not include 'undefined'`.
