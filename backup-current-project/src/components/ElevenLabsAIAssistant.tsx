import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bot, X, Send, Volume2, VolumeX, Mic, MicOff, Settings } from 'lucide-react';
import './AIAssistant.css';
import { getAgentId, getVoiceId, getApiKey } from '../config/elevenlabs';

interface Message {
    text: string;
    isUser: boolean;
    timestamp: Date;
    audio?: string;
}

const ElevenLabsAIAssistant: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'russian' | 'arabic'>('english');
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);

    // Initialize connection
    const initializeConnection = useCallback(async () => {
        const apiKey = getApiKey();
        if (!apiKey) {
            setError('ElevenLabs API key not configured');
            return;
        }

        try {
            setIsLoading(true);
            setError(null);

            // Send conversation initiation request
            const response = await fetch('/.netlify/functions/elevenlabs-websocket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentId: getAgentId(),
                    voiceId: getVoiceId(selectedLanguage),
                    messageType: 'conversation_initiation',
                    message: null
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('Connection initialized:', result);

            if (result.type === 'conversation_initiation_metadata') {
                setIsConnected(true);
                // Add welcome message
                setMessages([{
                    text: "🌟 Hi there, little explorer! I'm Synapse, your friendly AI teacher! 🚀 I can help you with your learning adventures, explain cool stuff about games, or even have voice conversations with you! Just talk to me or type your questions - I'm here to make learning super fun! 🎮✨",
                    isUser: false,
                    timestamp: new Date()
                }]);
            } else {
                throw new Error('Failed to initialize conversation');
            }
        } catch (error: any) {
            console.error('Connection error:', error);
            setError(`Connection failed: ${error.message}`);
            setIsConnected(false);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLanguage]);

    // Send message to ElevenLabs
    const sendMessageToElevenLabs = async (message: string, messageType: 'user_message' | 'user_audio_chunk' = 'user_message') => {
        if (!isConnected) return;

        try {
            setIsLoading(true);

            const response = await fetch('/.netlify/functions/elevenlabs-websocket', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    agentId: getAgentId(),
                    voiceId: getVoiceId(selectedLanguage),
                    messageType: messageType,
                    message: message
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            console.log('ElevenLabs response:', result);

            // Handle different response types
            switch (result.type) {
                case 'user_transcript':
                    if (result.data?.user_transcript) {
                        setMessages(prev => [...prev, {
                            text: result.data.user_transcript,
                            isUser: true,
                            timestamp: new Date()
                        }]);
                    }
                    break;

                case 'agent_response':
                    if (result.data?.agent_response) {
                        setMessages(prev => [...prev, {
                            text: result.data.agent_response,
                            isUser: false,
                            timestamp: new Date()
                        }]);
                    }
                    break;

                case 'audio':
                    if (result.data?.audio_base_64) {
                        // Play the audio response
                        const audioBlob = new Blob([Buffer.from(result.data.audio_base_64, 'base64')], { type: 'audio/wav' });
                        const audioUrl = URL.createObjectURL(audioBlob);
                        const audio = new Audio(audioUrl);
                        audio.play();
                    }
                    break;

                default:
                    console.log('Unhandled response type:', result.type);
            }
        } catch (error: any) {
            console.error('Error sending message:', error);
            setError(`Failed to send message: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Start recording audio
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType: 'audio/webm;codecs=opus'
            });

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                audioChunksRef.current = [];

                // Convert to base64 and send to ElevenLabs
                const reader = new FileReader();
                reader.onload = () => {
                    const base64Audio = (reader.result as string).split(',')[1];
                    sendMessageToElevenLabs(base64Audio, 'user_audio_chunk');
                };
                reader.readAsDataURL(audioBlob);
            };

            mediaRecorder.start(100); // Collect data every 100ms
            mediaRecorderRef.current = mediaRecorder;
            setIsRecording(true);
        } catch (error) {
            console.error('Error starting recording:', error);
            setError('Could not access microphone');
        }
    };

    // Stop recording audio
    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
            setIsRecording(false);
        }
    };

    // Send text message
    const sendTextMessage = () => {
        if (!inputMessage.trim() || !isConnected) return;

        const userMessage: Message = {
            text: inputMessage,
            isUser: true,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        
        // Send text message to ElevenLabs
        sendMessageToElevenLabs(inputMessage, 'user_message');

        setInputMessage('');
    };

    // Handle key press
    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendTextMessage();
        }
    };

    // Handle language change
    const handleLanguageChange = (language: 'english' | 'russian' | 'arabic') => {
        setSelectedLanguage(language);
        setIsConnected(false);
        setMessages([]);
        setError(null);
    };

    // Initialize connection when component mounts
    useEffect(() => {
        if (isOpen && !isConnected && !isLoading) {
            initializeConnection();
        }
    }, [isOpen, isConnected, isLoading, initializeConnection]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (mediaRecorderRef.current && isRecording) {
                stopRecording();
            }
        };
    }, []);

    // Handle outside clicks
    useEffect(() => {
        const handlePointerDown = (event: PointerEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('pointerdown', handlePointerDown);
        return () => document.removeEventListener('pointerdown', handlePointerDown);
    }, []);

    return (
        <>
            {/* Chat Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 bg-gradient-to-r from-violet-600 to-purple-600 text-white p-4 rounded-full shadow-2xl hover:from-violet-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-110 z-50"
                >
                    <Bot className="w-8 h-8" />
                </button>
            )}

            {/* Neon Glass Chat Interface */}
            <aside id="ai-teacher-menu" ref={menuRef} className={isOpen ? 'open' : ''}>
                <span className="shine shine-top"></span>
                <span className="shine shine-bottom"></span>
                <span className="glow glow-top"></span>
                <span className="glow glow-bottom"></span>

                <div className="inner">
                    <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                        <h3 className="font-bold text-white flex items-center gap-2">
                            <Bot size={20}/> 
                            ElevenLabs AI Teacher
                            {isConnected && (
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                            )}
                        </h3>
                        <div className="flex items-center gap-2">
                            <button onClick={() => setIsOpen(false)}><X size={20}/></button>
                        </div>
                    </div>

                    {/* Language Selection */}
                    <div className="p-3 border-b border-[var(--border-color)]">
                        <div className="flex items-center gap-2">
                            <span className="text-white text-sm">Language:</span>
                            <select
                                value={selectedLanguage}
                                onChange={(e) => handleLanguageChange(e.target.value as 'english' | 'russian' | 'arabic')}
                                className="bg-white/10 text-white border border-white/20 rounded px-2 py-1 text-sm"
                            >
                                <option value="english">English</option>
                                <option value="russian">Russian</option>
                                <option value="arabic">Arabic</option>
                            </select>
                        </div>
                    </div>

                    {/* Connection Status */}
                    {error && (
                        <div className="p-3 bg-red-500/20 border border-red-400/30 rounded-lg mx-4 mt-2">
                            <p className="text-red-300 text-sm">{error}</p>
                        </div>
                    )}

                    {/* Chat Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {messages.map((msg, index) => (
                            <div key={index} className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[80%] p-3 rounded-2xl text-sm ${msg.isUser ? 'bg-violet-500/50' : 'bg-white/10'}`}>
                                    <p className="text-sm leading-relaxed">{msg.text}</p>
                                    <p className={`text-xs mt-1 ${msg.isUser ? 'text-violet-200' : 'text-slate-400'}`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                        ))}
                        
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white/10 text-white p-3 rounded-2xl">
                                    <div className="flex items-center gap-2">
                                        <div className="flex gap-1">
                                            <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                        <span className="text-xs text-white/70">Thinking...</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Voice Recording Controls */}
                    <div className="p-4 border-t border-[var(--border-color)]">
                        <div className="flex items-center gap-2 mb-3">
                            <button
                                onClick={isRecording ? stopRecording : startRecording}
                                disabled={!isConnected}
                                className={`flex-1 p-3 rounded-full transition-all ${
                                    isRecording 
                                        ? 'bg-red-500 text-white' 
                                        : 'bg-green-500 text-white hover:bg-green-600'
                                } disabled:opacity-50`}
                            >
                                {isRecording ? <MicOff size={20} /> : <Mic size={20} />}
                                <span className="ml-2 font-semibold">
                                    {isRecording ? 'Stop Recording' : 'Start Voice Chat'}
                                </span>
                            </button>
                        </div>

                        {/* Text Input */}
                        <div className="flex items-center gap-2">
                            <input 
                                type="text"
                                placeholder={isConnected ? "Type your message here..." : "Connecting..."}
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                disabled={!isConnected || isLoading}
                                className="flex-1"
                            />
                            <button 
                                onClick={sendTextMessage}
                                disabled={!inputMessage.trim() || !isConnected || isLoading}
                                className="p-3 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 transition-all duration-300 disabled:opacity-50"
                            >
                                <Send size={18} className="text-white" />
                            </button>
                        </div>

                        {/* Connection Status */}
                        <div className="text-center text-xs mt-2">
                            {isConnected ? (
                                <span className="text-green-400">Connected to ElevenLabs</span>
                            ) : isLoading ? (
                                <span className="text-yellow-400">Connecting...</span>
                            ) : (
                                <span className="text-red-400">Disconnected</span>
                            )}
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default ElevenLabsAIAssistant; 