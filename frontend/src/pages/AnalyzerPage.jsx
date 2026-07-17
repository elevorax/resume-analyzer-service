import React, { useState, useEffect, useRef } from 'react';
import {
  IoCloudUploadOutline,
  IoDocumentTextOutline,
  IoTrashOutline,
  IoSparklesOutline,
  IoCheckmarkCircleOutline,
  IoAlertCircleOutline,
  IoBriefcaseOutline,
  IoThumbsUpOutline,
  IoThumbsDownOutline,
  IoColorWandOutline,
  IoSettingsOutline,
  IoSend,
  IoChatbubbleEllipsesOutline
} from 'react-icons/io5';
import { motion, AnimatePresence } from 'framer-motion';
import analyzerService from '../services/analyzerService';
import Button from '../components/common/Button';
import Spinner from '../components/common/Spinner';
import { formatFileSize } from '../utils/formatters';
import { ACCEPTED_FILE_TYPES, MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from '../utils/constants';
import { toast } from 'react-hot-toast';
import clsx from 'clsx';

// Predefined roles mapping
const PREDEFINED_ROLES = [
  'Software Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Full Stack Developer',
  'QA Engineer',
  'DevOps Engineer',
  'Data Analyst'
];

export const AnalyzerPage = () => {
  // File upload state
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  // Job selection state
  const [selectedRole, setSelectedRole] = useState('');
  const [customRole, setCustomRole] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);

  // Analysis status states
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [report, setReport] = useState(null);

  // Chat Q&A state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Toggle state for displaying detailed summary metrics
  const [showDetails, setShowDetails] = useState(false);

  // Refs for scrolling and focus
  const reportRef = useRef(null);
  const chatEndRef = useRef(null);

  // File drag & drop handlers
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile) => {
    const extension = `.${selectedFile.name.split('.').pop().toLowerCase()}`;
    if (!ACCEPTED_FILE_TYPES.includes(extension)) {
      toast.error('Only .pdf, .docx, and .txt files are supported.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      toast.error(`File size cannot exceed ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }
    setFile(selectedFile);
    // Reset report and chat if a new file is uploaded
    setReport(null);
    setChatMessages([]);
    toast.success(`Loaded "${selectedFile.name}"`);
  };

  const removeFile = (e) => {
    e.stopPropagation();
    setFile(null);
    setReport(null);
    setChatMessages([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Job role handlers
  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setIsCustomMode(false);
  };

  const handleCustomModeSelect = () => {
    setSelectedRole('');
    setIsCustomMode(true);
  };

  const getTargetRole = () => {
    return isCustomMode ? customRole : selectedRole;
  };

  // Simulated progressive load steps
  const analysisSteps = [
    'Parsing document content...',
    'Generating semantic embeddings...',
    'Indexing chunks in vector store...',
    'Comparing profile against target job role...',
    'Assembling matching scores and feedback...'
  ];

  useEffect(() => {
    let timer;
    if (analyzing) {
      setAnalysisStep(0);
      timer = setInterval(() => {
        setAnalysisStep((prev) => {
          if (prev < analysisSteps.length - 1) {
            return prev + 1;
          }
          clearInterval(timer);
          return prev;
        });
      }, 300);
    }
    return () => clearInterval(timer);
  }, [analyzing]);

  const handleStartAnalysis = async () => {
    const role = getTargetRole();
    if (!file) {
      toast.error('Please upload your resume file first.');
      return;
    }
    if (!role.trim()) {
      toast.error('Please select or specify a target job role.');
      return;
    }

    setAnalyzing(true);
    setReport(null);
    setChatMessages([]);
    setShowDetails(false);

    try {
      const data = await analyzerService.analyzeResume(file, role);
      setReport(data);
      toast.success('Resume analysis completed!');
      
      // Auto-populate AI chat with the initial analysis summary greeting
      const greetingMsg = {
        role: 'assistant',
        content: `### 🤖 AI Resume Analysis Feedback\n\nI have successfully evaluated your resume against the target role **${data.role}** and computed an overall match score of **${data.score}%**.\n\n**Initial Assessment Summary:**\n${data.roleFeedback}\n\nYou can ask me specific questions about your resume, missing skills, or formatting tips below, or select a suggested prompt.`
      };
      setChatMessages([greetingMsg]);

      // Smooth scroll to report
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Resume analysis failed. Check backend configuration.';
      toast.error(errorMsg);
    } finally {
      setAnalyzing(false);
    }
  };

  // Chat Q&A Submit handler
  const handleSendQuestion = async (queryText) => {
    const query = queryText || chatInput;
    if (!query.trim() || askingQuestion || !report?.documentId) return;

    const userMessage = { role: 'user', content: query.trim() };
    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput('');
    setAskingQuestion(true);

    try {
      const response = await analyzerService.askQuestion(query.trim(), report.documentId);
      const aiMessage = { role: 'assistant', content: response.answer };
      setChatMessages((prev) => [...prev, aiMessage]);
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to fetch answers. Check Gemini API.';
      toast.error(errorMsg);
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `**Error:** ${errorMsg}` }
      ]);
    } finally {
      setAskingQuestion(false);
      // Auto-scroll chat window to bottom
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 80);
    }
  };

  // Circular gauge calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const score = report?.score || 0;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const suggestedQuestions = [
    'What are my technical skills?',
    'Which projects are most relevant for this role?',
    'What should I improve?',
    'Which keywords am I missing?',
    'How can I increase my ATS score?'
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col justify-between py-12 px-4 sm:px-6 lg:px-8">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-12 right-1/4 w-[500px] h-[500px] bg-secondary/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Main core layout wrapper */}
      <div className="w-full max-w-5xl mx-auto space-y-10 z-10 flex-1">
        {/* Header Hero Title */}
        <div className="text-center space-y-3">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center text-white mx-auto shadow-lg shadow-primary/20"
          >
            <IoSparklesOutline className="w-7 h-7" />
          </motion.div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            AI Resume & Document Analyzer
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary max-w-2xl mx-auto leading-relaxed">
            Upload your resume, select your target job role, and receive customized feedback on skills gaps, ATS optimization, and structural improvements instantly.
          </p>
        </div>

        {/* Input Work Section */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left panel: File drop and selection */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6 lg:col-span-5 text-left">
            <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
              <IoDocumentTextOutline className="w-4 h-4 text-primary" />
              <span>1. Upload Resume</span>
            </h3>

            {/* Drag Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                'w-full min-h-[160px] border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-4 text-center cursor-pointer transition-all duration-200 bg-background/10',
                dragActive
                  ? 'border-primary bg-primary-light/10 scale-[0.99]'
                  : 'border-border hover:border-primary/50 hover:bg-background/40'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              {!file ? (
                <>
                  <div className="p-2.5 bg-primary-light/50 text-primary rounded-full mb-2">
                    <IoCloudUploadOutline className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-semibold text-text-primary">
                    Drag resume or <span className="text-primary hover:underline">browse</span>
                  </p>
                  <p className="text-[10px] text-text-muted mt-1 leading-snug">
                    PDF, DOCX, TXT (Max {MAX_FILE_SIZE_MB}MB)
                  </p>
                </>
              ) : (
                <div className="flex items-center space-x-3 w-full p-2 bg-surface border border-border rounded-lg justify-between">
                  <div className="flex items-center space-x-2 truncate">
                    <div className="p-1.5 bg-background border border-border rounded text-text-secondary shrink-0">
                      <IoDocumentTextOutline className="w-4 h-4" />
                    </div>
                    <div className="truncate text-left">
                      <p className="text-xs font-bold text-text-primary truncate" title={file.name}>
                        {file.name}
                      </p>
                      <span className="text-[9px] text-text-muted">
                        {formatFileSize(file.size / 1024)}
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={removeFile}
                    className="text-text-muted hover:text-error p-1 outline-none rounded hover:bg-background"
                    title="Remove file"
                  >
                    <IoTrashOutline className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Right panel: Job Roles Grid Selector */}
          <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-6 lg:col-span-7 text-left">
            <h3 className="text-sm font-bold text-text-primary flex items-center space-x-2">
              <IoBriefcaseOutline className="w-4 h-4 text-primary" />
              <span>2. Select Target Job Role</span>
            </h3>

            {/* Pills grid */}
            <div className="flex flex-wrap gap-2.5">
              {PREDEFINED_ROLES.map((role) => {
                const isSelected = selectedRole === role && !isCustomMode;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleSelect(role)}
                    className={clsx(
                      'px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors outline-none',
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                        : 'border-border text-text-secondary bg-background/10 hover:bg-background hover:text-text-primary'
                    )}
                  >
                    {role}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={handleCustomModeSelect}
                className={clsx(
                  'px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors outline-none',
                  isCustomMode
                    ? 'bg-primary text-white border-primary shadow-sm shadow-primary/10'
                    : 'border-border text-text-secondary bg-background/10 hover:bg-background hover:text-text-primary'
                )}
              >
                Custom Job Role...
              </button>
            </div>

            {/* Custom Input box shown only when custom mode is active */}
            <AnimatePresence>
              {isCustomMode && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-2 pt-2"
                >
                  <label htmlFor="custom-role-input" className="text-xs font-semibold text-text-secondary uppercase tracking-wider block">
                    Enter Custom Position Title
                  </label>
                  <input
                    type="text"
                    id="custom-role-input"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="e.g. Senior Project Manager"
                    className="w-full px-3.5 py-2.5 rounded-lg text-sm bg-background border border-border text-text-primary placeholder-text-muted transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* CTA action button */}
            <div className="pt-4 border-t border-border/60 flex justify-end">
              <Button
                variant="primary"
                onClick={handleStartAnalysis}
                isLoading={analyzing}
                disabled={analyzing || !file || !getTargetRole().trim()}
                className="w-full sm:w-auto py-2.5 px-6 shadow-md shadow-primary/10"
                icon={IoSparklesOutline}
              >
                Analyze Resume
              </Button>
            </div>
          </div>
        </div>

        {/* Loading / Steps Progress state */}
        <AnimatePresence>
          {analyzing && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="bg-surface border border-border p-8 rounded-xl shadow-md flex flex-col items-center justify-center space-y-4 max-w-lg mx-auto"
            >
              <Spinner className="w-10 h-10 text-primary" />
              <div className="space-y-1.5 text-center">
                <p className="text-sm font-semibold text-text-primary animate-pulse">
                  AI Analyzing Document
                </p>
                <p className="text-xs text-text-muted font-medium">
                  {analysisSteps[analysisStep]}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Core Analysis Report Section */}
        <AnimatePresence>
          {report && !analyzing && (
            <motion.div
              ref={reportRef}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-8 pt-4 text-left"
            >
              {/* Report Header Overview */}
              <div className="bg-surface border border-border rounded-xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                
                {/* Left side: Score circular gauge */}
                <div className="flex items-center space-x-6">
                  <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className="text-slate-100"
                        strokeWidth="8"
                        stroke="currentColor"
                        fill="transparent"
                      />
                      <circle
                        cx="56"
                        cy="56"
                        r="48"
                        className={clsx(
                          'transition-all duration-1000 ease-out',
                          score >= 80 ? 'text-success' : score >= 65 ? 'text-warning' : 'text-error'
                        )}
                        strokeWidth="8"
                        strokeDasharray={circumference}
                        strokeDashoffset={strokeDashoffset}
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="transparent"
                      />
                    </svg>
                    
                    <div className="absolute inset-0 flex flex-col items-center justify-center space-y-0.5">
                      <span className="text-2xl font-extrabold text-text-primary">{score}%</span>
                      <span className="text-[9px] text-text-secondary uppercase tracking-wider font-bold">Match</span>
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <h2 className="text-base font-bold text-text-primary truncate">
                      Analysis Summary: {report.role}
                    </h2>
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {report.roleFeedback.length > 250 ? `${report.roleFeedback.substring(0, 250)}...` : report.roleFeedback}
                    </p>
                  </div>
                </div>

                <div className="flex md:flex-col items-center md:items-end justify-between border-t md:border-t-0 border-border/60 pt-4 md:pt-0 gap-2 select-none shrink-0">
                  <span className="text-[10px] text-text-muted font-medium">Scored against target criteria</span>
                  <div className={clsx(
                    'px-3 py-1 rounded-full text-xs font-bold border uppercase',
                    score >= 80 ? 'bg-success-bg text-success border-success/15' : score >= 65 ? 'bg-warning-bg text-warning border-warning/15' : 'bg-error-bg text-error border-error/15'
                  )}>
                    {score >= 80 ? 'Good Match' : score >= 65 ? 'Needs Work' : 'Weak Match'}
                  </div>
                </div>
              </div>

              {/* FIRST & CENTER: Interactive RAG Resume Q&A Chat Agent Panel */}
              <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4 flex flex-col relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[200px] h-[200px] bg-primary/5 rounded-full blur-[60px] pointer-events-none" />
                
                <div className="flex items-center space-x-2 border-b border-border/60 pb-2">
                  <IoChatbubbleEllipsesOutline className="w-5 h-5 text-primary" />
                  <div className="text-left">
                    <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
                      Resume Q&A Assistant
                    </h3>
                    <p className="text-[10px] text-text-muted mt-0.5 font-medium">
                      Prompt and converse with the AI agent about your resume details and qualifications.
                    </p>
                  </div>
                </div>

                {/* Chat message thread container */}
                <div className="border border-border rounded-lg bg-background/20 p-4 h-72 overflow-y-auto space-y-3 flex flex-col">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={clsx(
                        'p-3.5 rounded-xl max-w-[85%] text-xs leading-relaxed border break-words',
                        msg.role === 'user'
                          ? 'bg-primary text-white border-primary self-end rounded-tr-none text-right'
                          : 'bg-surface text-text-primary border-border self-start rounded-tl-none text-left prose-sm markdown-body'
                      )}
                    >
                      {/* Formatted display of paragraphs / markdown */}
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  ))}
                  {askingQuestion && (
                    <div className="bg-surface text-text-primary border border-border p-3 rounded-xl rounded-tl-none self-start flex items-center space-x-2">
                      <Spinner className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[10px] font-medium text-text-muted animate-pulse">
                        AI Agent writing...
                      </span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Suggested Prompt Pills */}
                <div className="flex flex-wrap gap-2 justify-start items-center">
                  <span className="text-[9px] text-text-muted uppercase tracking-wider font-bold shrink-0">Suggested Prompts:</span>
                  {suggestedQuestions.map((q) => (
                    <button
                      key={q}
                      onClick={() => handleSendQuestion(q)}
                      disabled={askingQuestion}
                      className="px-2.5 py-1 text-[10px] font-semibold bg-surface border border-border hover:border-primary/40 hover:text-primary rounded-lg transition-colors outline-none focus:ring-1 focus:ring-primary/10 text-text-secondary disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>

                {/* Chat text input and submit bar */}
                <div className="flex items-center space-x-2 pt-2 border-t border-border/60">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendQuestion()}
                    placeholder="Ask the AI Agent anything about your resume... (e.g. How can I optimize my projects?)"
                    disabled={askingQuestion}
                    className="flex-1 px-3 py-2.5 rounded-lg text-xs bg-background border border-border text-text-primary placeholder-text-muted transition-colors outline-none focus:border-primary focus:ring-1 focus:ring-primary/10"
                  />
                  <Button
                    variant="primary"
                    onClick={() => handleSendQuestion()}
                    disabled={!chatInput.trim() || askingQuestion}
                    className="py-2.5 px-3.5 rounded-lg shrink-0"
                  >
                    <IoSend className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Toggle Button for Details */}
              <div className="flex justify-center pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setShowDetails(!showDetails)}
                  className="py-2.5 px-6 text-xs font-bold uppercase tracking-wider shadow-sm border border-border bg-surface text-text-primary hover:bg-background/85 transition-all flex items-center space-x-2 rounded-lg"
                  icon={IoDocumentTextOutline}
                >
                  Detail Summary
                </Button>
              </div>

              {showDetails && (
                <div className="space-y-8 pt-4">
                  {/* Divider for details breakdown */}
                  <div className="pt-6 border-t border-border/80 flex items-center space-x-2 text-text-primary font-extrabold text-sm uppercase tracking-wider">
                    <IoDocumentTextOutline className="w-4.5 h-4.5 text-primary" />
                    <span>Detailed Analysis Metrics</span>
                  </div>

                  {/* Main report components grids (Below the Chat Agent) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    {/* 1. Skills Assessment */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
                      <h3 className="text-xs font-bold text-text-primary border-b border-border/60 pb-2 uppercase tracking-wider">
                        Skills Assessment
                      </h3>

                      <div className="space-y-4">
                        {/* Skills found list */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-success uppercase tracking-wide flex items-center space-x-1">
                            <IoCheckmarkCircleOutline className="w-3.5 h-3.5" />
                            <span>Matching Skills Found ({report.skillsFound?.length || 0})</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {report.skillsFound?.map((sk) => (
                              <span key={sk} className="px-2 py-1 text-[10px] font-semibold bg-success-bg/60 text-success border border-success/10 rounded-md">
                                {sk}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Skills missing list */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-error uppercase tracking-wide flex items-center space-x-1">
                            <IoAlertCircleOutline className="w-3.5 h-3.5" />
                            <span>Gaps / Skills Missing ({report.skillsMissing?.length || 0})</span>
                          </span>
                          {report.skillsMissing?.length === 0 ? (
                            <p className="text-xs text-text-muted">No major skills gaps identified!</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {report.skillsMissing?.map((sk) => (
                                <span key={sk} className="px-2 py-1 text-[10px] font-semibold bg-error-bg/60 text-error border border-error/10 rounded-md">
                                  {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. Strengths and Weaknesses */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4">
                      <h3 className="text-xs font-bold text-text-primary border-b border-border/60 pb-2 uppercase tracking-wider">
                        Strengths & Weaknesses
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Strengths */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide flex items-center space-x-1">
                            <IoThumbsUpOutline className="w-3.5 h-3.5 text-success" />
                            <span>Key Strengths</span>
                          </span>
                          <ul className="space-y-2">
                            {report.strengths?.map((str, idx) => (
                              <li key={idx} className="text-xs text-text-primary leading-relaxed flex items-start space-x-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0 mt-1.5" />
                                <span>{str}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Weaknesses */}
                        <div className="space-y-2.5">
                          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wide flex items-center space-x-1">
                            <IoThumbsDownOutline className="w-3.5 h-3.5 text-error" />
                            <span>Weaknesses</span>
                          </span>
                          <ul className="space-y-2">
                            {report.weaknesses?.map((wk, idx) => (
                              <li key={idx} className="text-xs text-text-primary leading-relaxed flex items-start space-x-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-error shrink-0 mt-1.5" />
                                <span>{wk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* 3. Resume formatting suggestions */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-3.5">
                      <div className="flex items-center space-x-1.5 text-text-primary border-b border-border/60 pb-2">
                        <IoColorWandOutline className="w-4.5 h-4.5 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          Structure & Format Suggestions
                        </h3>
                      </div>

                      <ul className="space-y-2.5">
                        {report.formattingSuggestions?.map((sug, idx) => (
                          <li key={idx} className="text-xs text-text-primary leading-relaxed flex items-start space-x-2">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 4. ATS keywords optimization */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-3.5">
                      <div className="flex items-center space-x-1.5 text-text-primary border-b border-border/60 pb-2">
                        <IoSettingsOutline className="w-4.5 h-4.5 text-primary" />
                        <h3 className="text-xs font-bold uppercase tracking-wider">
                          ATS Parser Optimizations
                        </h3>
                      </div>

                      <ul className="space-y-2.5">
                        {report.atsOptimization?.map((sug, idx) => (
                          <li key={idx} className="text-xs text-text-primary leading-relaxed flex items-start space-x-2">
                            <span className="text-primary font-bold mt-0.5">•</span>
                            <span>{sug}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* 5. Actionable recommendations (spans full width) */}
                    <div className="bg-surface border border-border rounded-xl p-6 shadow-sm space-y-4 md:col-span-2">
                      <h3 className="text-xs font-bold text-text-primary border-b border-border/60 pb-2 uppercase tracking-wider flex items-center space-x-1.5">
                        <IoSparklesOutline className="w-4 h-4 text-primary" />
                        <span>Actionable Recommendations to Better Match Role</span>
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                        {report.actionableRecommendations?.map((rec, idx) => (
                          <div key={idx} className="p-4 bg-background/50 border border-border rounded-lg space-y-1.5 relative overflow-hidden flex flex-col justify-start">
                            <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                              {idx + 1}
                            </div>
                            <p className="text-xs text-text-primary leading-relaxed">
                              {rec}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Branding details */}
      <footer className="w-full max-w-5xl mx-auto pt-12 text-center text-[10px] text-text-muted z-10 shrink-0">
        <p>© 2026 AI Resume & Document Analyzer. Powered by Spring Boot and Google Gemini.</p>
      </footer>
    </div>
  );
};

export default AnalyzerPage;
