import { Timestamp } from "firebase/firestore";

export interface UserData {
  uid: string;
  username: string;
  email: string;
  photoURL: string;
  role: "Owner" | "Developer" | "Member" | "Guest" | "Banned";
}

export interface Game {
  id: string;
  title: string;
  img: string;
  url: string;
  tags?: string[];
  badge?: string;
  orderIndex?: number; // For Drag and Drop sorting
  [key: string]: any;
}

export interface Group {
  id: string;
  title: string;
  img: string;
  rule?: string;
  rules?: string[]; // Support for multiple category rules
  [key: string]: any;
}

export interface PollOption {
  id: number;
  text: string;
  votes: number;
}

export interface Post {
  id: string;
  text: string;
  timestamp: Timestamp;
  authorUid: string;
  replyCount: number;
  authorData?: UserData;
  // New Features
  isPinned?: boolean;
  isLocked?: boolean;
  isDeleted?: boolean;
  type?: 'text' | 'poll';
  pollOptions?: PollOption[];
  // Map of UID -> OptionID (Index)
  votedUsers?: Record<string, number>;
  // Internal use for Garbage Bin
  _collection?: string;
}

export interface Comment {
  id: string;
  text: string;
  timestamp: Timestamp;
  authorUid: string;
  authorData?: UserData;
}