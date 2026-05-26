import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import { translateText } from '../api/translationClient';
import { loginWithEmail, registerWithEmail, logout, getSession } from '../api/authClient';
import { createWorker } from 'tesseract.js';
import {
  SunOutlined, MoonOutlined,
  MenuOutlined, ThunderboltFilled, SettingOutlined, AppstoreOutlined,
  FileTextOutlined, PictureOutlined, FileOutlined, GlobalOutlined,
  SwapOutlined, AudioOutlined, FormOutlined, SoundOutlined,
  CopyOutlined, StarOutlined, LinkOutlined, HistoryOutlined,
  BookOutlined, DeleteOutlined, PlusOutlined,
  QuestionCircleOutlined, CompressOutlined
} from '@ant-design/icons';

export default function Dashboard() {
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [sourceLang, setSourceLang] = useState('Anh');
  const [targetLang, setTargetLang] = useState('Việt');
  const [currentMode, setCurrentMode] = useState('text'); // 'text' | 'image' | 'doc' | 'web' | 'explain' | 'summarize'
  const [webUrl, setWebUrl] = useState('');
  const [activeFooterTab, setActiveFooterTab] = useState(null); // null | 'history' | 'saved'
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);

  // Explain & Summarize States
  const [explainInput, setExplainInput] = useState('');
  const [explainOutput, setExplainOutput] = useState('');
  const [isExplaining, setIsExplaining] = useState(false);
  const [summarizeInput, setSummarizeInput] = useState('');
  const [summarizeOutput, setSummarizeOutput] = useState('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Auth States
  const [session, setSession] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState(false);

  // Settings States
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [glossaryEnabled, setGlossaryEnabled] = useState(true);
  const [glossaryMode, setGlossaryMode] = useState('both'); // 'both' | 'direct' | 'ai'
  const [inferenceMode, setInferenceMode] = useState('api'); // 'api' | 'local'

  // Add Term Modal States
  const [isAddTermOpen, setIsAddTermOpen] = useState(false);
  const [newTerm, setNewTerm] = useState('');
  const [newMeaning, setNewMeaning] = useState('');
  const [newContext, setNewContext] = useState('');

  const [theme, setTheme] = useState(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      return 'light';
    }
    return localStorage.getItem('theme') || 'light';
  });

  const [stats, setStats] = useState({
    wordsTranslated: 1250,
    savedTerms: 45,
    activeMode: 'API Mode',
    accuracy: '94%'
  });

  const [recentTranslations, setRecentTranslations] = useState([]);

  const [savedVocabulary, setSavedVocabulary] = useState([]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get(['theme'], (result) => {
        if (result.theme) {
          setTheme(result.theme);
        }
      });
    }
  }, []);

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ theme });
    } else {
      localStorage.setItem('theme', theme);
    }
  }, [theme]);

  // Sync session on mount
  useEffect(() => {
    getSession().then(s => {
      if (s) setSession(s);
    });
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      let s;
      if (isRegistering) {
        s = await registerWithEmail(authEmail, authPassword);
      } else {
        s = await loginWithEmail(authEmail, authPassword);
      }
      setSession(s);
      setIsAuthModalOpen(false);
      setAuthEmail('');
      setAuthPassword('');
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  const handleLogout = () => {
    if (window.confirm('Bạn muốn đăng xuất?')) {
      logout();
      setSession(null);
    }
  };

  // Sync settings states to storage when changed
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ glossaryEnabled });
    } else {
      localStorage.setItem('glossaryEnabled', glossaryEnabled);
    }
  }, [glossaryEnabled]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ glossaryMode });
    } else {
      localStorage.setItem('glossaryMode', glossaryMode);
    }
  }, [glossaryMode]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ inferenceMode });
    } else {
      localStorage.setItem('inferenceMode', inferenceMode);
    }
    setStats(prev => ({ ...prev, activeMode: inferenceMode === 'api' ? 'API Mode' : 'Local Mode' }));
  }, [inferenceMode]);

  // Fetch glossary and history when session changes
  useEffect(() => {
    if (session && session.uid) {
      console.log("[Glossary] Fetching from Firestore for user:", session.uid);
      fetch('http://127.0.0.1:5000/api/glossary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: session.uid })
      })
        .then(r => r.json())
        .then(data => {
          console.log("[Glossary] Fetched data:", data);
          if (data.glossary) {
            setSavedVocabulary(data.glossary);
            setStats(prev => ({ ...prev, savedTerms: data.glossary.length }));
          }
        })
        .catch(err => console.error("[Glossary] Fetch error:", err));

      console.log("[History] Fetching from Firestore for user:", session.uid);
      fetch('http://127.0.0.1:5000/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: session.uid })
      })
        .then(r => r.json())
        .then(data => {
          if (data.history) {
            setRecentTranslations(data.history);
          }
        })
        .catch(err => console.error("[History] Fetch error:", err));
    }
  }, [session]);

  // Listen for session and setting changes from Popup or other tabs
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
      const handleStorageChange = (changes, area) => {
        if (area === 'local') {
          if (changes.authSession) {
            setSession(changes.authSession.newValue || null);
          }
          if (changes.inferenceMode) {
            setInferenceMode(changes.inferenceMode.newValue);
          }
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  useEffect(() => {
    const defaults = [
      { id: 1, term: "Inference", meaning: "Suy luận", context: "Mặc định" },
      { id: 2, term: "Throughput", meaning: "Băng thông", context: "Mặc định" },
      { id: 3, term: "Latency", meaning: "Độ trễ", context: "Mặc định" }
    ];

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.get([
        'glossary',
        'translationHistory',
        'glossaryEnabled',
        'glossaryMode',
        'inferenceMode'
      ], (result) => {
        if (result.glossary) {
          setSavedVocabulary(result.glossary);
          setStats(prev => ({ ...prev, savedTerms: result.glossary.length }));
        } else {
          setSavedVocabulary(defaults);
          chrome.storage.local.set({ glossary: defaults });
          setStats(prev => ({ ...prev, savedTerms: defaults.length }));
        }

        if (result.translationHistory) {
          setRecentTranslations(result.translationHistory);
        }

        if (result.glossaryEnabled !== undefined) {
          setGlossaryEnabled(result.glossaryEnabled);
        }
        if (result.glossaryMode) {
          setGlossaryMode(result.glossaryMode);
        }
        if (result.inferenceMode) {
          setInferenceMode(result.inferenceMode);
          setStats(prev => ({ ...prev, activeMode: result.inferenceMode === 'api' ? 'API Mode' : 'Local Mode' }));
        }
      });
    } else {
      // Fallback for local development in browser tab
      const localGlossary = localStorage.getItem('glossary');
      const localHistory = localStorage.getItem('translationHistory');
      const localEnabled = localStorage.getItem('glossaryEnabled');
      const localMode = localStorage.getItem('glossaryMode');
      const localInf = localStorage.getItem('inferenceMode');

      if (localGlossary) {
        const parsed = JSON.parse(localGlossary);
        setSavedVocabulary(parsed);
        setStats(prev => ({ ...prev, savedTerms: parsed.length }));
      } else {
        setSavedVocabulary(defaults);
        localStorage.setItem('glossary', JSON.stringify(defaults));
        setStats(prev => ({ ...prev, savedTerms: defaults.length }));
      }

      if (localHistory) {
        setRecentTranslations(JSON.parse(localHistory));
      }

      if (localEnabled !== null) {
        setGlossaryEnabled(localEnabled === 'true');
      }
      if (localMode) {
        setGlossaryMode(localMode);
      }
      if (localInf) {
        setInferenceMode(localInf);
        setStats(prev => ({ ...prev, activeMode: localInf === 'api' ? 'API Mode' : 'Local Mode' }));
      }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputText && outputText && outputText !== 'Đang dịch...' && !outputText.startsWith('Lỗi khi dịch')) {
        let isUpdate = false;

        setRecentTranslations(prev => {
          const lastItem = prev[0];
          if (lastItem && (inputText.startsWith(lastItem.source) || lastItem.source.startsWith(inputText))) {
            const updated = [...prev];
            updated[0] = { ...lastItem, source: inputText, target: outputText, time: "Vừa xong" };
            isUpdate = true;
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
              chrome.storage.local.set({ translationHistory: updated });
            } else {
              localStorage.setItem('translationHistory', JSON.stringify(updated));
            }
            return updated;
          }

          const newItem = { id: Date.now(), source: inputText, target: outputText, time: "Vừa xong" };
          const updated = [newItem, ...prev].slice(0, 20);
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ translationHistory: updated });
          } else {
            localStorage.setItem('translationHistory', JSON.stringify(updated));
          }

          if (session && session.uid && !isUpdate) {
            console.log("[History] Saving new translation to Firestore for user:", session.uid);
            fetch('http://127.0.0.1:5000/api/history/add', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ uid: session.uid, source: inputText, target: outputText, time: "Vừa xong" })
            }).catch(console.error);
          }

          return updated;
        });
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [inputText, outputText, session]);

  // Auto-trigger explain when in explain mode and user stops typing (1.5s debounce)
  useEffect(() => {
    if (currentMode !== 'explain' || !explainInput.trim()) return;
    const timer = setTimeout(() => {
      handleExplain(explainInput);
    }, 1500);
    return () => clearTimeout(timer);
  }, [explainInput, currentMode]);

  // Auto-trigger summarize when in summarize mode and user stops typing (1.5s debounce)
  useEffect(() => {
    if (currentMode !== 'summarize' || !summarizeInput.trim()) return;
    const timer = setTimeout(() => {
      handleSummarize(summarizeInput);
    }, 1500);
    return () => clearTimeout(timer);
  }, [summarizeInput, currentMode]);



  const addTerm = () => {
    setNewTerm('');
    setNewMeaning('');
    setNewContext('Thêm thủ công');
    setIsAddTermOpen(true);
  };

  const handleSaveNewTerm = async () => {
    if (!newTerm.trim() || !newMeaning.trim()) {
      alert("Vui lòng nhập đầy đủ từ tiếng Anh và nghĩa tiếng Việt!");
      return;
    }

    // Check for duplicate
    const exists = savedVocabulary.some(item => item.term.toLowerCase() === newTerm.trim().toLowerCase());
    if (exists) {
      alert("Thuật ngữ này đã tồn tại trong sổ tay!");
      return;
    }

    if (session && session.uid) {
      console.log("[Glossary] Saving to Firestore for user:", session.uid, newTerm.trim());
      try {
        const res = await fetch('http://127.0.0.1:5000/api/glossary/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: session.uid, term: newTerm.trim(), meaning: newMeaning.trim(), context: newContext.trim() || "Thêm thủ công" })
        });
        const data = await res.json();
        console.log("[Glossary] Save response:", data);
        if (data.success) {
          const newVocab = [...savedVocabulary, data.entry];
          setSavedVocabulary(newVocab);
          setStats(prev => ({ ...prev, savedTerms: newVocab.length }));
        } else {
          alert("Lỗi khi lưu từ: " + data.error);
        }
      } catch (err) {
        console.error("Failed to save to Firestore", err);
      }
    } else {
      const newEntry = {
        id: Date.now(),
        term: newTerm.trim(),
        meaning: newMeaning.trim(),
        context: newContext.trim() || "Thêm thủ công"
      };

      const newVocab = [...savedVocabulary, newEntry];
      setSavedVocabulary(newVocab);
      setStats(prev => ({ ...prev, savedTerms: newVocab.length }));

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ glossary: newVocab });
      } else {
        localStorage.setItem('glossary', JSON.stringify(newVocab));
      }
    }

    setIsAddTermOpen(false);
  };

  const deleteTerm = async (id) => {
    if (session && session.uid) {
      console.log("[Glossary] Deleting from Firestore:", id);
      try {
        const res = await fetch('http://127.0.0.1:5000/api/glossary/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: session.uid, id })
        });
        const data = await res.json();
        console.log("[Glossary] Delete response:", data);
        if (data.success) {
          const newVocab = savedVocabulary.filter(item => item.id !== id);
          setSavedVocabulary(newVocab);
          setStats(prev => ({ ...prev, savedTerms: newVocab.length }));
        }
      } catch (err) {
        console.error("Failed to delete from Firestore", err);
      }
    } else {
      const newVocab = savedVocabulary.filter(item => item.id !== id);
      setSavedVocabulary(newVocab);
      setStats(prev => ({ ...prev, savedTerms: newVocab.length }));
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ glossary: newVocab });
      } else {
        localStorage.setItem('glossary', JSON.stringify(newVocab));
      }
    }
  };

  const clearHistory = async () => {
    if (session && session.uid) {
      try {
        console.log("[History] Clearing from Firestore for user:", session.uid);
        await fetch('http://127.0.0.1:5000/api/history/clear', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: session.uid })
        });
      } catch (err) {
        console.error("Failed to clear history on Firestore", err);
      }
    }

    setRecentTranslations([]);
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ translationHistory: [] });
    } else {
      localStorage.setItem('translationHistory', JSON.stringify([]));
    }
  };

  const exportGlossary = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedVocabulary, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "it_translator_glossary.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const importGlossary = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          const valid = imported.filter(item => item.term && item.meaning).map(item => ({
            id: item.id || Date.now() + Math.random(),
            term: item.term,
            meaning: item.meaning,
            context: item.context || "Nhập khẩu"
          }));

          if (valid.length === 0) {
            alert("Không tìm thấy dữ liệu hợp lệ trong file!");
            return;
          }

          const newVocab = [...savedVocabulary];
          valid.forEach(v => {
            if (!newVocab.some(existing => existing.term.toLowerCase() === v.term.toLowerCase())) {
              newVocab.push(v);
            }
          });

          setSavedVocabulary(newVocab);
          setStats(prev => ({ ...prev, savedTerms: newVocab.length }));
          if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
            chrome.storage.local.set({ glossary: newVocab });
          } else {
            localStorage.setItem('glossary', JSON.stringify(newVocab));
          }
          alert(`Đã nhập thành công ${valid.length} thuật ngữ!`);
        } else {
          alert("File JSON không hợp lệ (Phải là một mảng)!");
        }
      } catch (err) {
        alert("Lỗi khi đọc file JSON: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleTranslate = async (text) => {
    console.log('[Dashboard] handleTranslate called with:', text);
    setInputText(text);
    if (text.trim() === '') {
      setOutputText('');
      return;
    }

    try {
      setOutputText('Đang dịch...');

      // Convert savedVocabulary array of objects to key-value dict if enabled
      const glossaryDict = {};
      const matchedTerms = [];
      if (glossaryEnabled && Array.isArray(savedVocabulary)) {
        savedVocabulary.forEach(item => {
          if (item.term && item.meaning) {
            glossaryDict[item.term] = item.meaning;
            if (text.toLowerCase().includes(item.term.toLowerCase())) {
              matchedTerms.push(`${item.term} -> ${item.meaning}`);
            }
          }
        });
      }

      console.log(`[Dashboard] Translating text. Glossary: Enabled=${glossaryEnabled}, Mode=${glossaryMode}`);
      if (glossaryEnabled) {
        console.log(`[Dashboard] 📚 Từ điển hiện tại đang sử dụng:`, glossaryDict);
      }
      if (matchedTerms.length > 0) {
        console.log(`[Dashboard] 🎯 Khớp từ điển cá nhân cho:`, matchedTerms);
      } else if (glossaryEnabled) {
        console.log(`[Dashboard] ℹ️ Không khớp thuật ngữ nào trong từ điển hiện tại.`);
      }

      const result = await translateText(text, '', 'auto', glossaryDict, glossaryMode);
      console.log('[Dashboard] Translation result:', result);
      setOutputText(result.translation || 'Không nhận được bản dịch');
    } catch (error) {
      console.error('[Dashboard] Translation error:', error);
      setOutputText('Lỗi khi dịch: ' + error.message);
    }
  };

  const handleExplain = async (text) => {
    setExplainInput(text);
    if (!text.trim()) { setExplainOutput(''); return; }
    setIsExplaining(true);
    setExplainOutput('Đang giải thích...');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: '', target_lang: 'explain', glossary: {}, glossary_mode: 'both' })
      });
      if (res.ok) {
        const data = await res.json();
        setExplainOutput(data.translation || 'Không có kết quả.');
      } else {
        setExplainOutput('Lỗi từ máy chủ.');
      }
    } catch (err) {
      setExplainOutput('Không kết nối được máy chủ.');
    } finally {
      setIsExplaining(false);
    }
  };

  const handleSummarize = async (text) => {
    setSummarizeInput(text);
    if (!text.trim()) { setSummarizeOutput(''); return; }
    setIsSummarizing(true);
    setSummarizeOutput('Đang tóm tắt...');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: '', target_lang: 'summarize', glossary: {}, glossary_mode: 'both' })
      });
      if (res.ok) {
        const data = await res.json();
        setSummarizeOutput(data.translation || 'Không có kết quả.');
      } else {
        setSummarizeOutput('Lỗi từ máy chủ.');
      }
    } catch (err) {
      setSummarizeOutput('Không kết nối được máy chủ.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleSpeak = () => {
    if (!outputText) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(outputText);

    const voices = window.speechSynthesis.getVoices();
    const vnVoice = voices.find(voice => voice.name.includes('Google') && voice.lang === 'vi-VN')
      || voices.find(voice => voice.lang === 'vi-VN');

    if (vnVoice) {
      utterance.voice = vnVoice;
    } else {
      utterance.lang = 'vi-VN';
    }

    window.speechSynthesis.speak(utterance);
  };

  const handleSaveToGlossary = async () => {
    if (!inputText || !outputText) return;

    // Check if already exists
    const exists = savedVocabulary.some(item => item.term === inputText && item.meaning === outputText);
    if (exists) {
      alert("Mục này đã có trong sổ tay!");
      return;
    }

    if (session && session.uid) {
      console.log("[Glossary] Saving from translate to Firestore for user:", session.uid);
      try {
        const res = await fetch('http://127.0.0.1:5000/api/glossary/add', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: session.uid, term: inputText, meaning: outputText, context: "Từ bản dịch" })
        });
        const data = await res.json();
        console.log("[Glossary] Save response:", data);
        if (data.success) {
          const newVocab = [...savedVocabulary, data.entry];
          setSavedVocabulary(newVocab);
          setStats(prev => ({ ...prev, savedTerms: newVocab.length }));
          alert("Đã lưu vào sổ tay trên Firestore!");
        } else {
          alert("Lỗi khi lưu từ: " + data.error);
        }
      } catch (err) {
        console.error("Failed to save to Firestore", err);
        alert("Lỗi kết nối máy chủ");
      }
    } else {
      const newVocab = [...savedVocabulary, {
        id: Date.now(),
        term: inputText,
        meaning: outputText,
        context: "Từ bản dịch"
      }];

      setSavedVocabulary(newVocab);
      setStats(prev => ({ ...prev, savedTerms: newVocab.length }));

      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.set({ glossary: newVocab });
      } else {
        localStorage.setItem('glossary', JSON.stringify(newVocab));
      }
      alert("Đã lưu vào sổ tay (Offline)!");
    }
  };

  const handleSwapLanguages = () => {
    setSourceLang(prev => prev === 'Anh' ? 'Việt' : 'Anh');
    setTargetLang(prev => prev === 'Việt' ? 'Anh' : 'Việt');
    // Swap texts
    const tempText = inputText;
    setInputText(outputText);
    setOutputText(tempText);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleImageUpload = async (e) => {
    console.log('[OCR] Starting image upload...');
    const file = e.target.files[0];
    if (!file) {
      console.log('[OCR] No file selected.');
      return;
    }

    setIsProcessingOCR(true);
    setInputText('Đang trích xuất chữ từ ảnh...');

    try {
      console.log('[OCR] Creating worker with langs: [\'eng\', \'vie\']');
      const worker = await createWorker(['eng', 'vie'], 1, {
        workerPath: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
          ? chrome.runtime.getURL('worker.min.js')
          : '/worker.min.js',
        langPath: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
          ? chrome.runtime.getURL('lang-data/')
          : '/lang-data/',
        corePath: typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL
          ? chrome.runtime.getURL('tesseract-core.wasm.js')
          : '/tesseract-core.wasm.js',
        logger: m => console.log('[OCR Worker]', m)
      });

      console.log('[OCR] Worker created. Recognizing text...');
      const { data: { text } } = await worker.recognize(file);

      console.log('[OCR] Recognition complete. Terminating worker...');
      await worker.terminate();

      console.log('[OCR] Extracted Text:', text);
      setInputText(text);
      handleTranslate(text); // Trigger translation
    } catch (error) {
      console.error('[OCR] Error during process:', error);
      setInputText('Lỗi khi trích xuất chữ.');
    } finally {
      setIsProcessingOCR(false);
    }
  };

  const handleDocUpload = async (e) => {
    console.log('[Doc] Starting document upload...');
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      console.log('[Doc] Extracted Text:', text.slice(0, 100));
      setInputText(text);
      handleTranslate(text);
    };
    reader.readAsText(file);
  };

  const handleWebTranslate = () => {
    let targetUrl = webUrl.trim();
    if (!targetUrl) {
      alert("Vui lòng nhập địa chỉ website!");
      return;
    }

    // Add http/https if missing
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      new URL(targetUrl);
    } catch (e) {
      alert("Địa chỉ website không hợp lệ!");
      return;
    }

    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ autoTranslateUrl: targetUrl }, () => {
        chrome.tabs.create({ url: targetUrl, active: true });
      });
    } else {
      alert(`Đang mở để dịch: ${targetUrl} (Lưu ý: Tính năng này chỉ hoạt động đầy đủ khi cài đặt Extension trên Chrome)`);
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="gt-container">
      {/* Header */}
      <header className="gt-header">
        <div className="gt-header-left">
          <button className="gt-icon-btn menu-btn"><MenuOutlined /></button>
          <div className="gt-logo">
            <span className="gt-logo-icon"><ThunderboltFilled /></span>
            <span className="gt-logo-text">IT Translator</span>
          </div>
        </div>
        <div className="gt-header-right">
          <button
            onClick={() => setInferenceMode(inferenceMode === 'api' ? 'local' : 'api')}
            style={{
              background: inferenceMode === 'api' ? '#18181b' : '#3b82f6',
              color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '8px',
              fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginRight: '8px',
              transition: 'background 0.2s'
            }}
          >
            {inferenceMode === 'api' ? '☁️ API' : '💻 Local'}
          </button>
          <button className="gt-icon-btn" title="Chuyển chế độ tối/sáng" onClick={toggleTheme}>
            {theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
          </button>
          <button className="gt-icon-btn" title="Cài đặt" onClick={() => setIsSettingsOpen(true)}><SettingOutlined /></button>
          <button className="gt-icon-btn" title="Ứng dụng"><AppstoreOutlined /></button>

          {session?.role === 'admin' && (
            <button
              title="Trang quản trị"
              onClick={() => {
                const url = typeof chrome !== 'undefined' && chrome.runtime
                  ? chrome.runtime.getURL('src/admin/index.html')
                  : '/src/admin/index.html';
                window.open(url, '_blank');
              }}
              style={{
                background: '#18181b', color: '#fff', border: 'none',
                padding: '6px 12px', borderRadius: '8px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '5px'
              }}
            >
              ⚙ Admin
            </button>
          )}

          {session ? (
            <div className="gt-avatar" title={`Tài khoản: ${session.email}\nVai trò: ${session.role}`} onClick={handleLogout} style={{ cursor: 'pointer' }}>
              {session.email.substring(0, 2).toUpperCase()}
            </div>
          ) : (
            <button
              className="gt-icon-btn"
              style={{ width: 'auto', padding: '0 12px', fontSize: '13px', fontWeight: 600, background: '#18181b', color: '#fff' }}
              onClick={() => setIsAuthModalOpen(true)}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="gt-main">
        {/* Mode Selector */}
        <div className="gt-modes">
          <button
            className={`gt-mode-btn ${currentMode === 'text' ? 'active' : ''}`}
            onClick={() => setCurrentMode('text')}
          >
            <span className="icon"><FileTextOutlined /></span> Văn bản
          </button>
          <button
            className={`gt-mode-btn ${currentMode === 'image' ? 'active' : ''}`}
            onClick={() => setCurrentMode('image')}
          >
            <span className="icon"><PictureOutlined /></span> Hình ảnh
          </button>
          <button
            className={`gt-mode-btn ${currentMode === 'doc' ? 'active' : ''}`}
            onClick={() => setCurrentMode('doc')}
          >
            <span className="icon"><FileOutlined /></span> Tài liệu
          </button>
          <button
            className={`gt-mode-btn ${currentMode === 'web' ? 'active' : ''}`}
            onClick={() => setCurrentMode('web')}
          >
            <span className="icon"><GlobalOutlined /></span> Trang web
          </button>
          {/* <button 
            className={`gt-mode-btn ${currentMode === 'explain' ? 'active' : ''}`}
            onClick={() => setCurrentMode('explain')}
          >
            <span className="icon"><QuestionCircleOutlined /></span> Giải thích
          </button>
          <button 
            className={`gt-mode-btn ${currentMode === 'summarize' ? 'active' : ''}`}
            onClick={() => setCurrentMode('summarize')}
          >
            <span className="icon"><CompressOutlined /></span> Tóm tắt
          </button> */}
        </div>

        {/* Translator Box */}
        <div className="gt-translator-card glass">
          {/* Language Selector */}
          <div className="gt-lang-selector">
            <div className="gt-lang-group">
              <button className="gt-lang-btn active">{sourceLang}</button>
            </div>
            <button className="gt-swap-btn" title="Chuyển đổi ngôn ngữ" onClick={handleSwapLanguages}><SwapOutlined /></button>
            <div className="gt-lang-group" style={{ display: 'flex', alignItems: 'center', gap: '0' }}>
              <button
                className={`gt-lang-btn ${currentMode !== 'explain' && currentMode !== 'summarize' ? 'active' : ''}`}
                onClick={() => setCurrentMode('text')}
              >
                {targetLang}
              </button>
              {sourceLang === 'Anh' && (
                <>
                  <button
                    className={`gt-lang-btn ${currentMode === 'explain' ? 'active' : ''}`}
                    onClick={() => setCurrentMode('explain')}
                  >
                    Giải thích
                  </button>
                  <button
                    className={`gt-lang-btn ${currentMode === 'summarize' ? 'active' : ''}`}
                    onClick={() => setCurrentMode('summarize')}
                  >
                    Tóm tắt
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Conditional rendering for modes */}
          {currentMode === 'web' ? (
            <div className="gt-web-translator">
              <div className="gt-web-input-container">
                <div className="gt-web-input-wrapper">
                  <span className="gt-web-url-icon"><LinkOutlined /></span>
                  <input
                    type="text"
                    placeholder="Nhập địa chỉ website (Ví dụ: wikipedia.org, bbc.com...)"
                    value={webUrl}
                    onChange={(e) => setWebUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleWebTranslate(); }}
                  />
                  <button className="gt-web-translate-btn" onClick={handleWebTranslate}>
                    Dịch trang <SwapOutlined />
                  </button>
                </div>
              </div>
            </div>
          ) : currentMode === 'explain' ? (
            <div className="gt-text-container">
              <div className="gt-input-box">
                <textarea
                  placeholder="Nhập thuật ngữ hoặc đoạn văn bản IT cần giải thích..."
                  value={explainInput}
                  onChange={(e) => setExplainInput(e.target.value)}
                />
                <div className="gt-box-footer">
                  <div className="footer-left" />
                  <div className="footer-right">
                    <span className="gt-char-count">{explainInput.length} / 5000</span>
                    {isExplaining && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Đang giải thích...</span>}
                  </div>
                </div>
              </div>
              <div className="gt-output-box">
                <div className={`gt-output-text ${explainOutput ? 'has-content' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {explainOutput || 'Kết quả giải thích sẽ xuất hiện ở đây'}
                </div>
                <div className="gt-box-footer">
                  <div className="footer-left" />
                  <div className="footer-right">
                    <button
                      className="gt-icon-btn"
                      title="Sao chép"
                      onClick={() => explainOutput && navigator.clipboard.writeText(explainOutput)}
                    >
                      <CopyOutlined />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : currentMode === 'summarize' ? (
            <div className="gt-text-container">
              <div className="gt-input-box">
                <textarea
                  placeholder="Nhập nội dung cần tóm tắt (bài viết, đoạn văn, tài liệu...)..."
                  value={summarizeInput}
                  onChange={(e) => setSummarizeInput(e.target.value)}
                />
                <div className="gt-box-footer">
                  <div className="footer-left" />
                  <div className="footer-right">
                    <span className="gt-char-count">{summarizeInput.length} / 5000</span>
                    {isSummarizing && <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>Đang tóm tắt...</span>}
                  </div>
                </div>
              </div>
              <div className="gt-output-box">
                <div className={`gt-output-text ${summarizeOutput ? 'has-content' : ''}`} style={{ whiteSpace: 'pre-wrap' }}>
                  {summarizeOutput || 'Bản tóm tắt sẽ xuất hiện ở đây'}
                </div>
                <div className="gt-box-footer">
                  <div className="footer-left" />
                  <div className="footer-right">
                    <button
                      className="gt-icon-btn"
                      title="Sao chép"
                      onClick={() => summarizeOutput && navigator.clipboard.writeText(summarizeOutput)}
                    >
                      <CopyOutlined />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="gt-text-container">
              <div className="gt-input-box">
                {currentMode === 'image' && (
                  <div className="gt-image-upload">
                    <label className="gt-upload-label">
                      <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} />
                      <span className="upload-icon">📷</span> Chọn ảnh để quét chữ
                    </label>
                    {isProcessingOCR && <div className="ocr-loading">Đang xử lý ảnh...</div>}
                  </div>
                )}
                {currentMode === 'doc' && (
                  <div className="gt-image-upload">
                    <label className="gt-upload-label">
                      <input type="file" accept=".txt,.md" onChange={handleDocUpload} style={{ display: 'none' }} />
                      <span className="upload-icon"><FileOutlined /></span> Chọn tài liệu (.txt, .md)
                    </label>
                  </div>
                )}
                <textarea
                  placeholder={currentMode === 'image' ? "Chữ trích xuất từ ảnh sẽ hiện ở đây" : (currentMode === 'doc' ? "Nội dung tài liệu sẽ hiện ở đây" : "Nhập văn bản")}
                  value={inputText}
                  onChange={(e) => handleTranslate(e.target.value)}
                  disabled={isProcessingOCR}
                ></textarea>
                <div className="gt-box-footer">
                  <div className="footer-left">
                    <button className="gt-icon-btn" title="Dịch bằng giọng nói"><AudioOutlined /></button>
                    <button className="gt-icon-btn" title="Bàn phím ảo"><FormOutlined /></button>
                  </div>
                  <div className="footer-right">
                    <span className="gt-char-count">{inputText.length} / 5000</span>
                  </div>
                </div>
              </div>

              <div className="gt-output-box">
                <div className={`gt-output-text ${outputText ? 'has-content' : ''}`}>
                  {outputText || 'Bản dịch'}
                </div>
                <div className="gt-box-footer">
                  <div className="footer-left">
                    <button className="gt-icon-btn" title="Nghe bản dịch" onClick={handleSpeak}><SoundOutlined /></button>
                  </div>
                  <div className="footer-right">
                    <button className="gt-icon-btn" title="Sao chép"><CopyOutlined /></button>
                    <button className="gt-icon-btn" title="Lưu vào sổ tay" onClick={handleSaveToGlossary}><StarOutlined /></button>
                    <button className="gt-icon-btn" title="Chia sẻ"><LinkOutlined /></button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="gt-footer-actions">
          <button
            className={`gt-footer-btn ${activeFooterTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveFooterTab(activeFooterTab === 'history' ? null : 'history')}
          >
            <span className="icon"><HistoryOutlined /></span> Nhật ký
          </button>
          <button
            className={`gt-footer-btn ${activeFooterTab === 'saved' ? 'active' : ''}`}
            onClick={() => setActiveFooterTab(activeFooterTab === 'saved' ? null : 'saved')}
          >
            <span className="icon"><StarOutlined /></span> Đã lưu
          </button>
        </div>

        {/* Expandable Panels */}
        {activeFooterTab === 'history' && (
          <div className="gt-panel glass">
            <div className="panel-header">
              <h3>Lịch sử dịch gần đây</h3>
              <button className="gt-text-link" onClick={clearHistory}>Xóa tất cả</button>
            </div>
            <div className="translation-list">
              {recentTranslations.map(item => (
                <div key={item.id} className="translation-item">
                  <div className="text-pair">
                    <p className="source-text">{item.source}</p>
                    <p className="target-text">{item.target}</p>
                  </div>
                  <div className="item-meta">
                    <span className="time">{item.time}</span>
                    <button className="btn-icon"><BookOutlined /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeFooterTab === 'saved' && (
          <div className="gt-panel glass">
            <div className="panel-header">
              <h3>Sổ tay thuật ngữ</h3>
              <button className="gt-btn-primary" onClick={addTerm}><PlusOutlined /> Thêm từ</button>
            </div>
            <div className="vocab-list">
              {savedVocabulary.map(item => (
                <div key={item.id} className="vocab-item">
                  <div className="vocab-term-chip">
                    <span className="term">{item.term}</span>
                    <span className="arrow">→</span>
                    <span className="meaning">{item.meaning}</span>
                  </div>
                  <p className="vocab-context">"{item.context}"</p>
                  <button className="delete-btn" onClick={() => deleteTerm(item.id)}><DeleteOutlined /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="gt-modal-overlay" onClick={() => setIsSettingsOpen(false)}>
          <div className="gt-modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>⚙️ Cài đặt hệ thống</h2>
              <button className="gt-modal-close" onClick={() => setIsSettingsOpen(false)}>×</button>
            </div>

            <div className="gt-modal-body">
              {/* Glossary Settings Section */}
              <div className="settings-section">
                <h3>📖 Quản lý Từ điển & Thuật ngữ</h3>

                <div className="setting-row">
                  <div className="setting-info">
                    <h4>Sử dụng Sổ tay thuật ngữ</h4>
                    <p>Áp dụng các từ dịch tùy chỉnh của bạn khi dịch thuật.</p>
                  </div>
                  <label className="gt-switch">
                    <input
                      type="checkbox"
                      checked={glossaryEnabled}
                      onChange={(e) => setGlossaryEnabled(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

                <div className="setting-row" style={{ opacity: glossaryEnabled ? 1 : 0.5 }}>
                  <div className="setting-info">
                    <h4>Cơ chế khớp từ điển</h4>
                    <p>Chọn cách áp dụng từ điển của bạn khi dịch.</p>
                  </div>
                  <select
                    value={glossaryMode}
                    onChange={(e) => setGlossaryMode(e.target.value)}
                    disabled={!glossaryEnabled}
                    className="gt-select"
                  >
                    <option value="both">Khớp trực tiếp & Ngữ cảnh AI (Khuyên dùng)</option>
                    <option value="direct">Chỉ khớp trực tiếp khi chọn từ đơn</option>
                    <option value="ai">Chỉ sử dụng làm ngữ cảnh cho mô hình AI</option>
                  </select>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <h4>Nhập / Xuất dữ liệu từ điển</h4>
                    <p>Sao lưu hoặc đồng bộ từ điển thuật ngữ của bạn.</p>
                  </div>
                  <div className="settings-buttons">
                    <button className="gt-btn-outline" onClick={exportGlossary}>📤 Xuất JSON</button>
                    <label className="gt-btn-outline" style={{ cursor: 'pointer' }}>
                      📥 Nhập JSON
                      <input type="file" accept=".json" onChange={importGlossary} style={{ display: 'none' }} />
                    </label>
                  </div>
                </div>
              </div>

              {/* Inference Settings Section */}
              <div className="settings-section">
                <h3>⚡ Chế độ Dịch & Mô hình</h3>
                <div className="setting-row">
                  <div className="setting-info">
                    <h4>Phương thức suy luận (Inference Mode)</h4>
                    <p>Dịch qua Cloud API hoặc chạy mô hình Offline trên thiết bị của bạn.</p>
                  </div>
                  <select
                    value={inferenceMode}
                    onChange={(e) => setInferenceMode(e.target.value)}
                    className="gt-select"
                  >
                    <option value="api">API Mode (Dịch trực tuyến nhanh)</option>
                    <option value="local">Local Mode (Dịch offline bảo mật)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="gt-modal-footer">
              <button className="gt-btn-primary" onClick={() => setIsSettingsOpen(false)}>Hoàn tất</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Term Modal */}
      {isAddTermOpen && (
        <div className="gt-modal-overlay" onClick={() => setIsAddTermOpen(false)}>
          <div className="gt-modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>📖 Thêm thuật ngữ mới</h2>
              <button className="gt-modal-close" onClick={() => setIsAddTermOpen(false)}>×</button>
            </div>

            <div className="gt-modal-body">
              <div className="form-group">
                <label className="form-label">Từ tiếng Anh (English term)</label>
                <input
                  type="text"
                  className="gt-input"
                  placeholder="Ví dụ: Zero-shot learning"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nghĩa tiếng Việt (Vietnamese meaning)</label>
                <input
                  type="text"
                  className="gt-input"
                  placeholder="Ví dụ: Học không nhãn"
                  value={newMeaning}
                  onChange={(e) => setNewMeaning(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ngữ cảnh sử dụng (Tùy chọn)</label>
                <input
                  type="text"
                  className="gt-input"
                  placeholder="Ví dụ: Học máy, AI"
                  value={newContext}
                  onChange={(e) => setNewContext(e.target.value)}
                />
              </div>
            </div>

            <div className="gt-modal-footer">
              <button className="gt-btn-outline" style={{ marginRight: '10px' }} onClick={() => setIsAddTermOpen(false)}>Hủy</button>
              <button className="gt-btn-primary" onClick={handleSaveNewTerm}>Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Auth Modal */}
      {isAuthModalOpen && (
        <div className="gt-modal-overlay" onClick={() => setIsAuthModalOpen(false)}>
          <div className="gt-modal-content" style={{ maxWidth: '360px' }} onClick={e => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h3>{isRegistering ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h3>
              <button className="gt-modal-close" onClick={() => setIsAuthModalOpen(false)}>×</button>
            </div>
            <div className="gt-modal-body">
              <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input
                  type="email"
                  placeholder="Email"
                  value={authEmail}
                  onChange={e => setAuthEmail(e.target.value)}
                  required
                  style={{
                    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    fontSize: '14px', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)'
                  }}
                />
                <input
                  type="password"
                  placeholder="Mật khẩu"
                  value={authPassword}
                  onChange={e => setAuthPassword(e.target.value)}
                  required
                  style={{
                    padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)',
                    fontSize: '14px', outline: 'none', background: 'var(--bg-secondary)', color: 'var(--text-primary)'
                  }}
                />
                {authError && (
                  <div style={{ fontSize: '13px', color: '#dc2626' }}>{authError}</div>
                )}
                <button type="submit" disabled={isSubmittingAuth} style={{
                  background: '#18181b', color: '#fff', border: 'none', borderRadius: '8px',
                  padding: '12px', fontSize: '14px', fontWeight: 600, cursor: isSubmittingAuth ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingAuth ? 0.7 : 1, marginTop: '8px'
                }}>
                  {isSubmittingAuth ? 'Đang xử lý...' : (isRegistering ? 'Tạo tài khoản' : 'Đăng nhập')}
                </button>

                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {isRegistering ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}{' '}
                  <span
                    onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
                    style={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600 }}
                  >
                    {isRegistering ? 'Đăng nhập ngay' : 'Đăng ký'}
                  </span>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
