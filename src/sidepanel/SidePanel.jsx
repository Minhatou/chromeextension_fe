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
  const [inferenceMode, setInferenceMode] = useState('local'); // 'local' or 'api'
  
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
        if (isLoaded) {
          handleTranslate(message.text, message.context);
        } else {
          // If not loaded, save as pending so it can be picked up once ready
          chrome.storage.local.set({ 
            pendingTranslation: { 
              text: message.text, 
              context: message.context, 
              timestamp: Date.now() 
            } 
          });
        }
      }
    };
    chrome.runtime.onMessage.addListener(messageListener);
    return () => chrome.runtime.onMessage.removeListener(messageListener);
  }, [isLoaded]);

  // Check for pending translation when model becomes ready
  useEffect(() => {
    if (isLoaded || inferenceMode === 'api') {
      chrome.storage.local.get(['pendingTranslation'], (data) => {
        if (data.pendingTranslation) {
          const { text, context, target_lang, timestamp } = data.pendingTranslation;
          // Only process if it's recent (less than 1 minute old)
          if (Date.now() - timestamp < 60000) {
            handleTranslate(text, context, target_lang || 'auto');
          }
          chrome.storage.local.remove('pendingTranslation');
        }
      });
    }
  }, [isLoaded, inferenceMode]);

  // Listen for new translations when side panel is already open
  useEffect(() => {
    const handleStorageChange = (changes, areaName) => {
      if (areaName === 'local' && changes.pendingTranslation && changes.pendingTranslation.newValue) {
        const { text, context, target_lang, timestamp } = changes.pendingTranslation.newValue;
        if ((isLoaded || inferenceMode === 'api') && Date.now() - timestamp < 60000) {
          handleTranslate(text, context, target_lang || 'auto');
          chrome.storage.local.remove('pendingTranslation');
        }
      }
    };
    chrome.storage.onChanged.addListener(handleStorageChange);
    return () => chrome.storage.onChanged.removeListener(handleStorageChange);
  }, [isLoaded, inferenceMode]);

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
        console.log('[SidePanel] Received GENERATE_PROGRESS:', payload.partialText, 'done:', payload.done);
        currentTranslation.current += payload.partialText;
        setTranslation(currentTranslation.current);
        
        // Broadcast to Content Script
        console.log('[SidePanel] Broadcasting to content script...');
        chrome.runtime.sendMessage({
          type: 'GENERATE_PROGRESS',
          payload: { 
            partialText: currentTranslation.current, 
            done: payload.done 
          }
        });

        if (payload.done) {
          console.log('[SidePanel] Finished. Final:', currentTranslation.current);
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
    
    chrome.storage.local.get(['inferenceMode'], (data) => {
      const mode = data.inferenceMode || 'local';
      setInferenceMode(mode);
      
      if (mode === 'local') {
        loadModel();
      } else {
        setStatus('API Mode Active');
        sandboxRef.current.contentWindow.postMessage({
          type: 'SET_MODE',
          payload: { mode: 'api' }
        }, '*');
      }
    });
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

  const handleTranslate = async (text, context = '', targetLang = 'auto') => {
    if ((inferenceMode === 'local' && !isLoaded) || !isSandboxReady) return;
    setSourceText(text);
    setTranslation('');
    currentTranslation.current = ''; // Reset accumulation
    setIsTranslating(true);

    sandboxRef.current.contentWindow.postMessage({
      type: 'GENERATE',
      payload: { text, context, target_lang: targetLang }
    }, '*');
  };

  const handleClear = async () => {
    if (confirm('Clear model from storage?')) {
      await clearModel();
      window.location.reload();
    }
  };

  const toggleMode = () => {
    const newMode = inferenceMode === 'local' ? 'api' : 'local';
    setInferenceMode(newMode);
    
    chrome.storage.local.set({ inferenceMode: newMode });
    
    sandboxRef.current.contentWindow.postMessage({
      type: 'SET_MODE',
      payload: { mode: newMode }
    }, '*');
    
    if (newMode === 'local' && !isLoaded) {
      loadModel();
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
        <div className="header-top">
          <h1>IT Translator</h1>
          <div className="mode-selector">
            <button 
              className={`mode-btn ${inferenceMode === 'local' ? 'active' : ''}`}
              onClick={() => inferenceMode !== 'local' && toggleMode()}
              title="Run offline in browser"
            >
              Offline
            </button>
            <button 
              className={`mode-btn ${inferenceMode === 'api' ? 'active' : ''}`}
              onClick={() => inferenceMode !== 'api' && toggleMode()}
              title="Use local LlamaFactory API"
            >
              API (Fine-tuned)
            </button>
          </div>
        </div>
        <div className={`status-badge ${isLoaded || inferenceMode === 'api' ? 'ready' : error ? 'error' : 'loading'}`}>
          {inferenceMode === 'api' ? 'API Mode Active' : status} 
          {inferenceMode === 'local' && !isLoaded && progress > 0 && progress < 100 && `${progress}%`}
        </div>
      </header>

      <main>
        {(!isLoaded && inferenceMode === 'local') ? (
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
