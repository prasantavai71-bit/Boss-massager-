
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Icons, COLORS } from './constants';
import { Contact, Message } from './types';
import { geminiService } from './gemini';


interface ChatWindowProps {
  contact: Contact;
  messages: Message[];
  onSendMessage: (text: string, file?: Message['file']) => void;
  onBack: () => void;
  isTyping: boolean;
  onAvatarClick: () => void;
  isBlocked?: boolean;
  onUnblock?: () => void;
  onVideoCall?: () => void;
  onAudioCall?: () => void;
}

const INDIAN_LANGUAGES = [
  { name: 'Bengali', label: 'বাংলা' },
  { name: 'Hindi', label: 'हिन्दी' },
  { name: 'English', label: 'English' }
];

const StatusTicks = memo(({ status }: { status: Message['status'] }) => {
  if (status === 'sent') {
    return <span className="text-gray-400 text-[14px] leading-none ml-1 select-none">✓</span>;
  }
  if (status === 'delivered') {
    return <span className="text-gray-400 text-[14px] leading-none ml-1 select-none">✓✓</span>;
  }
  if (status === 'read') {
    return <span className="text-red-500 text-[14px] font-bold leading-none ml-1 select-none animate-in zoom-in duration-300">✓✓</span>;
  }
  return null;
});

const MessageItem = memo(({ msg, isFirstInGroup, onTranslate, targetLang }: { msg: Message, isFirstInGroup: boolean, onTranslate: any, targetLang: any }) => {
  const isUser = msg.sender === 'user';
  
  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} ${isFirstInGroup ? 'mt-3' : 'mt-0.5'} animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] md:max-w-[70%] px-3 py-1.5 rounded-xl shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] flex flex-col relative ${isUser ? 'bg-[#dcf8c6] rounded-tr-none' : 'bg-white rounded-tl-none'}`}>
        {/* Tail simulation */}
        {isFirstInGroup && (
          <div className={`absolute top-0 w-2 h-2 ${isUser ? '-right-1.5 bg-[#dcf8c6]' : '-left-1.5 bg-white'} hidden md:block`} style={{ clipPath: isUser ? 'polygon(0 0, 0 100%, 100% 0)' : 'polygon(100% 0, 100% 100%, 0 0)' }}></div>
        )}
        
        <div className="text-[14.5px] text-[#111b21] leading-[1.4] whitespace-pre-wrap break-words pr-2">
          {msg.text}
        </div>
        
        {msg.translatedText && (
          <div className="mt-1.5 pt-1.5 border-t border-black/5 text-[#006aff] font-medium text-[13px] italic">
            {msg.translatedText}
          </div>
        )}

        <div className="flex items-center justify-end gap-0.5 mt-0.5 self-end min-w-[65px]">
          <span className="text-[10px] text-gray-400 font-medium uppercase">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          {isUser && <StatusTicks status={msg.status} />}
        </div>
      </div>
    </div>
  );
});

const ChatWindow: React.FC<ChatWindowProps> = ({ contact, messages: initialMessages, onSendMessage, onBack, isTyping, onAvatarClick, isBlocked, onUnblock, onVideoCall, onAudioCall }) => {
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(initialMessages);
  }, [initialMessages]);

  const scrollToBottom = useCallback((instant = false) => {
    messagesEndRef.current?.scrollIntoView({ behavior: instant ? 'auto' : 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping, scrollToBottom]);

  const handleTranslate = async (messageId: string, text: string) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, isTranslating: true } : m));
    const translated = await geminiService.translateText(text, 'Bengali');
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, translatedText: translated, isTranslating: false } : m));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isBlocked) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full w-full chat-bg relative overflow-hidden">
      {/* Header */}
      <div className="bg-[#f0f2f5] px-4 py-2 flex items-center justify-between z-20 border-b border-gray-200 shadow-sm h-[60px] shrink-0">
        <div className="flex items-center flex-1 cursor-pointer" onClick={onAvatarClick}>
          <button onClick={(e) => { e.stopPropagation(); onBack(); }} className="mr-2 p-2 hover:bg-black/5 rounded-full transition-colors md:hidden"><Icons.Back /></button>
          <div className="relative">
            <img src={contact.avatar} className="w-10 h-10 rounded-full object-cover shadow-sm" loading="lazy" />
            {contact.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-white"></div>}
          </div>
          <div className="ml-3 overflow-hidden">
            <h3 className="font-semibold text-[#111b21] leading-tight text-[15px] truncate">{contact.name}</h3>
            <p className="text-[11px] text-[#00a884] font-medium animate-pulse">{isTyping ? 'typing...' : (contact.online ? 'online' : 'click for info')}</p>
          </div>
        </div>
        <div className="flex gap-2 items-center text-gray-500">
          <button onClick={onVideoCall} className="p-2.5 hover:bg-black/5 rounded-full transition-all active:scale-90"><Icons.VideoCall /></button>
          <button onClick={onAudioCall} className="p-2.5 hover:bg-black/5 rounded-full transition-all active:scale-90"><Icons.AudioCall /></button>
          <button className="p-2.5 hover:bg-black/5 rounded-full"><Icons.More /></button>
        </div>
      </div>

      {/* Message Area */}
      <div className="flex-1 overflow-y-auto px-4 py-2 z-10 flex flex-col scroll-smooth">
        {messages.map((msg, index) => (
          <MessageItem 
            key={msg.id} 
            msg={msg} 
            isFirstInGroup={index === 0 || messages[index-1].sender !== msg.sender}
            onTranslate={handleTranslate}
            targetLang={{name: 'Bengali'}}
          />
        ))}
        {isTyping && (
          <div className="flex justify-start mt-2">
            <div className="bg-white px-4 py-1.5 rounded-xl shadow-sm text-gray-400 text-xs font-bold animate-pulse tracking-widest uppercase">Typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} className="h-4 shrink-0" />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-2 flex items-center gap-2 z-20 border-t border-gray-200 shrink-0">
        <button className="p-2.5 text-gray-500 hover:text-[#00a884] transition-colors"><Icons.Emoji /></button>
        <form onSubmit={handleSubmit} className="flex-1 relative">
          <input 
            type="text" 
            placeholder="Type a message"
            className="w-full bg-white rounded-xl px-4 py-2.5 outline-none text-[15px] shadow-sm border border-transparent focus:border-[#00a884]/20 transition-all"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
        </form>
        {inputText.trim() ? (
          <button onClick={handleSubmit} className="p-3 bg-[#00a884] text-white rounded-full shadow-lg transition-all active:scale-90 hover:bg-[#017561]"><Icons.Send /></button>
        ) : (
          <button className="p-3 bg-gray-400 text-white rounded-full shadow-sm cursor-not-allowed"><Icons.Mic /></button>
        )}
      </div>
    </div>
  );
};

export default ChatWindow;
