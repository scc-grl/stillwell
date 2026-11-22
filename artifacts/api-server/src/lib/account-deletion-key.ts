import { createHash } from "node:crypto";
/** Non-reversible security tombstone: no account identifier or journal data remains. */
export const deletedAccountKey = (owner: string) => `deleted:${createHash("sha256").update(owner).digest("hex")}`;
export const deletionKeys = (owner: string) => [owner, deletedAccountKey(owner)];
