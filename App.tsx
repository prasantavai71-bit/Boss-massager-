
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import ProfileView from './components/ProfileView';
import ContactProfileView from './components/ContactProfileView';
import CallOverlay from './components/CallOverlay';
import StoryViewer from './components/StoryViewer';
import { Contact, Message, CallState, CallType, Story, StoryReply } from './types';
import { geminiService } from './services/gemini';
import { Icons } from './constants';

const INITIAL_CONTACTS: Contact[] = [
  { id: '1', name: 'Boss Anik', avatar: 'https://picsum.photos/seed/anik/100', online: true, unreadCount: 2, lastMessage: 'The project is ready, boss!' },
  { id: '2', name: 'Zerin Sultana', avatar: 'https://picsum.photos/seed/jerin/100', online: false, unreadCount: 0, lastMessage: 'Check the new updates.' },
  { id: '3', name: 'Rakib Hossain', avatar: 'https://picsum.photos/seed/rakib/100', online: true, unreadCount: 0, lastMessage: 'Document sent successfully.' },
  { id: '4', name: 'Mamata Banu', avatar: 'https://picsum.photos/seed/mamata/100', online: false, unreadCount: 0, lastMessage: 'Happy Birthday to the Boss!' },
  { id: '5', name: 'Personal Driver', avatar: 'https://picsum.photos/seed/taxi/100', online: false, unreadCount: 0, lastMessage: 'Waiting at the gate.' },
];

const MOCK_STORIES: Story[] = [
  { id: 's1', userId: '1', userName: 'Boss Anik', userAvatar: 'https://picsum.photos/seed/anik/100', imageUrl: 'https://picsum.photos/seed/status1/800/1200', timestamp: Date.now() - 3600000, mediaType: 'image', caption: 'Chilling at the office ☕' },
  { id: 's2', userId: '2', userName: 'Zerin Sultana', userAvatar: 'https://picsum.photos/seed/jerin/100', imageUrl: 'https://picsum.photos/seed/status2/800/1200', timestamp: Date.now() - 7200000, mediaType: 'image', caption: 'Hard work pays off 🚀' },
];

const App: React.FC = () => {
  // Use unique keys for Boss Massager to avoid collision with other clones
  const STORAGE_KEY_PREFIX = 'boss_massager_v1_';

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'contacts');
    return saved ? JSON.parse(saved) : INITIAL_CONTACTS;
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'messages');
    if (saved) {
      const parsed = JSON.parse(saved);
      Object.keys(parsed).forEach(id => {
        parsed[id] = parsed[id].map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
      });
      return parsed;
    }
    return {};
  });

  const [myStories, setMyStories] = useState<Story[]>([]);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [activeStoryGroup, setActiveStoryGroup] = useState<Story[] | null>(null);

  const [blockedContactIds, setBlockedContactIds] = useState<string[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'blocked');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [callState, setCallState] = useState<CallState>({ isActive: false, type: 'audio', contact: null, status: 'idle' });
  
  const [userProfile, setUserProfile] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY_PREFIX + 'user_profile');
    return saved ? JSON.parse(saved) : {
      name: 'The Boss',
      avatar: 'https://picsum.photos/seed/boss/200',
      about: 'Quality is not an act, it is a habit. 👑'
    };
  });

  // Persist state to local storage with optimized effect
  useEffect(() => {
    const persistData = () => {
      try {
        localStorage.setItem(STORAGE_KEY_PREFIX + 'contacts', JSON.stringify(contacts));
        localStorage.setItem(STORAGE_KEY_PREFIX + 'messages', JSON.stringify(messages));
        localStorage.setItem(STORAGE_KEY_PREFIX + 'blocked', JSON.stringify(blockedContactIds));
        localStorage.setItem(STORAGE_KEY_PREFIX + 'user_profile', JSON.stringify(userProfile));
      } catch (e) {
        console.error("Local Storage sync failed:", e);
      }
    };
    persistData();
  }, [contacts, messages, blockedContactIds, userProfile]);

  const handleAddStory = (url: string, type: 'image' | 'video', caption?: string) => {
    const newStory: Story = {
      id: Date.now().toString(),
      userId: 'me',
      userName: userProfile.name,
      userAvatar: userProfile.avatar,
      imageUrl: url,
      timestamp: Date.now(),
      mediaType: type,
      caption: caption,
      replies: [],
      viewCount: 0
    };
    setMyStories(prev => [newStory, ...prev]);
  };

  const activeContact = useMemo(() => 
    contacts.find(c => c.id === activeContactId) || null
  , [activeContactId, contacts]);

  const updateMessageStatus = useCallback((contactId: string, msgId: string, status: Message['status']) => {
    setMessages(prev => {
      const chat = prev[contactId] || [];
      return {
        ...prev,
        [contactId]: chat.map(m => m.id === msgId ? { ...m, status } : m)
      };
    });
  }, []);

  const handleSendMessage = async (text: string, file?: Message['file']) => {
    if (!activeContactId || !activeContact || blockedContactIds.includes(activeContactId)) return;
    
    const userMsgId = Date.now().toString();
    const newUserMessage: Message = { 
      id: userMsgId, 
      text, 
      sender: 'user', 
      timestamp: new Date(), 
      status: 'sent',
      file 
    };

    setMessages(prev => ({ ...prev, [activeContactId]: [...(prev[activeContactId] || []), newUserMessage] }));
    
    // Simulate Delivery (800ms)
    setTimeout(() => updateMessageStatus(activeContactId, userMsgId, 'delivered'), 800);

    setIsTyping(true);
    let aiText = '';
    try {
      const stream = geminiService.getResponseStream(text, activeContact.name);
      let aiMsgId = (Date.now() + 1).toString();
      let firstChunk = true;
      
      for await (const chunk of stream) {
        if (firstChunk) {
          setIsTyping(false); 
          firstChunk = false;
          // Mark as READ (Double Red Ticks) when Boss AI starts responding
          updateMessageStatus(activeContactId, userMsgId, 'read');
          
          setMessages(prev => ({ ...prev, [activeContactId]: [...(prev[activeContactId] || []), { id: aiMsgId, text: '', sender: 'ai', timestamp: new Date(), status: 'read' }] }));
        }
        aiText += chunk;
        setMessages(prev => ({ 
          ...prev, 
          [activeContactId]: prev[activeContactId].map(m => m.id === aiMsgId ? { ...m, text: aiText } : m) 
        }));
        setContacts(prev => prev.map(c => c.id === activeContactId ? { ...c, lastMessage: aiText } : c));
      }
    } catch (e) { 
      console.error(e); 
      setIsTyping(false); 
    }
  };

  return (
    <div className="h-screen w-screen flex items-center justify-center overflow-hidden bg-[#dadbd3] md:p-4 lg:p-6">
      <div className="flex h-full w-full max-w-[1600px] shadow-2xl overflow-hidden bg-white relative rounded-none md:rounded-xl">
        {/* Sidebar */}
        <div className={`h-full relative overflow-hidden shrink-0 transition-all duration-300 ${activeContactId ? 'hidden md:block w-[350px] lg:w-[420px]' : 'block w-full'}`}>
          <Sidebar 
            contacts={contacts}
            activeContactId={activeContactId}
            onContactSelect={(id) => {
              setActiveContactId(id);
              setContacts(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
            }}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onProfileClick={() => setShowProfile(true)}
            userAvatar={userProfile.avatar}
            onViewStories={(stories) => setActiveStoryGroup(stories)}
            onAddStory={handleAddStory}
            allStories={[...myStories, ...MOCK_STORIES]}
            myStories={myStories}
          />
          {showProfile && (
            <ProfileView 
              onBack={() => setShowProfile(false)} 
              userProfile={userProfile}
              onUpdateProfile={setUserProfile}
              blockedContacts={contacts.filter(c => blockedContactIds.includes(c.id))}
              onUnblockContact={(id) => setBlockedContactIds(prev => prev.filter(bid => bid !== id))}
            />
          )}
        </div>

        {/* Chat / Welcome Area */}
        <div className={`flex-1 h-full overflow-hidden ${!activeContactId ? 'hidden md:flex bg-[#f8f9fa]' : 'flex'}`}>
          {activeContact ? (
            <div className="flex-1 h-full min-w-0">
              <ChatWindow 
                contact={activeContact}
                messages={messages[activeContactId!] || []}
                onSendMessage={handleSendMessage}
                onBack={() => setActiveContactId(null)}
                isTyping={isTyping}
                onAvatarClick={() => {}} // Could link to contact info
                isBlocked={blockedContactIds.includes(activeContact.id)}
                onUnblock={() => setBlockedContactIds(prev => prev.filter(bid => bid !== activeContact.id))}
                onVideoCall={() => setCallState({ isActive: true, type: 'video', contact: activeContact, status: 'calling' })}
                onAudioCall={() => setCallState({ isActive: true, type: 'audio', contact: activeContact, status: 'calling' })}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 bg-[#f0f2f5] text-center">
              <div className="relative mb-12 transform hover:scale-105 transition-transform duration-500">
                <div className="w-64 h-64 bg-white/50 backdrop-blur-sm rounded-full flex items-center justify-center shadow-xl">
                   <div className="w-52 h-52 bg-[#00a884] rounded-full flex items-center justify-center text-white shadow-2xl">
                      <Icons.Chat />
                   </div>
                </div>
                <div className="absolute -bottom-4 -right-4 bg-white p-5 rounded-3xl shadow-2xl border-4 border-[#f0f2f5]">
                   <Icons.Send />
                </div>
              </div>
              <h2 className="text-4xl font-light text-gray-800 mb-4 tracking-tight">Boss Massager Pro</h2>
              <p className="text-gray-500 max-w-sm leading-relaxed text-[15px]">
                Welcome to your command center. Send encrypted messages, manage statuses, and keep your business moving.
              </p>
              <div className="mt-16 flex items-center gap-3 text-[#00a884] text-xs font-bold tracking-widest uppercase bg-white/50 px-6 py-3 rounded-full shadow-sm">
                 <Icons.Status />
                 End-to-End Encrypted
              </div>
            </div>
          )}
        </div>

        {/* Overlays */}
        {activeStoryGroup && (
          <StoryViewer 
            stories={activeStoryGroup} 
            onClose={() => setActiveStoryGroup(null)}
          />
        )}

        {callState.isActive && callState.contact && (
          <CallOverlay 
            contact={callState.contact} 
            type={callState.type} 
            onEndCall={() => setCallState(prev => ({ ...prev, isActive: false }))}
            availableContacts={contacts}
          />
        )}
      </div>
    </div>
  );
};

export default App;
