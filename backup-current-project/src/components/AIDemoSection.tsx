import React, { useState } from 'react';

const AIDemoSection: React.FC = () => {
  const [input, setInput] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setResponse('');
    try {
      const res = await fetch('/.netlify/functions/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task_type: 'chat',
          input_data: { messages: [
            { role: 'system', content: 'You are a helpful AI learning assistant for children.' },
            { role: 'user', content: input }
          ]}
        })
      });
      const data = await res.json();
      setResponse(
        data[0]?.generated_text ||
        data[0]?.summary_text ||
        data.generated_text ||
        data.summary_text ||
        'No response.'
      );
    } catch (e) {
      setResponse('Error. Please try again.');
    }
    setLoading(false);
  };

  return (
    <>
      <section className="py-8 px-4 bg-white/80 backdrop-blur rounded-2xl shadow-lg max-w-2xl mx-auto my-8">
        <h2 className="text-2xl font-bold mb-4 text-center">Try Our AI Assistant</h2>
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Ask me anything about learning..."
            className="flex-1 p-3 border border-slate-300 rounded-full focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
            disabled={loading}
          />
          <button
            onClick={handleAsk}
            disabled={!input.trim() || loading}
            className="bg-violet-600 text-white px-6 py-3 rounded-full hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {loading ? 'Thinking...' : 'Ask'}
          </button>
        </div>
        {response && (
          <div className="bg-slate-100 p-4 rounded-xl text-slate-800 shadow-inner">
            {response}
          </div>
        )}
      </section>
    </>
  );
};

export default AIDemoSection; 