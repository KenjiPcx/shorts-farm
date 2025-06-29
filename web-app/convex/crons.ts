import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// This cron job runs every day at 9am UTC to generate the next video
crons.daily(
    "generate daily video",
    { hourUTC: 9, minuteUTC: 0 },
    internal.workflow.runDailyVideoCreation,
);

export default crons; 