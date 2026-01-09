
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Contact, CallType, CallStatus } from '../types';
import { Icons } from '../constants';

interface CallOverlayProps {
  contact: Contact;
  type: CallType;
  onEndCall: () => void;
  availableContacts: Contact[];
}

const CallOverlay: React.FC<CallOverlayProps> = ({ contact, type, onEndCall, availableContacts }) => {
  const [status, setStatus] = useState<CallStatus>('calling');
  const [timer, setTimer] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(type === 'audio');
  const [participants, setParticipants] = useState<Contact[]>([contact]);
  const [showInviteList, setShowInviteList] = useState(false);
  const [invitingContacts, setInvitingContacts] = useState<Set<string>>(new Set());
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const streamRef = useRef<MediaStream | null>(null);
  const isActiveRef = useRef(true);

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  };

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);
    return bytes;
  };

  const decodeAudioData = async (data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number) => {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);
    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  };

  const cleanup = useCallback(() => {
    isActiveRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    sourcesRef.current.forEach(s => { try { s.stop(); } catch(e) {} });
    sourcesRef.current.clear();
    if (audioContextRef.current) audioContextRef.current.close();
    if (outputAudioContextRef.current) outputAudioContextRef.current.close();
  }, []);

  useEffect(() => {
    const initCall = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: type === 'video' });
        if (!isActiveRef.current) { stream.getTracks().forEach(t => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current && type === 'video') videoRef.current.srcObject = stream;

        setStatus('connected');
        const interval = setInterval(() => setTimer(prev => prev + 1), 1000);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
        outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });

        const sessionPromise = ai.live.connect({
          model: 'gemini-2.5-flash-native-audio-preview-12-2025',
          callbacks: {
            onopen: () => {
              if (!audioContextRef.current) return;
              const source = audioContextRef.current.createMediaStreamSource(stream);
              const scriptProcessor = audioContextRef.current.createScriptProcessor(4096, 1, 1);
              scriptProcessor.onaudioprocess = (e) => {
                if (isMuted || !isActiveRef.current) return;
                const inputData = e.inputBuffer.getChannelData(0);
                const int16 = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) int16[i] = inputData[i] * 32768;
                const pcmBlob = { data: encode(new Uint8Array(int16.buffer)), mimeType: 'audio/pcm;rate=16000' };
                sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
              };
              source.connect(scriptProcessor);
              scriptProcessor.connect(audioContextRef.current.destination);

              if (type === 'video') {
                const videoInt = setInterval(() => {
                  if (videoRef.current && canvasRef.current && !isVideoOff && isActiveRef.current) {
                    const ctx = canvasRef.current.getContext('2d');
                    canvasRef.current.width = 320; canvasRef.current.height = 240;
                    ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                    const base64 = canvasRef.current.toDataURL('image/jpeg', 0.4).split(',')[1];
                    sessionPromise.then(s => s.sendRealtimeInput({ media: { data: base64, mimeType: 'image/jpeg' } }));
                  }
                }, 1000);
                return () => clearInterval(videoInt);
              }
            },
            onmessage: async (msg: LiveServerMessage) => {
              const audio = msg.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
              if (audio && outputAudioContextRef.current && isActiveRef.current) {
                const buffer = await decodeAudioData(decode(audio), outputAudioContextRef.current, 24000, 1);
                const source = outputAudioContextRef.current.createBufferSource();
                source.buffer = buffer;
                source.connect(outputAudioContextRef.current.destination);
                nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
                source.start(nextStartTimeRef.current);
                nextStartTimeRef.current += buffer.duration;
                sourcesRef.current.add(source);
                source.onended = () => sourcesRef.current.delete(source);
              }
            },
            onclose: () => { if (isActiveRef.current) handleEndCall(); }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            systemInstruction: `Group call with ${participants.length + 1} people. Speak concisely.`
          }
        });
        sessionRef.current = await sessionPromise;
        return () => clearInterval(interval);
      } catch (err) { handleEndCall(); }
    };
    initCall();
    return cleanup;
  }, []);

  const handleEndCall = () => { cleanup(); onEndCall(); };

  const inviteContact = (c: Contact) => {
    setInvitingContacts(prev => new Set(prev).add(c.id));
    setTimeout(() => {
      if (isActiveRef.current) {
        setParticipants(prev => [...prev, c]);
        setInvitingContacts(prev => { const n = new Set(prev); n.delete(c.id); return n; });
      }
    }, 4000);
  };

  const getGridLayout = () => {
    const total = participants.length + 1; // +1 for self
    if (total === 1) return 'grid-cols-1';
    if (total === 2) return 'grid-cols-1 md:grid-cols-2';
    if (total <= 4) return 'grid-cols-2';
    return 'grid-cols-2 md:grid-cols-3';
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[#111b21] flex flex-col items-center justify-between text-white animate-in fade-in duration-300">
      <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-20">
        <div className="flex flex-col">
          <h4 className="text-[#00a884] font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-[#00a884] rounded-full animate-pulse"></span>
            ENCRYPTED CALL
          </h4>
          <span className="text-white/60 text-xs font-medium mt-1">{status === 'connected' ? Math.floor(timer / 60) + ':' + (timer % 60).toString().padStart(2,'0') : 'Calling...'}</span>
        </div>
        <button onClick={() => setShowInviteList(true)} className="w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all active:scale-90 ring-1 ring-white/10 shadow-lg">
          <Icons.UserPlus />
        </button>
      </div>
      
      <div className={`grid ${getGridLayout()} w-full h-full p-6 md:p-12 gap-4 transition-all duration-500`}>
        {/* Self Video/Avatar */}
        <div className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border border-white/5 group">
          {type === 'video' && !isVideoOff ? (
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-[#2a3942]">
               <div className="w-24 h-24 rounded-full bg-[#00a884]/20 flex items-center justify-center border-2 border-[#00a884] shadow-2xl">
                 <span className="text-4xl">👤</span>
               </div>
            </div>
          )}
          <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10">You</div>
        </div>

        {/* Other Participants */}
        {participants.map(p => (
          <div key={p.id} className="relative rounded-3xl overflow-hidden bg-gray-900 shadow-2xl border border-white/5 animate-in zoom-in duration-500">
            <img src={p.avatar} className="w-full h-full object-cover opacity-60 grayscale-[0.3]" />
            <div className="absolute bottom-4 left-4 bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-bold border border-white/10">{p.name}</div>
            <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-20 h-20 rounded-full bg-[#00a884]/10 border-2 border-[#00a884]/40 flex items-center justify-center animate-pulse">
                  <div className="w-12 h-12 bg-[#00a884] rounded-full blur-xl opacity-20"></div>
               </div>
            </div>
          </div>
        ))}

        {/* Pending Invites */}
        {availableContacts.filter(c => invitingContacts.has(c.id)).map(c => (
          <div key={c.id} className="relative rounded-3xl overflow-hidden bg-black/40 border border-dashed border-white/20 animate-pulse">
            <img src={c.avatar} className="w-full h-full object-cover opacity-20 grayscale" />
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
               <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
               <span className="text-[10px] font-bold tracking-widest uppercase text-white/50">Request Sent...</span>
            </div>
          </div>
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center gap-8 w-full max-w-sm mb-12">
        <button onClick={() => setIsVideoOff(!isVideoOff)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${!isVideoOff && type === 'video' ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-white backdrop-blur-md border border-white/10'}`}>
          <Icons.VideoCall />
        </button>
        <button onClick={handleEndCall} className="w-18 h-18 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white shadow-[0_0_30px_rgba(239,68,68,0.4)] ring-4 ring-red-500/20 active:scale-90 transition-all">
          <svg viewBox="0 0 24 24" width="36" height="36" fill="currentColor" className="rotate-[135deg]"><path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.045 15.045 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.24-1.01c-.36-1.11-.56-2.3-.56-3.53 0-.54-.45-.99-.99-.99H4.19C3.65 3 3 3.24 3 3.99 3 13.28 10.72 21 20.01 21c.71 0 .99-.63.99-1.18v-3.45c0-.54-.45-.99-.99-.99z"></path></svg>
        </button>
        <button onClick={() => setIsMuted(!isMuted)} className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${isMuted ? 'bg-white text-gray-900 shadow-xl' : 'bg-white/10 text-white backdrop-blur-md border border-white/10'}`}>
          <Icons.Mic />
        </button>
      </div>

      {showInviteList && (
        <div className="absolute inset-0 z-[150] bg-black/70 backdrop-blur-md flex items-end animate-in fade-in duration-300">
          <div className="w-full bg-[#111b21] rounded-t-[40px] p-8 flex flex-col gap-6 animate-in slide-in-from-bottom duration-500 shadow-2xl border-t border-white/10 max-h-[75vh]">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xl font-bold tracking-tight">Add People</h3>
              <button onClick={() => setShowInviteList(false)} className="bg-white/5 p-2 rounded-full text-gray-400 hover:text-white"><svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"></path></svg></button>
            </div>
            <div className="overflow-y-auto flex flex-col gap-2 pb-10">
              {availableContacts.filter(c => !participants.some(p => p.id === c.id) && !invitingContacts.has(c.id)).map(c => (
                <div key={c.id} onClick={() => inviteContact(c)} className="flex items-center gap-4 p-4 hover:bg-white/5 rounded-2xl cursor-pointer transition-all active:scale-[0.98] border border-transparent hover:border-white/5">
                  <img src={c.avatar} className="w-14 h-14 rounded-full object-cover ring-2 ring-white/5" />
                  <div className="flex-1">
                    <h4 className="font-bold text-[15px]">{c.name}</h4>
                    <p className="text-xs text-white/40 font-medium">Click to invite</p>
                  </div>
                  <div className="text-[#00a884] bg-[#00a884]/10 p-3 rounded-full"><Icons.UserPlus /></div>
                </div>
              ))}
              {availableContacts.filter(c => !participants.some(p => p.id === c.id) && !invitingContacts.has(c.id)).length === 0 && (
                <div className="p-20 text-center text-white/20 font-bold uppercase tracking-widest">No contacts available</div>
              )}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

export default CallOverlay;
