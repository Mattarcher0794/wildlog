import { createFileRoute, redirect } from "@tanstack/react-router";

// The Field Journal has been reshaped into the species-grouped Life List.
// Keep the old path working (bookmarks, the previous tab target) by redirecting.
export const Route = createFileRoute("/_authenticated/journal")({
  beforeLoad: () => {
    throw redirect({ to: "/life-list" });
  },
});
