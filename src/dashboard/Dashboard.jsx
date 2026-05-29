import React, { useState, useEffect } from 'react';
import './Dashboard.css';
import {
  translateText,
  addSavedTranslation,
  getSavedTranslations,
  deleteSavedTranslation,
  updateSavedTranslationNote,
  rateTranslation,
  contributeTranslation,
  rechargeTokens
} from '../api/translationClient';
import { loginWithEmail, registerWithEmail, logout, getSession, loginWithGoogle } from '../api/authClient';
import { createWorker } from 'tesseract.js';
import {
  SunOutlined, MoonOutlined,
  MenuOutlined, ThunderboltFilled, SettingOutlined, AppstoreOutlined,
  FileTextOutlined, PictureOutlined, FileOutlined, GlobalOutlined,
  SwapOutlined, AudioOutlined, FormOutlined, SoundOutlined,
  CopyOutlined, StarOutlined, LinkOutlined, HistoryOutlined,
  BookOutlined, DeleteOutlined, PlusOutlined,
  QuestionCircleOutlined, CompressOutlined,
  LikeOutlined, LikeFilled, DislikeOutlined, DislikeFilled,
  BulbOutlined, EditOutlined, SaveOutlined
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
  const [savedTranslations, setSavedTranslations] = useState([]);
  const [isFromCache, setIsFromCache] = useState(false);
  const [currentRating, setCurrentRating] = useState(null);
  const [isSaveTransOpen, setIsSaveTransOpen] = useState(false);
  const [saveTransNote, setSaveTransNote] = useState('');
  const [isContributeOpen, setIsContributeOpen] = useState(false);
  const [suggestedTrans, setSuggestedTrans] = useState('');
  const [contribSuccessMsg, setContribSuccessMsg] = useState('');

  const [tokensBalance, setTokensBalance] = useState(1000000);
  const [freeCredit, setFreeCredit] = useState(100000.0);
  const [purchasedCredit, setPurchasedCredit] = useState(0.0);
  const [totalCredit, setTotalCredit] = useState(100000.0);
  const [modelId, setModelId] = useState(() => {
    try {
      return localStorage.getItem('modelId') || 'qwen2';
    } catch {
      return 'qwen2';
    }
  });
  const [shareTranslation, setShareTranslation] = useState(() => {
    try {
      return localStorage.getItem('shareTranslation') === 'true';
    } catch {
      return false;
    }
  });

  const [savedVocabulary, setSavedVocabulary] = useState([]);

  // Mock Payment States
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('qr');
  const [creditCardNum, setCreditCardNum] = useState('');
  const [creditCardExp, setCreditCardExp] = useState('');
  const [creditCardCvv, setCreditCardCvv] = useState('');
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

  // Sync modelId and shareTranslation changes
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ modelId });
    } else {
      localStorage.setItem('modelId', modelId);
    }
  }, [modelId]);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ shareTranslation });
    } else {
      localStorage.setItem('shareTranslation', shareTranslation);
    }
  }, [shareTranslation]);

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

    if (session && session.uid) {
      fetch('http://127.0.0.1:5000/api/user/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid: session.uid, theme: theme })
      }).catch(err => console.error("Error syncing theme to Firestore:", err));
    }
  }, [theme, session?.uid]);

  // Sync session on mount
  useEffect(() => {
    getSession().then(s => {
      if (s) {
        setSession(s);
        // Instantly verify with backend to fetch fresh, real-time credits & theme from Firestore
        if (s.idToken) {
          console.log("[Auth] Verifying token to fetch fresh credit balance...");
          fetch('http://127.0.0.1:5000/api/auth/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken: s.idToken })
          })
            .then(r => {
              if (r.ok) return r.json();
              throw new Error("Token verification failed");
            })
            .then(freshData => {
              console.log("[Auth] Fresh Firestore data received:", freshData);
              if (freshData.valid) {
                const updatedSession = { ...s, ...freshData };
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                  chrome.storage.local.set({ authSession: updatedSession });
                } else {
                  localStorage.setItem('authSession', JSON.stringify(updatedSession));
                }
                setSession(updatedSession);
              }
            })
            .catch(err => {
              console.error("[Auth] Failed to refresh credit balance:", err);
            });
        }
      } else {
        setIsAuthModalOpen(true);
      }
    });
  }, []);

  useEffect(() => {
    if (session) {
      if (session.free_credit !== undefined) setFreeCredit(session.free_credit);
      if (session.purchased_credit !== undefined) setPurchasedCredit(session.purchased_credit);
      if (session.total_credit !== undefined) {
        setTotalCredit(session.total_credit);
        setTokensBalance(session.total_credit);
      }
      if (session.theme) {
        setTheme(session.theme);
      }
    }
  }, [session]);

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

  const handleGoogleAuth = async () => {
    setAuthError('');
    setIsSubmittingAuth(true);
    try {
      const s = await loginWithGoogle();
      setSession(s);
      setIsAuthModalOpen(false);
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

  // Fetch glossary, history, and saved translations when session changes
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

      console.log("[Saved Translations] Fetching for user:", session.uid);
      getSavedTranslations(session.uid)
        .then(data => {
          if (data.saved_translations) {
            setSavedTranslations(data.saved_translations);
          }
        })
        .catch(err => console.error("[Saved Translations] Fetch error:", err));
    }
  }, [session]);

  // Listen for right-click Image Translation triggered from background context menu
  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      const checkPendingImage = () => {
        chrome.storage.local.get(['pendingImageTranslation'], (result) => {
          if (result.pendingImageTranslation) {
            const { srcUrl, timestamp } = result.pendingImageTranslation;
            // Only process if it is fresh (within 10 seconds)
            if (Date.now() - timestamp < 10000) {
              console.log('[Dashboard] Found pending image translation:', srcUrl);
              chrome.storage.local.remove(['pendingImageTranslation']);
              setCurrentMode('image');
              performOCR(srcUrl);
            }
          }
        });
      };

      checkPendingImage();

      const handleStorageChange = (changes, area) => {
        if (area === 'local' && changes.pendingImageTranslation && changes.pendingImageTranslation.newValue) {
          const { srcUrl, timestamp } = changes.pendingImageTranslation.newValue;
          if (Date.now() - timestamp < 10000) {
            console.log('[Dashboard Listener] Found pending image translation:', srcUrl);
            chrome.storage.local.remove(['pendingImageTranslation']);
            setCurrentMode('image');
            performOCR(srcUrl);
          }
        }
      };
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
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
    setIsFromCache(false);
    setCurrentRating(null);
    if (text.trim() === '') {
      setOutputText('');
      return;
    }

    if (!session || !session.uid) {
      setIsAuthModalOpen(true);
      setOutputText('Vui lòng đăng nhập để sử dụng tính năng dịch thuật.');
      return;
    }

    try {
      setOutputText('Đang dịch...');

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
      }

      const result = await translateText(text, '', 'auto', glossaryDict, glossaryMode, session.uid, modelId, shareTranslation);
      console.log('[Dashboard] Translation result:', result);
      setOutputText(result.translation || 'Không nhận được bản dịch');
      if (result.from_cache) {
        setIsFromCache(true);
      }
      if (result.total_credit !== undefined) {
        setTotalCredit(result.total_credit);
        setFreeCredit(result.free_credit);
        setPurchasedCredit(result.purchased_credit);
        setTokensBalance(result.total_credit);
      }
    } catch (error) {
      console.error('[Dashboard] Translation error:', error);
      if (error.message && (error.message.includes('OUT_OF_TOKENS') || error.message.includes('hết token') || error.message.includes('hết credit'))) {
        setOutputText('Lỗi: Bạn đã hết credit dịch thuật. Vui lòng chọn tab "Nạp Credit" phía dưới để tiếp tục!');
      } else {
        setOutputText('Lỗi khi dịch: ' + error.message);
      }
    }
  };

  const handleExplain = async (text) => {
    setExplainInput(text);
    if (!text.trim()) { setExplainOutput(''); return; }

    if (!session || !session.uid) {
      setIsAuthModalOpen(true);
      setExplainOutput('Vui lòng đăng nhập để sử dụng tính năng giải thích.');
      return;
    }

    setIsExplaining(true);
    setExplainOutput('Đang giải thích...');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: '', target_lang: 'explain', glossary: {}, glossary_mode: 'both', user_id: session.uid, model_id: modelId, share_translation: shareTranslation })
      });
      if (res.status === 402) {
        setExplainOutput('Lỗi: Bạn đã hết credit dịch thuật. Vui lòng nạp thêm credit để tiếp tục!');
      } else if (res.ok) {
        const data = await res.json();
        setExplainOutput(data.translation || 'Không có kết quả.');
        if (data.total_credit !== undefined) {
          setTotalCredit(data.total_credit);
          setFreeCredit(data.free_credit);
          setPurchasedCredit(data.purchased_credit);
          setTokensBalance(data.total_credit);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setExplainOutput(data.error || 'Lỗi từ máy chủ.');
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

    if (!session || !session.uid) {
      setIsAuthModalOpen(true);
      setSummarizeOutput('Vui lòng đăng nhập để sử dụng tính năng tóm tắt.');
      return;
    }

    setIsSummarizing(true);
    setSummarizeOutput('Đang tóm tắt...');
    try {
      const res = await fetch('http://127.0.0.1:5000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, context: '', target_lang: 'summarize', glossary: {}, glossary_mode: 'both', user_id: session.uid, model_id: modelId, share_translation: shareTranslation })
      });
      if (res.status === 402) {
        setSummarizeOutput('Lỗi: Bạn đã hết credit dịch thuật. Vui lòng nạp thêm credit để tiếp tục!');
      } else if (res.ok) {
        const data = await res.json();
        setSummarizeOutput(data.translation || 'Không có kết quả.');
        if (data.total_credit !== undefined) {
          setTotalCredit(data.total_credit);
          setFreeCredit(data.free_credit);
          setPurchasedCredit(data.purchased_credit);
          setTokensBalance(data.total_credit);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        setSummarizeOutput(data.error || 'Lỗi từ máy chủ.');
      }
    } catch (err) {
      setSummarizeOutput('Không kết nối được máy chủ.');
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleOpenRechargeModal = (packageId) => {
    setSelectedPackage(packageId);
    setPaymentMethod('qr');
    setCreditCardNum('');
    setCreditCardExp('');
    setCreditCardCvv('');
    setRechargeSuccess(false);
    setIsRechargeOpen(true);
  };

  const handleConfirmRecharge = async () => {
    if (!session || !session.uid || !selectedPackage) return;
    
    if (paymentMethod === 'card' && (!creditCardNum || !creditCardExp || !creditCardCvv)) {
      alert("Vui lòng điền đầy đủ thông tin thẻ tín dụng!");
      return;
    }

    setIsProcessingPayment(true);
    
    // Simulate loading/processing payment for 1.8 seconds
    await new Promise(resolve => setTimeout(resolve, 1800));
    
    try {
      const res = await rechargeTokens(session.uid, selectedPackage, paymentMethod);
      if (res.success) {
        setFreeCredit(res.free_credit);
        setPurchasedCredit(res.purchased_credit);
        setTotalCredit(res.total_credit);
        setTokensBalance(res.total_credit);
        setRechargeSuccess(true);
        setIsProcessingPayment(false);
        // Sync with chrome local storage if extension context
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({ authSession: { ...session, free_credit: res.free_credit, purchased_credit: res.purchased_credit, total_credit: res.total_credit } });
        }
      } else {
        alert("Lỗi khi nạp: " + (res.error || "Không rõ nguyên nhân"));
        setIsProcessingPayment(false);
      }
    } catch (err) {
      alert("Lỗi khi kết nối đến máy chủ thanh toán: " + err.message);
      setIsProcessingPayment(false);
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

  const handleRate = async (rating) => {
    if (!inputText.trim() || !outputText.trim()) return;
    if (!session || !session.uid) {
      alert("Vui lòng đăng nhập để đánh giá bản dịch!");
      return;
    }
    try {
      setCurrentRating(rating);
      await rateTranslation(session.uid, inputText, rating);
      
      // Update local history rating as well so UI updates instantly
      setRecentTranslations(prev => 
        prev.map(item => 
          (item.source === inputText) ? { ...item, rating } : item
        )
      );
    } catch (err) {
      console.error("Failed to rate translation", err);
    }
  };

  const handleOpenSaveTrans = () => {
    if (!inputText.trim() || !outputText.trim() || outputText === 'Đang dịch...' || outputText.startsWith('Lỗi khi dịch')) {
      alert("Chưa có bản dịch hợp lệ để lưu!");
      return;
    }
    if (!session || !session.uid) {
      alert("Vui lòng đăng nhập để lưu bản dịch!");
      return;
    }
    setSaveTransNote('');
    setIsSaveTransOpen(true);
  };

  const handleSaveTranslationSubmit = async () => {
    if (!session || !session.uid) return;
    try {
      const res = await addSavedTranslation(session.uid, inputText, outputText, saveTransNote);
      if (res.success) {
        setSavedTranslations(prev => [res.entry, ...prev]);
        setIsSaveTransOpen(false);
        alert("Đã lưu bản dịch thành công!");
      }
    } catch (err) {
      console.error("Failed to save translation", err);
      alert("Không thể lưu bản dịch: " + err.message);
    }
  };

  const handleDeleteSavedTrans = async (id) => {
    if (!session || !session.uid) return;
    if (!window.confirm("Bạn muốn xóa bản dịch đã lưu này?")) return;
    try {
      const res = await deleteSavedTranslation(session.uid, id);
      if (res.success) {
        setSavedTranslations(prev => prev.filter(item => item.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete saved translation", err);
    }
  };

  const handleUpdateSavedTransNote = async (id, currentNote) => {
    const newNote = window.prompt("Cập nhật ghi chú cho bản dịch này:", currentNote);
    if (newNote === null) return; // Cancelled
    if (!session || !session.uid) return;
    try {
      const res = await updateSavedTranslationNote(session.uid, id, newNote);
      if (res.success) {
        setSavedTranslations(prev => prev.map(item => item.id === id ? { ...item, note: newNote } : item));
      }
    } catch (err) {
      console.error("Failed to update note", err);
    }
  };

  const handleOpenContribute = () => {
    if (!inputText.trim() || !outputText.trim() || outputText === 'Đang dịch...') {
      alert("Chưa có bản dịch hợp lệ để đóng góp!");
      return;
    }
    setSuggestedTrans(outputText);
    setContribSuccessMsg('');
    setIsContributeOpen(true);
  };

  const handleContributeSubmit = async () => {
    if (!suggestedTrans.trim()) {
      alert("Vui lòng nhập bản dịch đóng góp!");
      return;
    }
    try {
      const uid = session?.uid || 'anonymous';
      const email = session?.email || 'anonymous';
      const res = await contributeTranslation(uid, email, inputText, outputText, suggestedTrans);
      if (res.success) {
        setContribSuccessMsg("Cảm ơn bạn đã đóng góp! Bản dịch đã được gửi lên hệ thống để xem xét.");
        setTimeout(() => {
          setIsContributeOpen(false);
        }, 2000);
      }
    } catch (err) {
      console.error("Failed to contribute translation", err);
      alert("Không thể gửi đóng góp: " + err.message);
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

  const performOCR = async (fileOrUrl) => {
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
      const { data: { text } } = await worker.recognize(fileOrUrl);

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

  const handleImageUpload = async (e) => {
    console.log('[OCR] Starting image upload...');
    const file = e.target.files[0];
    if (!file) {
      console.log('[OCR] No file selected.');
      return;
    }
    await performOCR(file);
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
            <div style={{ position: 'relative' }}>
              <div 
                className="gt-avatar" 
                title={`Tài khoản: ${session.email}\nVai trò: ${session.role}`} 
                onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} 
                style={{ cursor: 'pointer', userSelect: 'none' }}
              >
                {session.email.substring(0, 2).toUpperCase()}
              </div>

              {isUserDropdownOpen && (
                <>
                  <div 
                    style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 998 }} 
                    onClick={() => setIsUserDropdownOpen(false)} 
                  />
                  <div style={{
                    position: 'absolute', top: '46px', right: '0', background: '#18181b',
                    border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '10px', padding: '16px',
                    width: '260px', zIndex: 999, boxShadow: '0 8px 30px rgba(0,0,0,0.5)',
                    display: 'flex', flexDirection: 'column', gap: '12px',
                    animation: 'it-fade-in 0.15s ease-out', fontFamily: "'Inter', sans-serif"
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                      <span style={{ fontSize: '11px', color: '#888', fontWeight: 500 }}>Tài khoản</span>
                      <strong style={{ fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                        {session.email}
                      </strong>
                    </div>

                    {/* Stark & premium VND credit details */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', fontWeight: 500 }}>
                        <span>Credit miễn phí (ngày)</span>
                        <strong style={{ color: '#fff' }}>
                          {totalCredit === -1 ? 'Vô hạn' : `${freeCredit.toLocaleString('vi-VN')}đ / 100k`}
                        </strong>
                      </div>
                      {totalCredit !== -1 && (
                        <div style={{
                          width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px',
                          overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                          <div style={{
                            width: `${Math.min(100, (freeCredit / 100000.0) * 100)}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #10b981, #34d399)',
                            transition: 'width 0.3s ease'
                          }}></div>
                        </div>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#aaa', fontWeight: 500, marginTop: '4px' }}>
                        <span>Credit đã mua</span>
                        <strong style={{ color: '#60a5fa' }}>
                          {totalCredit === -1 ? 'Vô hạn' : `${purchasedCredit.toLocaleString('vi-VN')}đ`}
                        </strong>
                      </div>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#fff', fontWeight: 700, marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '6px' }}>
                        <span>Tổng số dư</span>
                        <span>
                          {totalCredit === -1 ? 'Vô hạn' : `${totalCredit.toLocaleString('vi-VN')}đ`}
                        </span>
                      </div>
                    </div>

                    {/* Moved Nạp Token button */}
                    {tokensBalance !== -1 && (
                      <button
                        onClick={() => {
                          setActiveFooterTab('recharge');
                          setIsUserDropdownOpen(false);
                          // Smooth scroll down to panel
                          setTimeout(() => {
                            const panelEl = document.querySelector('.gt-panel');
                            if (panelEl) panelEl.scrollIntoView({ behavior: 'smooth' });
                          }, 100);
                        }}
                        style={{
                          width: '100%', padding: '10px', background: '#ffffff', color: '#000000',
                          border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                          cursor: 'pointer', transition: 'all 0.2s ease', display: 'flex',
                          alignItems: 'center', justifyContent: 'center', gap: '6px'
                        }}
                        className="dropdown-recharge-btn"
                      >
                        💎 Nạp thêm Token
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setIsUserDropdownOpen(false);
                        handleLogout();
                      }}
                      style={{
                        width: '100%', padding: '8px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', fontSize: '12px',
                        fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease'
                      }}
                    >
                      🚪 Đăng xuất
                    </button>
                  </div>
                </>
              )}
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

              <div className="gt-output-box" style={{ position: 'relative' }}>
                {isFromCache && (
                  <span style={{
                    position: 'absolute', top: '8px', right: '12px',
                    fontSize: '11px', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)',
                    padding: '2px 8px', borderRadius: '12px', fontWeight: 600,
                    zIndex: 10
                  }}>
                    ⚡ Lấy từ lịch sử dịch
                  </span>
                )}
                <div className={`gt-output-text ${outputText ? 'has-content' : ''}`}>
                  {outputText || 'Bản dịch'}
                </div>
                <div className="gt-box-footer">
                  <div className="footer-left" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <button className="gt-icon-btn" title="Nghe bản dịch" onClick={handleSpeak}><SoundOutlined /></button>
                    {outputText && outputText !== 'Đang dịch...' && !outputText.startsWith('Lỗi khi dịch') && session && (
                      <>
                        <button
                          className="gt-icon-btn"
                          title="Hài lòng"
                          onClick={() => handleRate('like')}
                          style={{ color: currentRating === 'like' ? '#10b981' : 'inherit' }}
                        >
                          {currentRating === 'like' ? <LikeFilled /> : <LikeOutlined />}
                        </button>
                        <button
                          className="gt-icon-btn"
                          title="Không hài lòng (Lần sau dịch lại)"
                          onClick={() => handleRate('dislike')}
                          style={{ color: currentRating === 'dislike' ? '#ef4444' : 'inherit' }}
                        >
                          {currentRating === 'dislike' ? <DislikeFilled /> : <DislikeOutlined />}
                        </button>
                      </>
                    )}
                  </div>
                  <div className="footer-right" style={{ display: 'flex', gap: '4px' }}>
                    <button className="gt-icon-btn" title="Sao chép" onClick={() => outputText && navigator.clipboard.writeText(outputText)}><CopyOutlined /></button>
                    <button className="gt-icon-btn" title="Lưu sổ tay thuật ngữ" onClick={handleSaveToGlossary}><StarOutlined /></button>
                    {outputText && outputText !== 'Đang dịch...' && !outputText.startsWith('Lỗi khi dịch') && session && (
                      <>
                        <button className="gt-icon-btn" title="Lưu Sổ tay bản dịch/ghi chú" onClick={handleOpenSaveTrans}><SaveOutlined /></button>
                        <button className="gt-icon-btn" title="Đóng góp cải thiện bản dịch" onClick={handleOpenContribute}><BulbOutlined /></button>
                      </>
                    )}
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
            <span className="icon"><StarOutlined /></span> Sổ tay thuật ngữ
          </button>
          <button
            className={`gt-footer-btn ${activeFooterTab === 'saved_translations' ? 'active' : ''}`}
            onClick={() => setActiveFooterTab(activeFooterTab === 'saved_translations' ? null : 'saved_translations')}
          >
            <span className="icon"><SaveOutlined /></span> Bản dịch đã lưu
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

        {activeFooterTab === 'saved_translations' && (
          <div className="gt-panel glass">
            <div className="panel-header">
              <h3>Sổ tay bản dịch & Ghi chú</h3>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Tổng số: {savedTranslations.length}</span>
            </div>
            <div className="translation-list">
              {savedTranslations.length === 0 ? (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>Chưa có bản dịch nào được lưu.</div>
              ) : (
                savedTranslations.map(item => (
                  <div key={item.id} className="translation-item" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}>
                    <div className="text-pair">
                      <p className="source-text" style={{ fontWeight: 600 }}>{item.source_text}</p>
                      <p className="target-text" style={{ color: 'var(--accent-primary)', marginTop: '4px' }}>{item.translated_text}</p>
                    </div>
                    {item.note && (
                      <div className="vocab-context" style={{ margin: '4px 0', padding: '6px 10px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '12px', fontStyle: 'italic' }}>
                        <strong>Ghi chú:</strong> {item.note}
                      </div>
                    )}
                    <div className="item-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px' }}>
                      <span className="time" style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.timestamp ? new Date(item.timestamp).toLocaleString('vi-VN') : 'Vừa xong'}
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn-icon" title="Sửa ghi chú" onClick={() => handleUpdateSavedTransNote(item.id, item.note)}><EditOutlined /></button>
                        <button className="btn-icon" title="Xóa bản dịch" style={{ color: '#ef4444' }} onClick={() => handleDeleteSavedTrans(item.id)}><DeleteOutlined /></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeFooterTab === 'recharge' && (
          <div className="gt-panel glass">
            <div className="panel-header">
              <h3>💎 Nạp thêm Credit dịch thuật (VNĐ)</h3>
              <span style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>
                Số dư: {totalCredit === -1 ? 'Vô hạn' : `${totalCredit.toLocaleString('vi-VN')}đ`} (Miễn phí: {freeCredit.toLocaleString('vi-VN')}đ, Đã mua: {purchasedCredit.toLocaleString('vi-VN')}đ)
              </span>
            </div>
            
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '20px', padding: '10px 0 20px 0'
            }}>
              {/* Basic Package */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', transition: 'all 0.3s ease', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }} className="pricing-card" onClick={() => handleOpenRechargeModal('basic')}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#94a3b8' }}>Gói Cơ Bản</h4>
                  <div style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
                    +50.000 <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}>creditđ</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 16px 0', lineHeight: 1.4 }}>
                    Phù hợp cho lập trình viên dịch tài liệu nhỏ hoặc dùng thử model mới.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginBottom: '12px' }}>50.000 VNĐ</div>
                  <button style={{
                    width: '100%', padding: '10px', background: '#3b82f6', color: '#fff',
                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>Mua ngay</button>
                </div>
              </div>

              {/* Standard Package */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.9), rgba(59, 130, 246, 0.15))',
                border: '2px solid #3b82f6',
                borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', transition: 'all 0.3s ease', cursor: 'pointer',
                position: 'relative', boxShadow: '0 8px 25px rgba(59, 130, 246, 0.2)'
              }} className="pricing-card" onClick={() => handleOpenRechargeModal('standard')}>
                <span style={{
                  position: 'absolute', top: '-10px', right: '15px', background: '#3b82f6',
                  color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                  borderRadius: '10px', textTransform: 'uppercase'
                }}>Bán chạy nhất</span>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#38bdf8' }}>Gói Tiêu Chuẩn</h4>
                  <div style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
                    +200.000 <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}>creditđ</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '8px 0 16px 0', lineHeight: 1.4 }}>
                    Gói tối ưu nhất cho công việc dịch thuật hàng ngày, giải thích code và tài liệu IT lớn.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginBottom: '12px' }}>200.000 VNĐ</div>
                  <button style={{
                    width: '100%', padding: '10px', background: '#3b82f6', color: '#fff',
                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s ease', boxShadow: '0 4px 12px rgba(59,130,246,0.3)'
                  }}>Mua ngay</button>
                </div>
              </div>

              {/* Premium Package */}
              <div style={{
                background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px', padding: '20px', display: 'flex', flexDirection: 'column',
                justifyContent: 'space-between', transition: 'all 0.3s ease', cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(0,0,0,0.2)'
              }} className="pricing-card" onClick={() => handleOpenRechargeModal('premium')}>
                <div>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '16px', color: '#a78bfa' }}>Gói Cao Cấp</h4>
                  <div style={{ fontSize: '24px', fontWeight: 800, margin: '8px 0', color: '#fff' }}>
                    +500.000 <span style={{ fontSize: '14px', fontWeight: 400, color: '#94a3b8' }}>creditđ</span>
                  </div>
                  <p style={{ fontSize: '12px', color: '#94a3b8', margin: '8px 0 16px 0', lineHeight: 1.4 }}>
                    Dành cho doanh nghiệp hoặc lập trình viên chuyên nghiệp dịch khối lượng văn bản khổng lồ.
                  </p>
                </div>
                <div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#38bdf8', marginBottom: '12px' }}>500.000 VNĐ</div>
                  <button style={{
                    width: '100%', padding: '10px', background: '#a78bfa', color: '#1e1b4b',
                    border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>Mua ngay</button>
                </div>
              </div>
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
                    <h4>Mô hình AI dịch thuật</h4>
                    <p>Chọn giữa Qwen2 (5k/15k) hoặc Qwen3 (7k/21k).</p>
                  </div>
                  <select
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                    className="gt-select"
                  >
                    <option value="qwen2">Qwen2-1.5b (5đ/15đ trên 1k tokens)</option>
                    <option value="qwen3">Qwen3-1.7b (7đ/21đ trên 1k tokens)</option>
                  </select>
                </div>

                <div className="setting-row">
                  <div className="setting-info">
                    <h4>Đồng ý chia sẻ bản dịch</h4>
                    <p>Chia sẻ các bản dịch với Admin để cải tiến chất lượng hệ thống.</p>
                  </div>
                  <label className="gt-switch">
                    <input
                      type="checkbox"
                      checked={shareTranslation}
                      onChange={(e) => setShareTranslation(e.target.checked)}
                    />
                    <span className="slider round"></span>
                  </label>
                </div>

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

                <div style={{ display: 'flex', alignItems: 'center', margin: '8px 0', gap: '8px' }}>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                  <span style={{ fontSize: '10px', color: 'var(--text-secondary)', fontWeight: 600 }}>HOẶC</span>
                  <div style={{ flex: 1, height: '1px', background: 'var(--border-color)' }}></div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isSubmittingAuth}
                  style={{
                    background: 'var(--bg-secondary)', color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)', borderRadius: '8px',
                    padding: '10px', fontSize: '13px', fontWeight: 600,
                    cursor: isSubmittingAuth ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'opacity 0.2s'
                  }}
                >
                  <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'inline-block' }}>
                    <path fill="#EA4335" d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.355 0 3.36 2.655 1.345 6.527l3.921 3.238z"/>
                    <path fill="#4285F4" d="M23.455 12.273c0-.818-.073-1.609-.209-2.373H12v4.582h6.427a5.532 5.532 0 0 1-2.4 3.627l3.745 2.909c2.191-2.018 3.455-4.991 3.455-8.745z"/>
                    <path fill="#FBBC05" d="M5.266 14.235A7.077 7.077 0 0 1 4.909 12c0-.791.136-1.555.357-2.235L1.345 6.527A11.954 11.954 0 0 0 0 12c0 2.018.5 3.918 1.382 5.6l3.884-3.365z"/>
                    <path fill="#34A853" d="M12 24c3.245 0 5.973-1.073 7.964-2.91l-3.745-2.909c-1.036.691-2.364 1.109-3.964 1.109-3.055 0-5.645-2.064-6.564-4.836l-3.909 3.027C3.327 21.327 7.327 24 12 24z"/>
                  </svg>
                  Đăng nhập bằng Google
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

      {/* Save Translation Modal */}
      {isSaveTransOpen && (
        <div className="gt-modal-overlay" onClick={() => setIsSaveTransOpen(false)}>
          <div className="gt-modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>💾 Lưu bản dịch vào Sổ tay</h2>
              <button className="gt-modal-close" onClick={() => setIsSaveTransOpen(false)}>×</button>
            </div>

            <div className="gt-modal-body">
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Văn bản gốc</label>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inputText}</div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Bản dịch</label>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '13px', color: 'var(--accent-primary)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{outputText}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Ghi chú (Tùy chọn)</label>
                <textarea
                  className="gt-input"
                  style={{ width: '100%', minHeight: '80px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}
                  placeholder="Ví dụ: Cụm từ hay dùng khi viết email, thuật ngữ dự án..."
                  value={saveTransNote}
                  onChange={(e) => setSaveTransNote(e.target.value)}
                />
              </div>
            </div>

            <div className="gt-modal-footer">
              <button className="gt-btn-outline" style={{ marginRight: '10px' }} onClick={() => setIsSaveTransOpen(false)}>Hủy</button>
              <button className="gt-btn-primary" onClick={handleSaveTranslationSubmit}>Lưu lại</button>
            </div>
          </div>
        </div>
      )}

      {/* Contribute Translation Modal */}
      {isContributeOpen && (
        <div className="gt-modal-overlay" onClick={() => setIsContributeOpen(false)}>
          <div className="gt-modal-content glass animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header">
              <h2>💡 Đóng góp bản dịch tốt hơn</h2>
              <button className="gt-modal-close" onClick={() => setIsContributeOpen(false)}>×</button>
            </div>

            <div className="gt-modal-body">
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Văn bản gốc</label>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{inputText}</div>
              </div>
              <div className="form-group" style={{ marginBottom: '12px' }}>
                <label className="form-label">Bản dịch hiện tại của AI</label>
                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', fontSize: '13px', textDecoration: 'line-through', opacity: 0.6, overflow: 'hidden', textOverflow: 'ellipsis' }}>{outputText}</div>
              </div>
              <div className="form-group">
                <label className="form-label">Bản dịch đề xuất của bạn</label>
                <textarea
                  className="gt-input"
                  style={{ width: '100%', minHeight: '80px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '10px' }}
                  placeholder="Nhập bản dịch chuẩn xác hơn tại đây..."
                  value={suggestedTrans}
                  onChange={(e) => setSuggestedTrans(e.target.value)}
                />
              </div>
              {contribSuccessMsg && (
                <div style={{ marginTop: '12px', color: '#10b981', fontSize: '13px', fontWeight: 600 }}>{contribSuccessMsg}</div>
              )}
            </div>

            <div className="gt-modal-footer">
              <button className="gt-btn-outline" style={{ marginRight: '10px' }} onClick={() => setIsContributeOpen(false)}>Hủy</button>
              <button className="gt-btn-primary" onClick={handleContributeSubmit}>Gửi đóng góp</button>
            </div>
          </div>
        </div>
      )}

      {/* Mock Payment / Recharge Modal */}
      {isRechargeOpen && (
        <div className="gt-modal-overlay" onClick={() => !isProcessingPayment && setIsRechargeOpen(false)}>
          <div className="gt-modal-content glass animate-slide-up" style={{ maxWidth: '420px', background: 'rgba(15, 15, 15, 0.98)', border: '1px solid rgba(255, 255, 255, 0.25)', borderRadius: '12px' }} onClick={(e) => e.stopPropagation()}>
            <div className="gt-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <h2 style={{ color: '#fff', fontSize: '18px', fontWeight: 700 }}>💎 Thanh toán & Nạp Credit VNĐ</h2>
              <button className="gt-modal-close" disabled={isProcessingPayment} onClick={() => setIsRechargeOpen(false)} style={{ color: '#aaa' }}>×</button>
            </div>

            <div className="gt-modal-body" style={{ color: '#fff' }}>
              {rechargeSuccess ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: '64px', marginBottom: '16px' }}>🏴</div>
                  <h3 style={{ color: '#ffffff', fontSize: '20px', fontWeight: 700, margin: '0 0 12px 0' }}>Nạp Credit thành công!</h3>
                  <p style={{ fontSize: '13px', color: '#888888', lineHeight: 1.6, margin: '0 0 24px 0' }}>
                    Yêu cầu đã được xác thực thành công. Tài khoản của bạn được cộng thêm <strong>{selectedPackage === 'basic' ? '50.000đ' : selectedPackage === 'standard' ? '200.000đ' : '500.000đ'}</strong> credit mua.
                  </p>
                  <button className="gt-btn-primary" style={{ width: '100%', background: '#ffffff', color: '#000000', border: 'none', fontWeight: 700 }} onClick={() => setIsRechargeOpen(false)}>Quay lại dịch thuật</button>
                </div>
              ) : (
                <div>
                  <div style={{ background: '#111111', padding: '14px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
                    <div style={{ fontSize: '11px', color: '#666666', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Gói dịch vụ chọn mua:</div>
                    <div style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginTop: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>
                        {selectedPackage === 'basic' ? 'Gói Cơ bản (+50.000 VNĐ)' : selectedPackage === 'standard' ? 'Gói Tiêu chuẩn (+200.000 VNĐ)' : 'Gói Cao cấp (+500.000 VNĐ)'}
                      </span>
                      <strong style={{ color: '#ffffff', fontSize: '17px' }}>
                        {selectedPackage === 'basic' ? '50.000đ' : selectedPackage === 'standard' ? '200.000đ' : '500.000đ'}
                      </strong>
                    </div>
                  </div>

                  {/* Payment Method Tabs (B&W Minimalist) */}
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                    <button
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: paymentMethod === 'qr' ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                        background: paymentMethod === 'qr' ? '#ffffff' : 'transparent', color: paymentMethod === 'qr' ? '#000000' : '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onClick={() => setPaymentMethod('qr')}
                    >
                      📲 Quét mã QR
                    </button>
                    <button
                      style={{
                        flex: 1, padding: '10px', borderRadius: '8px', border: paymentMethod === 'card' ? '2px solid #ffffff' : '1px solid rgba(255,255,255,0.15)',
                        background: paymentMethod === 'card' ? '#ffffff' : 'transparent', color: paymentMethod === 'card' ? '#000000' : '#ffffff', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s'
                      }}
                      onClick={() => setPaymentMethod('card')}
                    >
                      💳 Thẻ tín dụng
                    </button>
                  </div>

                  {paymentMethod === 'qr' ? (
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <div style={{
                        background: '#ffffff', padding: '14px', borderRadius: '8px', display: 'inline-block',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.5)', marginBottom: '16px'
                      }}>
                        {/* Stark Black & White VietQR mockup */}
                        <div style={{
                          width: '180px', height: '180px', background: '#ffffff', borderRadius: '4px',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          border: '3px solid #000000', position: 'relative'
                        }}>
                          <div style={{ fontWeight: 900, color: '#000000', fontSize: '18px', marginBottom: '4px', letterSpacing: '1px' }}>VIETQR</div>
                          <div style={{
                            width: '110px', height: '110px', background: 'repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 50% / 10px 10px',
                            border: '2px solid #000000'
                          }}></div>
                          <div style={{ fontSize: '8px', fontWeight: 800, color: '#000000', marginTop: '8px', letterSpacing: '0.5px' }}>MINIMALIST PAYMENT</div>
                        </div>
                      </div>
                      <p style={{ fontSize: '12px', color: '#666666', lineHeight: 1.5, margin: '0 0 10px 0' }}>
                        Quét mã QR bằng ứng dụng ngân hàng của bạn để thanh toán ngay lập tức. Số dư token sẽ đồng bộ tự động.
                      </p>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Monochromatic Premium Credit Card */}
                      <div style={{
                        background: 'linear-gradient(135deg, #000000, #222222)', borderRadius: '8px',
                        padding: '18px', color: '#ffffff', minHeight: '130px', display: 'flex', flexDirection: 'column',
                        justifyContent: 'space-between', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.6)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: '14px', fontWeight: 900, letterSpacing: '1.5px' }}>VISA</span>
                          <span style={{ fontSize: '8px', opacity: 0.5, letterSpacing: '1px' }}>PREMIUM BLACK</span>
                        </div>
                        <div style={{ fontSize: '17px', letterSpacing: '2px', fontFamily: 'monospace', margin: '14px 0', color: '#fff' }}>
                          {creditCardNum || '•••• •••• •••• ••••'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
                          <div>
                            <span style={{ opacity: 0.4, display: 'block', fontSize: '7px', marginBottom: '2px' }}>CHỦ THẺ</span>
                            <strong style={{ letterSpacing: '0.5px' }}>MEMBER USER</strong>
                          </div>
                          <div>
                            <span style={{ opacity: 0.4, display: 'block', fontSize: '7px', marginBottom: '2px' }}>HẠN DÙNG</span>
                            <strong style={{ letterSpacing: '0.5px' }}>{creditCardExp || 'MM/YY'}</strong>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: '10px' }}>
                        <label style={{ fontSize: '11px', color: '#666666', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Số thẻ</label>
                        <input
                          type="text"
                          className="gt-input"
                          maxLength="19"
                          placeholder="4000 1234 5678 9010"
                          value={creditCardNum}
                          onChange={(e) => setCreditCardNum(e.target.value.replace(/[^\d\s]/g, ''))}
                          style={{ width: '100%', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#666666', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>Hạn dùng</label>
                          <input
                            type="text"
                            className="gt-input"
                            maxLength="5"
                            placeholder="MM/YY"
                            value={creditCardExp}
                            onChange={(e) => setCreditCardExp(e.target.value)}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                          />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontSize: '11px', color: '#666666', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 600 }}>CVV</label>
                          <input
                            type="password"
                            className="gt-input"
                            maxLength="3"
                            placeholder="***"
                            value={creditCardCvv}
                            onChange={(e) => setCreditCardCvv(e.target.value.replace(/\D/g, ''))}
                            style={{ width: '100%', background: 'rgba(255,255,255,0.03)', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px' }}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '28px', display: 'flex', gap: '10px' }}>
                    <button
                      className="gt-btn-outline"
                      style={{ flex: 1, border: '1px solid rgba(255,255,255,0.15)', background: 'transparent', color: '#888888', borderRadius: '6px', fontWeight: 600 }}
                      disabled={isProcessingPayment}
                      onClick={() => setIsRechargeOpen(false)}
                    >
                      Hủy bỏ
                    </button>
                    <button
                      className="gt-btn-primary"
                      style={{ flex: 2, background: '#ffffff', border: 'none', color: '#000000', borderRadius: '6px', fontWeight: 750 }}
                      disabled={isProcessingPayment}
                      onClick={handleConfirmRecharge}
                    >
                      {isProcessingPayment ? '⌛ Đang xác thực...' : '✓ Xác nhận Thanh toán'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
