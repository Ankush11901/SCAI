import { config } from "dotenv";
import { resolve } from "path";
config({ path: resolve(process.cwd(), ".env.local") });

import { db } from "../lib/db";
import { bulkJobs } from "../lib/db/schema";
import { eq, or } from "drizzle-orm";

async function cancelJobs() {
  const jobs = await db
    .select()
    .from(bulkJobs)
    .where(or(eq(bulkJobs.status, "running"), eq(bulkJobs.status, "pending")));

  console.log("Running/Pending jobs:", jobs.length);

  for (const job of jobs) {
    await db
      .update(bulkJobs)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(bulkJobs.id, job.id));
    console.log("Cancelled job:", job.id);
  }

  console.log("All jobs cancelled");
  process.exit(0);
}

cancelJobs();
