import { createFileRoute, redirect } from "@tanstack/react-router";

// The species detail is now presented as a bottom-sheet overlay on top of the
// Life List (so the blurred backdrop shows the real list behind it). This route
// is kept for deep links / old URLs and simply forwards into that overlay.
export const Route = createFileRoute("/_authenticated/species/$species")({
  head: () => ({
    meta: [{ name: "robots", content: "noindex" }],
  }),
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/life-list",
      search: { species: params.species },
    });
  },
});
