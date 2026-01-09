
import React from 'react';
import { Icons } from '../constants';
import { Contact } from '../types';

interface ContactProfileViewProps {
  contact: Contact;
  onClose: () => void;
  onBlock: () => void;
  onReport: () => void;
  isBlocked?: boolean;
  isReported?: boolean;
}

const ContactProfileView: React.FC<ContactProfileViewProps> = ({ contact, onClose, onBlock, onReport, isBlocked, isReported }) => {
  return (
    <div className="absolute inset-0 md:relative md:w-[400px] h-full bg-[#f0f2f5] border-l border-gray-200 z-30 flex flex-col animate-in slide-in-from-right duration-300">
      <div className="bg-white h-[60px] flex items-center px-4 gap-6 border-b border-gray-200 shrink-0">
        <button onClick={onClose} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors">
          <Icons.Back />
        </button>
        <h2 className="text-gray-900 font-medium">Contact info</h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="bg-white px-8 py-7 flex flex-col items-center shadow-sm mb-3">
          <div className="w-52 h-52 rounded-full overflow-hidden mb-5 border-4 border-gray-50 shadow-inner">
            <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl text-gray-900 font-normal mb-1">{contact.name}</h1>
          <p className="text-gray-500 text-sm">
            {isBlocked ? 'Blocked' : (contact.online ? 'Online' : 'Last seen recently')}
          </p>
        </div>

        <div className="bg-white px-8 py-5 shadow-sm mb-3">
          <h3 className="text-sm text-gray-500 mb-3">About</h3>
          <p className="text-[#111b21] text-[15px]">Always here for a good chat! ✨</p>
        </div>

        <div className="bg-white px-8 py-5 shadow-sm mb-3 cursor-pointer hover:bg-gray-50 transition-colors">
          <div className="flex justify-between items-center mb-4">
             <h3 className="text-sm text-gray-500">Media, links and docs</h3>
             <span className="text-sm text-gray-500">0 ></span>
          </div>
          <div className="h-20 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-lg text-gray-300 italic text-sm">No media shared yet</div>
        </div>

        <div className="bg-white px-8 py-5 shadow-sm mb-3">
          <h3 className="text-sm text-gray-500 mb-3">Groups in common</h3>
          <div className="flex items-center gap-4 py-2 opacity-50">
            <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-400">
              <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>
            </div>
            <p className="text-gray-500 text-sm">No groups in common</p>
          </div>
        </div>

        <div className="bg-white px-8 py-5 shadow-sm mb-8">
           <div 
             onClick={onBlock}
             className={`flex items-center gap-6 py-4 cursor-pointer -mx-8 px-8 transition-colors ${isBlocked ? 'text-[#00a884] hover:bg-green-50' : 'text-[#ea0038] hover:bg-red-50'}`}
           >
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
               <path d={isBlocked ? "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm4.59-12.42L10 14.17l-2.59-2.58L6 13l4 4 8-8z" : "M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"}></path>
             </svg>
             <span className="font-medium">{isBlocked ? `Unblock ${contact.name}` : `Block ${contact.name}`}</span>
           </div>
           <div 
             onClick={onReport}
             className={`flex items-center gap-6 py-4 cursor-pointer -mx-8 px-8 transition-colors ${isReported ? 'text-[#00a884] hover:bg-green-50' : 'text-[#ea0038] hover:bg-red-50'}`}
           >
             <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
               <path d={isReported ? "M9 16.2L4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2z" : "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"}></path>
             </svg>
             <span className="font-medium">{isReported ? `Cancel Report for ${contact.name}` : `Report ${contact.name}`}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default ContactProfileView;
