import { OrganizationCLI } from "./cli";

/**
 * Entry point for the Organization Management System.
 * Launches the interactive CLI in TTY environments,
 * or runs the comprehensive automated demo in non-interactive/demo mode.
 */
async function main(): Promise<void> {
  const cli = new OrganizationCLI();
  await cli.start();
}

main().catch((err: unknown) => {
  console.error("Fatal Application Error:", err);
  process.exit(1);
});
