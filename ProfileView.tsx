
import React, { useState, useRef } from 'react';
import { Icons } from '../constants';
import { Contact } from '../types';

interface ProfileViewProps {
  onBack: () => void;
  userProfile: { name: string; avatar: string; about: string };
  onUpdateProfile: (profile: { name: string; avatar: string; about: string }) => void;
  blockedContacts: Contact[];
  onUnblockContact: (id: string) => void;
}

type SubView = 'main' | 'account' | 'privacy' | 'chats' | 'notifications' | 'storage' | 'help' | 'profile_edit' | 'blocked_list';

const ProfileView: React.FC<ProfileViewProps> = ({ onBack, userProfile, onUpdateProfile, blockedContacts, onUnblockContact }) => {
  const [currentSubView, setCurrentSubView] = useState<SubView>('main');
  const [editingField, setEditingField] = useState<'name' | 'about' | null>(null);
  const [tempValue, setTempValue] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toggles, setToggles] = useState({
    security: true,
    lastSeen: 'everyone',
    readReceipts: true,
    mediaAuto: true,
    convoTones: true,
    darkTheme: false
  });

  const handleToggle = (key: keyof typeof toggles) => {
    setToggles(prev => ({ ...prev, [key]: typeof prev[key] === 'boolean' ? !prev[key] : prev[key] }));
  };

  const startEditing = (field: 'name' | 'about') => {
    setEditingField(field);
    setTempValue(userProfile[field]);
  };

  const saveEdit = () => {
    if (editingField) {
      onUpdateProfile({ ...userProfile, [editingField]: tempValue });
      setEditingField(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onUpdateProfile({ ...userProfile, avatar: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const renderToggle = (active: boolean, onClick: () => void) => (
    <div 
      onClick={onClick}
      className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${active ? 'bg-[#00a884]' : 'bg-gray-300'}`}
    >
      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform duration-200 ${active ? 'translate-x-5' : 'translate-x-1'}`} />
    </div>
  );

  const Header = ({ title, onBackClick }: { title: string, onBackClick: () => void }) => (
    <div className="bg-[#008069] h-[108px] flex items-end p-5 text-white shrink-0">
      <div className="flex items-center gap-6">
        <button onClick={onBackClick} className="hover:bg-[#005e4d] p-1 rounded-full transition-colors">
          <Icons.Back />
        </button>
        <h1 className="text-lg font-medium mb-1">{title}</h1>
      </div>
    </div>
  );

  const renderMainSettings = () => (
    <>
      <Header title="Settings" onBackClick={onBack} />
      <div className="flex-1 overflow-y-auto">
        <div 
          onClick={() => setCurrentSubView('profile_edit')}
          className="bg-white flex items-center p-4 mb-2 cursor-pointer hover:bg-gray-50 transition-colors"
        >
          <div className="relative group">
            <img src={userProfile.avatar} alt="Profile" className="w-16 h-16 rounded-full object-cover" />
          </div>
          <div className="ml-4 flex-1">
            <h2 className="text-lg text-gray-900 font-medium">{userProfile.name}</h2>
            <p className="text-sm text-gray-500 truncate">{userProfile.about}</p>
          </div>
        </div>

        <div className="bg-white">
          {[
            { id: 'account' as SubView, title: 'Account', sub: 'Security notifications, change number', icon: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z' },
            { id: 'privacy' as SubView, title: 'Privacy', sub: 'Block contacts, disappearing messages', icon: 'M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z' },
            { id: 'chats' as SubView, title: 'Chats', sub: 'Theme, wallpapers, chat history', icon: 'M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z' },
            { id: 'notifications' as SubView, title: 'Notifications', sub: 'Message, group & call tones', icon: 'M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z' },
            { id: 'storage' as SubView, title: 'Storage and Data', sub: 'Network usage, auto-download', icon: 'M21 16.5c0 .38-.21.71-.53.88l-7.97 4.44c-.16.09-.33.13-.5.13s-.34-.04-.5-.13l-7.97-4.44c-.32-.17-.53-.5-.53-.88v-9c0-.38.21-.71.53-.88l7.97-4.44c.16-.09.33-.13.5-.13s.34.04.5.13l7.97 4.44c.32.17.53.5.53.88v9zM12 4.15L6.04 7.5 12 10.85l5.96-3.35L12 4.15zM5 15.91l6 3.35v-6.71l-6-3.35v6.71zm14 0v-6.71l-6 3.35v6.71l6-3.35z' },
          ].map((item) => (
            <div 
              key={item.id}
              onClick={() => setCurrentSubView(item.id)}
              className="flex items-center p-4 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
            >
              <div className="w-12 flex justify-center text-gray-500">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d={item.icon}></path></svg>
              </div>
              <div className="ml-2 flex-1">
                <h3 className="text-base text-gray-900 leading-tight">{item.title}</h3>
                <p className="text-sm text-gray-500">{item.sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );

  const renderProfileEditView = () => (
    <>
      <Header title="Profile" onBackClick={() => setCurrentSubView('main')} />
      <div className="flex-1 overflow-y-auto bg-[#f0f2f5]">
        <div className="flex justify-center py-7">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="relative w-48 h-48 rounded-full overflow-hidden cursor-pointer group shadow-md"
          >
            <img src={userProfile.avatar} alt="Profile" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
               <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 9c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm7-4.5h-2c-.55 0-1-.45-1-1v-.5c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v.5c0 .55-.45 1-1 1H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2-12c0-1.1-.9-2-2-2zm-7 13c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z"></path></svg>
               <p className="text-[10px] uppercase font-bold mt-2 text-center px-4 leading-tight">Change Profile Photo</p>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={handleFileChange}
            />
          </div>
        </div>

        <div className="bg-white px-8 py-4 mb-3">
          <label className="text-xs text-[#008069] font-medium block mb-2 uppercase">Your name</label>
          {editingField === 'name' ? (
            <div className="flex items-center gap-2 border-b-2 border-[#00a884] pb-1">
              <input 
                autoFocus
                type="text" 
                value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 outline-none text-gray-800"
              />
              <button onClick={saveEdit} className="text-[#00a884]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center group">
              <span className="text-gray-800">{userProfile.name}</span>
              <button onClick={() => startEditing('name')} className="text-gray-400">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>
              </button>
            </div>
          )}
        </div>

        <div className="bg-white px-8 py-4 mb-3">
          <label className="text-xs text-[#008069] font-medium block mb-2 uppercase">About</label>
          {editingField === 'about' ? (
            <div className="flex items-center gap-2 border-b-2 border-[#00a884] pb-1">
              <input 
                autoFocus
                type="text" 
                value={tempValue} 
                onChange={(e) => setTempValue(e.target.value)}
                className="flex-1 outline-none text-gray-800"
              />
              <button onClick={saveEdit} className="text-[#00a884]">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z"></path></svg>
              </button>
            </div>
          ) : (
            <div className="flex justify-between items-center group">
              <span className="text-gray-800">{userProfile.about}</span>
              <button onClick={() => startEditing('about')} className="text-gray-400">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"></path></svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderBlockedListView = () => (
    <>
      <Header title="Blocked contacts" onBackClick={() => setCurrentSubView('privacy')} />
      <div className="flex-1 overflow-y-auto bg-white">
        {blockedContacts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
             No blocked contacts
          </div>
        ) : (
          blockedContacts.map(contact => (
            <div key={contact.id} className="flex items-center p-3 border-b border-gray-100 hover:bg-gray-50 group">
              <img src={contact.avatar} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
              <div className="ml-3 flex-1">
                <h4 className="text-sm font-medium text-gray-900">{contact.name}</h4>
              </div>
              <button 
                onClick={() => onUnblockContact(contact.id)}
                className="text-xs font-semibold text-[#00a884] opacity-0 group-hover:opacity-100 transition-opacity"
              >
                UNBLOCK
              </button>
            </div>
          ))
        )}
      </div>
    </>
  );

  const renderPrivacyView = () => (
    <>
      <Header title="Privacy" onBackClick={() => setCurrentSubView('main')} />
      <div className="flex-1 overflow-y-auto bg-white">
        <div className="bg-[#f0f2f5] px-4 py-3">
          <h5 className="text-xs text-[#008069] font-bold uppercase tracking-wider">Who can see my personal info</h5>
        </div>
        {[
          { label: 'Last seen', val: 'Everyone' },
          { label: 'Profile photo', val: 'Everyone' },
          { label: 'About', val: 'Everyone' },
          { label: 'Status', val: 'My contacts' },
        ].map(item => (
          <div key={item.label} className="p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100">
            <h4 className="text-sm text-gray-900">{item.label}</h4>
            <span className="text-sm text-gray-500">{item.val}</span>
          </div>
        ))}
        <div className="p-4 flex items-center justify-between hover:bg-gray-50 border-b border-gray-100">
          <div>
            <h4 className="text-sm text-gray-900">Read receipts</h4>
            <p className="text-xs text-gray-500">If turned off, you won't send or receive read receipts.</p>
          </div>
          {renderToggle(toggles.readReceipts, () => handleToggle('readReceipts'))}
        </div>
        <div 
          onClick={() => setCurrentSubView('blocked_list')}
          className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer"
        >
          <div>
            <h4 className="text-sm text-gray-900">Blocked contacts</h4>
            <p className="text-xs text-gray-500">{blockedContacts.length}</p>
          </div>
        </div>
      </div>
    </>
  );

  const renderCurrentView = () => {
    switch (currentSubView) {
      case 'profile_edit': return renderProfileEditView();
      case 'privacy': return renderPrivacyView();
      case 'blocked_list': return renderBlockedListView();
      case 'chats': return (
        <>
          <Header title="Chats" onBackClick={() => setCurrentSubView('main')} />
          <div className="flex-1 bg-white p-4">Theme and Wallpapers are coming soon.</div>
        </>
      );
      case 'account': 
        return (
          <>
            <Header title="Account" onBackClick={() => setCurrentSubView('main')} />
            <div className="flex-1 bg-white p-4">Account settings.</div>
          </>
        );
      default: return renderMainSettings();
    }
  };

  return (
    <div className="absolute inset-0 z-20 bg-[#f0f2f5] flex flex-col transition-all duration-300 ease-in-out">
      {renderCurrentView()}
      
      {currentSubView === 'main' && (
        <div className="p-8 text-center shrink-0">
          <p className="text-sm text-gray-400 font-medium tracking-widest uppercase">from</p>
          <p className="text-sm text-gray-900 font-bold flex items-center justify-center gap-1 mt-1">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"></path></svg>
            META
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileView;
