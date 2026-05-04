import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSubmissions } from '../hooks/useSubmissions';
import AppLayout from '../components/layout/AppLayout';
import AIProcessingOverlay from '../components/ai/AIProcessingOverlay';
import {
  Send, User, FileText,
  Upload, X, Check, ArrowRight, ArrowLeft, Loader2, Sparkles
} from 'lucide-react';
import { useDropzone } from 'react-dropzone';

const STEPS = [
  { id: 1, title: 'About You', icon: User },
  { id: 2, title: 'Content Details', icon: FileText },
  { id: 3, title: 'Attachments', icon: Upload },
];

export default function SubmissionPage() {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState([]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState(null);
  const { user, isMarketing } = useAuth();
  const { createSubmission, loading } = useSubmissions();
  const navigate = useNavigate();

  const {
    register,
    formState: { errors },
    trigger,
    getValues,
  } = useForm({
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      team: '',
      content_title: '',
      content_description: '',
      content_type: 'post',
      priority: 'medium',
      tone_preference: 'formal',
    },
  });

  const onDrop = useCallback((acceptedFiles) => {
    const newFiles = acceptedFiles.slice(0, 5 - files.length);
    setFiles((prev) => [...prev, ...newFiles].slice(0, 5));
  }, [files]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp'],
      'application/pdf': ['.pdf'],
    },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 5 - files.length,
    disabled: files.length >= 5,
  });

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const nextStep = async () => {
    let fieldsToValidate;
    if (step === 1) fieldsToValidate = ['name', 'email'];
    if (step === 2) fieldsToValidate = ['content_description'];

    const valid = await trigger(fieldsToValidate);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  // Called only when user explicitly clicks the Finish button on Step 3
  const handleFinish = async () => {
    // Validate all fields before final submission
    const valid = await trigger();
    if (!valid) return;

    const data = getValues();
    const formData = new FormData();
    Object.entries(data).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });
    files.forEach((file) => formData.append('files', file));

    setSubmitting(true);
    try {
      const result = await createSubmission(formData);
      // Keep overlay visible for minimum 4s so animation plays fully
      await new Promise(r => setTimeout(r, 4000));
      setSubmissionId(result.submission_id);
      setSubmitted(true);
    } catch (err) {
      setSubmitting(false);
      // Error handled by hook
    }
  };

  if (submitted) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-20 animate-scale-in">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-teal-500/10 border border-teal-500/20 mb-6">
            <Check className="w-10 h-10 text-teal-500" />
          </div>
          <h2 className="text-3xl font-semibold text-surface-100 mb-3">
            {isMarketing ? 'Content Generated!' : 'Submission Received!'}
          </h2>
          <p className="text-surface-400 mb-2">
            {isMarketing ? 'Your content is being drafted by AI.' : 'Your content is being processed by AI.'}
          </p>
          <p className="text-sm text-surface-500 mb-8">
            Submission ID: <code className="text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">{submissionId?.slice(0, 8)}</code>
          </p>
          <div className="surface-card p-6 mb-8 text-left">
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-brand-500" />
              <h3 className="font-semibold text-surface-200">What happens next?</h3>
            </div>
            <ol className="space-y-3 text-sm text-surface-400">
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-bold">1</span>
                <span>AI generates LinkedIn, Twitter, and Instagram drafts (~90 seconds)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-bold">2</span>
                <span>Marketing team reviews and edits the drafts</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center text-xs font-bold">3</span>
                <span>You'll receive an email when content is approved</span>
              </li>
            </ol>
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setSubmitted(false); setStep(1); setFiles([]); }} className="btn-primary">
              Submit Another
            </button>
            <button onClick={() => navigate(isMarketing ? '/dashboard' : '/my-submissions')} className="btn-secondary">
              {isMarketing ? 'View in Dashboard' : 'View My Submissions'}
            </button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      {/* AI Processing Overlay — only shown after user submits */}
      <AIProcessingOverlay visible={submitting} />

      <div className="max-w-3xl mx-auto animate-fade-in">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-surface-100 mb-2">
            {isMarketing ? 'Content Generation' : 'New Content Submission'}
          </h1>
          <p className="text-surface-400 text-sm">
            {isMarketing
              ? 'Provide content details and AI will generate platform-specific drafts for your review.'
              : 'Fill in the details and our AI will generate platform-specific drafts.'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, idx) => (
            <div key={s.id} className="flex items-center gap-2 flex-1">
              <button
                onClick={() => s.id < step && setStep(s.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-300 w-full ${
                  step === s.id ? 'step-active' : step > s.id ? 'step-completed' : 'step-inactive'
                }`}
              >
                <s.icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden sm:inline">{s.title}</span>
                <span className="sm:hidden">{s.id}</span>
              </button>
              {idx < STEPS.length - 1 && (
                <div className={`h-px flex-shrink-0 w-8 ${step > s.id ? 'bg-teal-500' : 'bg-surface-700'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="surface-card p-6 lg:p-8">
            {/* Step 1: About You */}
            {step === 1 && (
              <div className="space-y-5 animate-slide-up">
                <h2 className="text-lg font-semibold text-surface-200 flex items-center gap-2">
                  <User className="w-5 h-5 text-brand-500" /> About You
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="sub-name" className="block text-sm font-medium text-surface-300 mb-2">
                      Full Name *
                    </label>
                    <input
                      id="sub-name"
                      {...register('name', { required: 'Name is required' })}
                      className="input-field"
                      placeholder="Your full name"
                    />
                    {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="sub-email" className="block text-sm font-medium text-surface-300 mb-2">
                      Email *
                    </label>
                    <input
                      id="sub-email"
                      type="email"
                      {...register('email', { required: 'Email is required', pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } })}
                      className="input-field"
                      placeholder="you@company.com"
                    />
                    {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>}
                  </div>

                  <div>
                    <label htmlFor="sub-team" className="block text-sm font-medium text-surface-300 mb-2">
                      Team / Department
                    </label>
                    <input
                      id="sub-team"
                      {...register('team')}
                      className="input-field"
                      placeholder="e.g., AI Team, Operations"
                    />
                  </div>

                  <div>
                    <label htmlFor="sub-priority" className="block text-sm font-medium text-surface-300 mb-2">
                      Priority
                    </label>
                    <select id="sub-priority" {...register('priority')} className="select-field">
                      <option value="low">🟢 Low</option>
                      <option value="medium">🟡 Medium</option>
                      <option value="high">🔴 High</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Content Details */}
            {step === 2 && (
              <div className="space-y-5 animate-slide-up">
                <h2 className="text-lg font-semibold text-surface-200 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-500" /> Content Details
                </h2>

                <div>
                  <label htmlFor="sub-title" className="block text-sm font-medium text-surface-300 mb-2">
                    Content Title
                  </label>
                  <input
                    id="sub-title"
                    {...register('content_title')}
                    className="input-field"
                    placeholder="Brief title for internal tracking"
                  />
                </div>

                <div>
                  <label htmlFor="sub-description" className="block text-sm font-medium text-surface-300 mb-2">
                    Content Description * <span className="text-surface-500 font-normal">(min 20 characters)</span>
                  </label>
                  <textarea
                    id="sub-description"
                    {...register('content_description', {
                      required: 'Description is required',
                      minLength: { value: 20, message: 'At least 20 characters required' },
                    })}
                    className="textarea-field"
                    rows={5}
                    placeholder="Describe the content you want to promote. The more detail you provide, the better the AI-generated drafts will be..."
                  />
                  {errors.content_description && (
                    <p className="text-red-400 text-xs mt-1">{errors.content_description.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="sub-type" className="block text-sm font-medium text-surface-300 mb-2">
                      Content Type
                    </label>
                    <select id="sub-type" {...register('content_type')} className="select-field">
                      <option value="post">📝 Post</option>
                      <option value="event">📅 Event</option>
                      <option value="course">🎓 Course</option>
                      <option value="announcement">📢 Announcement</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sub-tone" className="block text-sm font-medium text-surface-300 mb-2">
                      Tone Preference
                    </label>
                    <select id="sub-tone" {...register('tone_preference')} className="select-field">
                      <option value="formal">💼 Formal</option>
                      <option value="casual">😊 Casual</option>
                      <option value="promotional">🎯 Promotional</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Attachments */}
            {step === 3 && (
              <div className="space-y-5 animate-slide-up">
                <div>
                  <h2 className="text-lg font-semibold text-surface-200 flex items-center gap-2">
                    <Upload className="w-5 h-5 text-brand-500" /> Attachments
                    <span className="text-sm font-normal text-surface-500 ml-1">(optional)</span>
                  </h2>
                  <p className="text-sm text-surface-400 mt-1">
                    Upload images or PDFs to give AI more context — file contents will be included in generation. Max 5 files, 10 MB each.
                  </p>
                </div>

                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
                    isDragActive
                      ? 'border-brand-500 bg-brand-500/5'
                      : files.length >= 5
                        ? 'border-surface-700 bg-surface-800/30 cursor-not-allowed'
                        : 'border-surface-600 hover:border-brand-500/50 hover:bg-surface-800/30'
                  }`}
                >
                  <input {...getInputProps()} />
                  <Upload className={`w-10 h-10 mx-auto mb-3 ${isDragActive ? 'text-brand-500' : 'text-surface-500'}`} />
                  {files.length >= 5 ? (
                    <p className="text-surface-500">Maximum files reached</p>
                  ) : isDragActive ? (
                    <p className="text-brand-500 font-medium">Drop files here...</p>
                  ) : (
                    <>
                      <p className="text-surface-300 font-medium">Drag & drop files here</p>
                      <p className="text-surface-500 text-sm mt-1">or click to browse</p>
                    </>
                  )}
                </div>

                {/* File List */}
                {files.length > 0 && (
                  <div className="space-y-2">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 rounded-xl bg-surface-800/50 border border-surface-700/50"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center flex-shrink-0">
                            <FileText className="w-4 h-4 text-brand-500" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm text-surface-200 truncate">{file.name}</p>
                            <p className="text-xs text-surface-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFile(idx)}
                          className="p-1 rounded-lg hover:bg-red-500/10 text-surface-500 hover:text-red-400 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t border-surface-700/50">
              {step > 1 ? (
                <button type="button" onClick={prevStep} className="btn-secondary flex items-center gap-2">
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
              ) : (
                <div />
              )}

              {step < 3 ? (
                <button type="button" onClick={nextStep} className="btn-primary flex items-center gap-2">
                  Next <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={submitting}
                  className="btn-primary flex items-center gap-2"
                >
                  {submitting ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> Sending to AI...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      {files.length > 0 ? `Finish & Submit with ${files.length} attachment${files.length > 1 ? 's' : ''}` : 'Finish & Submit'}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </AppLayout>
  );
}
