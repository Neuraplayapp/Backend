export interface ElevenLabsConfig {
    agentId: string;
    voices: {
        english: string;
        russian: string;
        arabic: string;
    };
    apiKey: string;
}

export const elevenLabsConfig: ElevenLabsConfig = {
    agentId: 'agent_2201k13zjq5nf9faywz14701hyhb',
    voices: {
        english: '8LVfoRdkh4zgjr8v5ObE',
        russian: 'RUB3PhT3UqHowKru61Ns',
        arabic: 'mRdG9GYEjJmIzqbYTidv'
    },
    apiKey: process.env.REACT_APP_ELVEN_LABS_API_KEY || ''
};

export const getVoiceId = (language: 'english' | 'russian' | 'arabic' = 'english'): string => {
    return elevenLabsConfig.voices[language];
};

export const getAgentId = (): string => {
    return elevenLabsConfig.agentId;
};

export const getApiKey = (): string => {
    return elevenLabsConfig.apiKey;
}; 