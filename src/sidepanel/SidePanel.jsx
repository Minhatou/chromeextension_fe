import React, { useState, useEffect, useRef } from 'react';
import { getModel, clearModel, storeModelFromFile } from '../lib/modelManager';

const SidePanel = () => {
  const [status, setStatus] = useState('Checking model...');
  const [progress, setProgress] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [sourceText, setSourceText] = useState('');
  const [translation, setTranslation] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  
  const sandboxRef = useRef(null);
  const [isSandboxReady, setIsSandboxReady] = useState(false);

  // Initialize model on load
  useEffect(() => {
    console.log('[SidePanel] Component mounted.');
    // Model loading will start once the sandbox is ready
  }, []);

  // Listen for messages from background/content scripts
  useEffect(() => {
    const messageListener = (message) => {
      if (message.type === 'TRANSLATE_TEXT') {
        handleTranslate(message.text, message.context);
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [isLoaded]);

  const currentTranslation = useRef('');

  // Listen for messages from Sandbox
  useEffect(() => {
    const handleSandboxMessage = (event) => {
      const { type, payload } = event.data;
      
      if (type === 'INIT_COMPLETE') {
        console.log('[SidePanel] Initialization confirmed.');
        setStatus('Ready');
        setIsLoaded(true);
      } else if (type === 'GENERATE_PROGRESS') {
        currentTranslation.current += payload.partialText;
        setTranslation(currentTranslation.current);
        
        // Broadcast to Content Script
        chrome.runtime.sendMessage({
          type: 'GENERATE_PROGRESS',
          payload: { 
            partialText: currentTranslation.current, 
            done: payload.done 
          }
        });

        if (payload.done) {
          console.log('[SidePanel] Finished.');
          console.log('[SidePanel] Final Translation:', currentTranslation.current);
          setIsTranslating(false);
        }
      } else if (type === 'ERROR') {
        console.error('[SidePanel] Sandbox reported error:', payload);
        setError(payload);
        setStatus('Error');
        setIsTranslating(false);
      }
    };

    window.addEventListener('message', handleSandboxMessage);
    return () => window.removeEventListener('message', handleSandboxMessage);
  }, []);

  const loadModel = async () => {
    try {
      setError(null);
      setStatus('Checking storage...');
      const blob = await getModel((p) => setProgress(p));
      
      setStatus('Initializing AI engine in sandbox...');
      sandboxRef.current.contentWindow.postMessage({
        type: 'INIT_MODEL',
        payload: { modelBlob: blob }
      }, '*');
      
    } catch (err) {
      console.error(err);
      setError(err.message);
      setStatus('Error');
    }
  };

  const handleSandboxLoad = () => {
    console.log('[SidePanel] Sandbox iframe loaded.');
    setIsSandboxReady(true);
    loadModel();
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setStatus('Importing file...');
      setError(null);
      setProgress(0);
      const blob = await storeModelFromFile(file, (p) => setProgress(p));
      
      setStatus('Initializing AI engine in sandbox...');
      sandboxRef.current.contentWindow.postMessage({
        type: 'INIT_MODEL',
        payload: { modelBlob: blob }
      }, '*');
      
    } catch (err) {
      console.error(err);
      setError(`Import failed: ${err.message}`);
      setStatus('Error');
    }
  };

  const handleTranslate = async (text, context = '') => {
    if (!isLoaded || !isSandboxReady) return;
    setSourceText(text);
    setTranslation('');
    currentTranslation.current = ''; // Reset accumulation
    setIsTranslating(true);

    sandboxRef.current.contentWindow.postMessage({
      type: 'GENERATE',
      payload: { text, context }
    }, '*');
  };

  const handleClear = async () => {
    if (confirm('Clear model from storage?')) {
      await clearModel();
      window.location.reload();
    }
  };

  return (
    <div className="side-panel-container">
      {/* Hidden Sandbox Iframe */}
      <iframe
        ref={sandboxRef}
        src="/src/sidepanel/sandbox.html"
        style={{ display: 'none' }}
        onLoad={handleSandboxLoad}
      />

      <header>
        <h1>IT Translator</h1>
        <div className={`status-badge ${isLoaded ? 'ready' : error ? 'error' : 'loading'}`}>
          {status} {!isLoaded && progress > 0 && progress < 100 && `${progress}%`}
        </div>
      </header>

      <main>
        {!isLoaded ? (
          <div className="setup-view">
            {error ? (
              <div className="error-view">
                <p className="error-text">Setup Failed</p>
                <p>{error}</p>
                <label className="primary-btn file-label">
                  Choose Model File (.bin)
                  <input type="file" accept=".bin,.task" onChange={handleFileSelect} hidden />
                </label>
                <button className="secondary-btn" onClick={loadModel} style={{ marginTop: '10px' }}>Try Again</button>
              </div>
            ) : (
              <>
                <p>Setting up your offline AI...</p>
                <div className="progress-bar-container">
                  <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="translate-view">
            <div className="card">
              <h3>Source</h3>
              <p className="text-display">{sourceText || 'Select text to translate.'}</p>
            </div>

            <div className="card result-card">
              <h3>Translation</h3>
              <div className="text-display result-text">
                {translation}
                {isTranslating && <span className="cursor-blink">|</span>}
              </div>
            </div>
          </div>
        )}
      </main>

      <footer>
        <button className="secondary-btn" onClick={handleClear}>Clear Cache</button>
      </footer>
    </div>
  );
};

export default SidePanel;
