
import React, { useState, useMemo, useRef, memo } from 'react';
import { Icons, COLORS } from '../constants';
import { Contact, Story } from '../types';

interface SidebarProps {
  contacts: Contact[];
  activeContactId: string | null;
  onContactSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onProfileClick: () => void;
  userAvatar: string;
  onViewStories: (stories: Story[]) => void;
  onAddStory: (url: string, type: 'image' | 'video', caption?: string) => void;
  allStories: Story[];
  myStories: Story[];
}

// Optimized Contact Item for thousands of entries
const ContactItem = memo(({ contact, isActive, onClick }: { contact: Contact, isActive: boolean, onClick: () => void }) => (
  <div 
    onClick={onClick}
    className={`flex items-center p-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100/50 ${
      isActive ? 'bg-[#f0f2f5]' : ''
    }`}
  >
    <div className="relative shrink-0">
      <img loading="lazy" src={contact.avatar} alt={contact.name} className="w-12 h-12 rounded-full object-cover" />
      {contact.online && (
        <div className="absolute bottom-0.5 right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></div>
      )}
    </div>
    <div className="ml-3 flex-1 overflow-hidden">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-[#111b21] truncate text-[16px]">{contact.name}</h3>
        <span className="text-[11px] text-gray-500 font-medium">12:30 PM</span>
      </div>
      <p className="text-[13px] text-gray-500 truncate mt-0.5">{contact.lastMessage || 'Click to chat'}</p>
    </div>
  </div>
));

type TabType = 'chats' | 'status' | 'calls';

const Sidebar: React.FC<SidebarProps> = ({ 
  contacts, 
  activeContactId, 
  onContactSelect,
  searchQuery,
  onSearchChange,
  onProfileClick,
  userAvatar,
  onViewStories,
  onAddStory,
  allStories,
  myStories
}) => {
  const [isNewChatMode, setIsNewChatMode] = useState(false);
  const [newChatSearch, setNewChatSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabType>('chats');
  const [previewMedia, setPreviewMedia] = useState<{url: string, type: 'image' | 'video'} | null>(null);
  const [statusCaption, setStatusCaption] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredNewChatContacts = useMemo(() => {
    return contacts.filter(c => 
      c.name.toLowerCase().includes(newChatSearch.toLowerCase())
    );
  }, [contacts, newChatSearch]);

  const handleAddStoryClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const type = file.type.startsWith('video') ? 'video' : 'image';
      if (type === 'video') {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          if (video.duration > 60) {
            alert("দুঃখিত, ১ মিনিটের বেশি ভিডিও স্টোরি হিসেবে দেওয়া যাবে না।");
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => { setPreviewMedia({ url: reader.result as string, type }); setStatusCaption(''); };
          reader.readAsDataURL(file);
        };
        video.src = URL.createObjectURL(file);
      } else {
        const reader = new FileReader();
        reader.onloadend = () => { setPreviewMedia({ url: reader.result as string, type }); setStatusCaption(''); };
        reader.readAsDataURL(file);
      }
    }
    if (e.target) e.target.value = '';
  };

  const handlePostStory = () => {
    if (previewMedia) {
      onAddStory(previewMedia.url, previewMedia.type, statusCaption);
      setPreviewMedia(null);
      setStatusCaption('');
    }
  };

  const groupedStories = useMemo(() => {
    const groups: Record<string, Story[]> = {};
    allStories.forEach(s => {
      if (s.userId === 'me') return;
      if (!groups[s.userId]) groups[s.userId] = [];
      groups[s.userId].push(s);
    });
    return Object.values(groups);
  }, [allStories]);

  const renderContent = () => {
    switch(activeTab) {
      case 'status':
        return (
          <div className="flex-1 overflow-y-auto bg-white scroll-smooth relative">
            <div className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50" onClick={() => myStories.length > 0 ? onViewStories(myStories) : handleAddStoryClick()}>
              <div className="relative">
                <div className={`w-14 h-14 rounded-full p-0.5 border-2 ${myStories.length > 0 ? 'border-[#00a884]' : 'border-gray-200 border-dashed'}`}>
                  <img loading="lazy" src={userAvatar} className="w-full h-full rounded-full object-cover" />
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleAddStoryClick(); }} className="absolute bottom-0 right-0 bg-[#00a884] text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] border-2 border-white shadow-md">+</button>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-[#111b21]">My Status</h3>
                <p className="text-[13px] text-gray-500">{myStories.length > 0 ? 'Tap to view your updates' : 'Tap to add status update'}</p>
              </div>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
            </div>

            <div className="bg-[#f0f2f5] px-6 py-3 sticky top-0 z-10">
              <p className="text-[#008069] text-[12px] font-bold uppercase tracking-widest">Recent updates</p>
            </div>

            {groupedStories.length > 0 ? (
              groupedStories.map((group, idx) => (
                <div key={idx} onClick={() => onViewStories(group)} className="p-4 flex items-center gap-4 hover:bg-gray-50 cursor-pointer border-b border-gray-50 transition-colors">
                  <div className="w-14 h-14 rounded-full p-0.5 border-2 border-[#00a884]">
                    <img loading="lazy" src={group[0].userAvatar} className="w-full h-full rounded-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#111b21]">{group[0].userName}</h3>
                    <p className="text-[13px] text-gray-500">{new Date(group[0].timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-10 text-center text-gray-400 text-sm italic">No status updates.</div>
            )}
            
            {previewMedia && (
              <div className="fixed inset-0 md:absolute inset-0 bg-[#111b21] z-[100] flex flex-col animate-in fade-in duration-300">
                <div className="p-5 flex justify-between items-center text-white z-[110]">
                  <button onClick={() => setPreviewMedia(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><Icons.Back /></button>
                  <h4 className="font-bold tracking-tight">Status Preview</h4>
                  <div className="w-10"></div>
                </div>
                <div className="flex-1 w-full flex items-center justify-center overflow-hidden relative">
                  {previewMedia.type === 'video' ? <video src={previewMedia.url} autoPlay loop playsInline className="max-h-full max-w-full object-contain" /> : <img src={previewMedia.url} className="max-h-full max-w-full object-contain" />}
                </div>
                <div className="p-6 bg-black/40 backdrop-blur-xl border-t border-white/10 flex flex-col gap-5">
                  <div className="flex items-center gap-4 bg-white/10 rounded-2xl px-5 py-3 border border-white/5 focus-within:border-[#00a884] transition-all">
                    <Icons.Emoji />
                    <input type="text" placeholder="Add a caption..." className="flex-1 bg-transparent text-white outline-none text-sm py-1" value={statusCaption} onChange={(e) => setStatusCaption(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePostStory()} />
                  </div>
                  <div className="flex justify-between items-center px-2">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Visibility: All Contacts</span>
                    <button onClick={handlePostStory} className="w-16 h-16 bg-[#00a884] text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-105 active:scale-95 transition-transform"><Icons.Send /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'calls':
        return (
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-20 text-center flex flex-col items-center gap-6 opacity-30">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-400"><Icons.Calls /></div>
              <p className="text-gray-900 font-medium">Clear call history</p>
            </div>
          </div>
        );
      default:
        const filteredMainContacts = contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
        return (
          <div className="flex-1 overflow-y-auto">
            {filteredMainContacts.map((contact) => (
              <ContactItem 
                key={contact.id} 
                contact={contact} 
                isActive={activeContactId === contact.id} 
                onClick={() => onContactSelect(contact.id)} 
              />
            ))}
          </div>
        );
    }
  };

  if (isNewChatMode) {
    return (
      <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-[400px] animate-in slide-in-from-left duration-300 z-50">
        <div className="bg-[#008069] h-[108px] flex items-end p-5 text-white shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsNewChatMode(false)} className="hover:bg-black/10 p-2 rounded-full transition-colors"><Icons.Back /></button>
            <h1 className="text-xl font-bold mb-1">New Chat</h1>
          </div>
        </div>
        <div className="p-3 bg-white border-b border-gray-100"><div className="bg-[#f0f2f5] flex items-center px-4 py-2.5 rounded-xl"><span className="text-gray-400 mr-3"><Icons.Search /></span><input autoFocus type="text" placeholder="Search name or number" className="bg-transparent border-none outline-none text-[15px] w-full font-medium" value={newChatSearch} onChange={(e) => setNewChatSearch(e.target.value)} /></div></div>
        <div className="flex-1 overflow-y-auto">
          {filteredNewChatContacts.map((contact) => (
            <ContactItem key={contact.id} contact={contact} isActive={false} onClick={() => { onContactSelect(contact.id); setIsNewChatMode(false); setActiveTab('chats'); }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full md:w-[400px] relative">
      <div className="bg-[#f0f2f5] p-3 flex justify-between items-center h-[60px] sticky top-0 z-20">
        <button onClick={onProfileClick} className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden ring-1 ring-black/5 hover:ring-black/10 transition-all"><img src={userAvatar} className="w-full h-full object-cover" /></button>
        <div className="flex items-center gap-1 bg-white/40 p-1 rounded-full border border-black/5">
          <button onClick={() => setActiveTab('chats')} className={`p-2.5 rounded-full transition-all ${activeTab === 'chats' ? 'bg-[#00a884] text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-black/5'}`}><Icons.Chat /></button>
          <button onClick={() => setActiveTab('status')} className={`p-2.5 rounded-full transition-all ${activeTab === 'status' ? 'bg-[#00a884] text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-black/5'}`}><Icons.Status /></button>
          <button onClick={() => setActiveTab('calls')} className={`p-2.5 rounded-full transition-all ${activeTab === 'calls' ? 'bg-[#00a884] text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-black/5'}`}><Icons.Calls /></button>
        </div>
        <div className="flex gap-1 text-gray-500">
          <button onClick={() => setIsNewChatMode(true)} className="p-2.5 hover:bg-black/5 rounded-full transition-colors active:scale-90"><Icons.Plus /></button>
          <button className="p-2.5 hover:bg-black/5 rounded-full transition-colors"><Icons.More /></button>
        </div>
      </div>
      <div className="p-3 bg-white border-b border-gray-100/50">
        <div className="bg-[#f0f2f5] flex items-center px-4 py-2 rounded-xl">
          <span className="text-gray-400 mr-3 scale-90"><Icons.Search /></span>
          <input type="text" placeholder="Search chats" className="bg-transparent border-none outline-none text-[14px] w-full" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} />
        </div>
      </div>
      {renderContent()}
    </div>
  );
};

export default Sidebar;
