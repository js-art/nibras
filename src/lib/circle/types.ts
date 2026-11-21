import type { CirclePlace } from "@/lib/circle/place";

export const CIRCLE_ROLES = ["agent", "investor", "buyer", "seller"] as const;
export const POST_KINDS = ["note", "reading", "ask", "desk"] as const;
export const REACTION_KINDS = ["like", "love", "laugh", "wow", "sad", "fire", "useful", "question", "watch"] as const;
export const VISIBILITIES = ["circle", "followers"] as const;

export type CircleRole = (typeof CIRCLE_ROLES)[number];
export type PostKind = (typeof POST_KINDS)[number];
export type ReactionKind = (typeof REACTION_KINDS)[number];
export type Visibility = (typeof VISIBILITIES)[number];
export type FeedScope = "circle" | "following" | "agents" | "investors" | "buyers" | "sellers";

export type CircleViewer = {
  id: string;
  handle: string;
  displayName: string;
  role: CircleRole;
  city: string;
  focus: string;
  sample: boolean;
};

export type CirclePerson = CircleViewer & {
  bio: string;
  followers: number;
  following: number;
  followedByMe: boolean;
};

export type CircleAuthor = {
  id: string;
  handle: string;
  displayName: string;
  role: CircleRole;
  city: string;
  sample: boolean;
};

export type CircleCommentView = {
  id: string;
  body: string;
  createdAt: string;
  answer: boolean;
  author: CircleAuthor;
};

export type CirclePostView = {
  id: string;
  body: string;
  kind: PostKind;
  visibility: Visibility;
  createdAt: string;
  when: string;
  sample: boolean;
  canAnswer: boolean;
  author: CircleAuthor;
  project: { id: string; name: string; point: [number, number] | null } | null;
  place: CirclePlace | null;
  reactions: Record<ReactionKind, number>;
  myReaction: ReactionKind | null;
  commentCount: number;
  comments: CircleCommentView[];
  bookmarked: boolean;
};

export type CircleNoticeView = {
  id: string;
  type: string;
  createdAt: string;
  when: string;
  actor: CircleAuthor;
  postId: string | null;
};

export type CircleTagView = {
  tag: string;
  useCount: number;
};

export type NeighbourhoodChoice = {
  id: string;
  name: string;
  cityId: string;
  cityName: string;
  country: "ae" | "om";
  center: [number, number];
  ring: [number, number][];
};

export type ProjectFacts = {
  kind: "apartment" | "villa" | "townhouse";
  startPrice: number;
  handover: string;
  sizeMin: number;
  sizeMax: number;
  unitCount: number;
  currency: "AED" | "OMR";
};

export type ProjectChoice = {
  id: string;
  name: string;
  areaId?: string;
  areaName?: string;
  country?: "ae" | "om";
  point?: [number, number];
  areaPoint?: [number, number];
  introducedBy?: { handle: string; displayName: string } | null;
};

export type DeskPerson = {
  handle: string;
  displayName: string;
  role: CircleRole;
};
