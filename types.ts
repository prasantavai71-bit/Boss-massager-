
export interface StoryReply {
  id: string;
  userName: string;
  userAvatar: string;
  text: string;
  timestamp: number;
}

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  status: 'sent' | 'delivered' | 'read';
  translatedText?: string;
  isTranslating?: boolean;
  file?: {
    name: string;
    type: 'image' | 'audio' | 'document' | 'location';
    url: string;
    size?: string;
    duration?: string;
    base64?: string;
    location?: { lat: number; lng: number };
  };
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string; 
  timestamp: number;
  mediaType: 'image' | 'video';
  caption?: string;
  replies?: StoryReply[];
  viewCount?: number;
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  lastMessage?: string;
  lastSeen?: string;
  online: boolean;
  unreadCount: number;
}

export interface ChatState {
  activeContactId: string | null;
  messages: Record<string, Message[]>;
}

export type CallType = 'audio' | 'video';
export type CallStatus = 'idle' | 'calling' | 'connected' | 'ended';

export interface CallState {
  isActive: boolean;
  type: CallType;
  contact: Contact | null;
  status: CallStatus;
  startTime?: number;
}
