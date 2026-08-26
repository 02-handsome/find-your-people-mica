import { Dumbbell, Footprints, Volleyball } from "lucide-react";

import type { Activity } from "@/lib/intents";

/**
 * One icon per activity, shared by the intent form's picker grid, the intent
 * card and the match list.
 *
 * They carry no information the label does not — they exist so three otherwise
 * identical rectangles are distinguishable at a glance, and so the intent card
 * has something to lead with where Stitch leads with a coffee cup.
 */
const ICONS: Record<Activity, typeof Dumbbell> = {
  gym: Dumbbell,
  running: Footprints,
  sport: Volleyball,
};

export function ActivityIcon({
  activity,
  className = "size-5",
}: {
  activity: Activity;
  className?: string;
}) {
  const Icon = ICONS[activity];
  return <Icon aria-hidden className={className} strokeWidth={1.75} />;
}
