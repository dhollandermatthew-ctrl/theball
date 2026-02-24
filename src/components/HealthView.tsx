// FILE: src/components/HealthView.tsx
import React, { useState, useRef } from "react";
import { Upload, Plus, FileText, Image as ImageIcon, Calendar, Trash2, Activity, Zap, TrendingUp, TrendingDown, Minus, AlertCircle, AlertTriangle, Info, Settings, User, X } from "lucide-react";
import { HealthData, BloodWorkRecord, LabValue, WorkoutRecord, PersonalProfile } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { extractBloodWorkFromFile } from "@/domain/ai/bloodwork";
import { extractWorkoutFromImage } from "@/domain/ai/fitness";
import { tokenTracker } from "@/domain/tokenTracker";
import { TokenStatsModal } from "./TokenStatsModal";
import { useAppStore } from "@/domain/state";

export const HealthView: React.FC = () => {
  // Zustand state and actions
  const healthData = useAppStore((s) => s.healthData);
  const addBloodwork = useAppStore((s) => s.addBloodwork);
  const deleteBloodwork = useAppStore((s) => s.deleteBloodwork);
  const addWorkout = useAppStore((s) => s.addWorkout);
  const updateHealthProfile = useAppStore((s) => s.updateHealthProfile);
  const [activeTab, setActiveTab] = useState<"bloodwork" | "fitness">("bloodwork");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWorkoutEntry, setShowWorkoutEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workoutFileInputRef = useRef<HTMLInputElement>(null);
  const [totalTokens, setTotalTokens] = React.useState(0);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);

  React.useEffect(() => {
    const updateTokens = () => {
      setTotalTokens(tokenTracker.getTotalTokens());
    };
    updateTokens();
    const unsubscribe = tokenTracker.subscribe(updateTokens);
    return () => {
      unsubscribe();
    };
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // Use Gemini Vision to extract blood work data
      const record = await extractBloodWorkFromFile(file);

      addBloodwork(record);
    } catch (error) {
      console.error("Error processing file:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for quota errors - be more specific
      const errorLower = errorMessage.toLowerCase();
      const isQuotaError = 
        errorLower.includes('429') || 
        errorLower.includes('resource_exhausted') ||
        (errorLower.includes('quota') && errorLower.includes('exceeded'));
      
      if (isQuotaError) {
        setUploadError(
          "⚠️ API quota exceeded. The Gemini API free tier limit has been reached. You can manually add blood work records below, or wait for the quota to reset. Try switching to Ollama in the header if you have it installed."
        );
      } else {
        // Show the actual error to help with debugging
        setUploadError(
          `Failed to process file: ${errorMessage.substring(0, 300)}`
        );
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleManualEntry = (record: BloodWorkRecord) => {
    addBloodwork(record);
    setShowManualEntry(false);
  };

  const handleWorkoutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const record = await extractWorkoutFromImage(file);

      addWorkout(record);
    } catch (error) {
      console.error("Error processing workout:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for quota errors - be more specific
      const errorLower = errorMessage.toLowerCase();
      const isQuotaError = 
        errorLower.includes('429') || 
        errorLower.includes('resource_exhausted') ||
        (errorLower.includes('quota') && errorLower.includes('exceeded'));
      
      if (isQuotaError) {
        setUploadError(
          "⚠️ API quota exceeded. The Gemini API free tier limit has been reached. You can manually add workouts below. Try switching to Ollama in the header if you have it installed."
        );
      } else {
        setUploadError(`Failed to process image: ${errorMessage.substring(0, 200)}`);
      }
    } finally {
      setIsUploading(false);
      if (workoutFileInputRef.current) {
        workoutFileInputRef.current.value = "";
      }
    }
  };

  const handleManualWorkout = (record: WorkoutRecord) => {
    addWorkout(record);
    setShowWorkoutEntry(false);
  };

  const sortedRecords = [...(healthData.bloodWorkRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const sortedWorkouts = [...(healthData.workoutRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Set default selected record to newest one
  React.useEffect(() => {
    if (sortedRecords.length > 0 && !selectedRecordId) {
      setSelectedRecordId(sortedRecords[0].id);
    }
  }, [sortedRecords.length]);

  const selectedRecord = sortedRecords.find(r => r.id === selectedRecordId);

  return (
    <>
      <TokenStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Health</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Track your blood work and fitness metrics
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 px-2.5 py-1.5 rounded-lg border border-amber-200 hover:border-amber-300 transition-all cursor-pointer"
              title="View token usage stats"
            >
              <Zap size={14} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                {totalTokens.toLocaleString()}
              </span>
            </button>

            {activeTab === "bloodwork" ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowManualEntry(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Plus size={16} />
                Manual
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                {isUploading ? "Processing..." : "Upload"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowWorkoutEntry(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Plus size={16} />
                Manual
              </button>

              <button
                onClick={() => workoutFileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={16} />
                {isUploading ? "Processing..." : "Upload"}
              </button>
            </div>
          )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <input
            ref={workoutFileInputRef}
            type="file"
            accept="image/*"
            onChange={handleWorkoutUpload}
            className="hidden"
          />
        </div>

        {/* Health Overview Section - Always Visible */}
        <HealthOverviewSection 
          bloodWorkRecords={healthData.bloodWorkRecords || []}
          workoutRecords={healthData.workoutRecords || []}
          personalProfile={healthData.personalProfile}
          onOpenProfileSettings={() => setShowProfileModal(true)}
        />

        {/* Tabs */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setActiveTab("bloodwork")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${ 
              activeTab === "bloodwork"
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText size={14} className="inline mr-1.5" />
            Blood Work
          </button>
          <button
            onClick={() => setActiveTab("fitness")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "fitness"
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity size={14} className="inline mr-1.5" />
            Fitness
          </button>
        </div>

        {uploadError && (
          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
            {uploadError}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-4">
        {activeTab === "bloodwork" ? (
          sortedRecords.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <FileText size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              No blood work records yet
            </h3>
            <p className="text-sm text-slate-500 mb-6 max-w-md">
              Upload a PDF or image of your blood work results. AI will extract
              the lab values and track trends over time.
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Upload size={18} />
              Upload Your First Report
            </button>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto">
            {/* Health Summary with Alerts */}
            {sortedRecords.length > 0 && (
              <HealthSummarySection records={sortedRecords} />
            )}
            
            {/* Trend Charts Section */}
            {sortedRecords.length > 1 && (
              <div className="mb-6">
                <h2 className="text-base font-semibold text-slate-900 mb-3">
                  Trends Over Time
                </h2>
                <TrendCharts records={sortedRecords} personalProfile={healthData.personalProfile} />
              </div>
            )}

            {/* Records List - Horizontal Pills */}
            <div className="space-y-4">
              <div className="space-y-2">
                <h2 className="text-base font-semibold text-slate-900">
                  Blood Work History
                </h2>
                <div className="flex flex-wrap gap-3">
                  {sortedRecords.map((record) => (
                    <BloodWorkPill
                      key={record.id}
                      record={record}
                      isSelected={record.id === selectedRecordId}
                      onSelect={() => setSelectedRecordId(record.id)}
                    />
                  ))}
                </div>
              </div>

              {/* Selected Record Details */}
              {selectedRecord && (
                <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                        {selectedRecord.sourceType === "pdf" ? (
                          <FileText size={20} className="text-indigo-600" />
                        ) : (
                          <ImageIcon size={20} className="text-indigo-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-medium text-slate-900">
                            {new Date(selectedRecord.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        {selectedRecord.labName && (
                          <p className="text-xs text-slate-500 mt-1">{selectedRecord.labName}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedRecord.sourceFileName && (
                        <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
                          {selectedRecord.sourceFileName}
                        </span>
                      )}
                      <button
                        onClick={() => {
                          deleteBloodwork(selectedRecord.id);
                          setSelectedRecordId(null);
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Delete record"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {selectedRecord.labValues.length > 0 ? (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-700 mb-3">Lab Values</h4>
                      <div className="grid gap-2">
                        {selectedRecord.labValues.map((value, idx) => (
                          <LabValueRow key={idx} value={value} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-500 bg-slate-50 rounded p-3">
                      Processing...
                    </div>
                  )}

                  {selectedRecord.aiAnalysis && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <h4 className="text-sm font-medium text-slate-700 mb-2">AI Analysis</h4>
                      <p className="text-sm text-slate-600">{selectedRecord.aiAnalysis}</p>
                    </div>
                  )}

                  {selectedRecord.aiFlags && selectedRecord.aiFlags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {selectedRecord.aiFlags.map((flag, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200"
                        >
                          ⚠️ {flag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      ) : (
        // Fitness Tab Content
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <Activity size={32} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Fitness tracking coming soon
            </h3>
            <p className="text-sm text-slate-500 max-w-md">
              Upload workout screenshots or manually log your fitness activities.
            </p>
          </div>
        </div>
      )}
      </div>

      {/* Manual Entry Modals */}
      {showManualEntry && (
        <ManualEntryModal
          onClose={() => setShowManualEntry(false)}
          onSave={handleManualEntry}
        />
      )}

      {showWorkoutEntry && (
        <WorkoutEntryModal
          onClose={() => setShowWorkoutEntry(false)}
          onSave={handleManualWorkout}
        />
      )}

      {showProfileModal && (
        <PersonalProfileModal
          profile={healthData.personalProfile}
          onClose={() => setShowProfileModal(false)}
          onSave={(profile) => {
            updateHealthProfile(profile);
            setShowProfileModal(false);
          }}
        />
      )}
    </div>
    </>
  );
};

interface BloodWorkCardProps {
  record: BloodWorkRecord;
  onDelete: (id: string) => void;
}

const BloodWorkCard: React.FC<BloodWorkCardProps> = ({ record, onDelete }) => {
  const date = new Date(record.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
            {record.sourceType === "pdf" ? (
              <FileText size={20} className="text-indigo-600" />
            ) : (
              <ImageIcon size={20} className="text-indigo-600" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-900">
                {formattedDate}
              </span>
            </div>
            {record.labName && (
              <p className="text-xs text-slate-500 mt-1">{record.labName}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {record.sourceFileName && (
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
              {record.sourceFileName}
            </span>
          )}
          <button
            onClick={() => onDelete(record.id)}
            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
            title="Delete record"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {record.labValues.length > 0 ? (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-slate-700 mb-3">Lab Values</h4>
          <div className="grid gap-2">
            {record.labValues.map((value, idx) => (
              <LabValueRow key={idx} value={value} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-sm text-slate-500 bg-slate-50 rounded p-3">
          Processing...
        </div>
      )}

      {record.aiAnalysis && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-medium text-slate-700 mb-2">AI Analysis</h4>
          <p className="text-sm text-slate-600">{record.aiAnalysis}</p>
        </div>
      )}

      {record.aiFlags && record.aiFlags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {record.aiFlags.map((flag, idx) => (
            <span
              key={idx}
              className="text-xs px-2 py-1 bg-amber-50 text-amber-700 rounded border border-amber-200"
            >
              ⚠️ {flag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

// Health Overview Section - Always Visible Above Tabs
interface HealthOverviewSectionProps {
  bloodWorkRecords: BloodWorkRecord[];
  workoutRecords: WorkoutRecord[];
  personalProfile?: PersonalProfile;
  onOpenProfileSettings: () => void;
}

const HealthOverviewSection: React.FC<HealthOverviewSectionProps> = ({ 
  bloodWorkRecords, 
  workoutRecords,
  personalProfile,
  onOpenProfileSettings
}) => {
  if (bloodWorkRecords.length === 0 && workoutRecords.length === 0) {
    return null;
  }

  // Sort by date (most recent first)
  const sortedWorkouts = [...workoutRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const sortedBloodWork = [...bloodWorkRecords].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  // Calculate workout metrics
  const last30Days = new Date();
  last30Days.setDate(last30Days.getDate() - 30);
  
  const recentWorkouts = sortedWorkouts.filter(w => 
    new Date(w.date) >= last30Days
  );
  
  const totalDistance = recentWorkouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const avgDistance = recentWorkouts.length > 0 ? totalDistance / recentWorkouts.length : 0;
  const totalWorkouts = recentWorkouts.length;
  
  // Find key blood work metrics from latest record
  const latestBloodWork = sortedBloodWork.length > 0 ? sortedBloodWork[0] : null;
  const keyMetrics = latestBloodWork ? [
    latestBloodWork.labValues.find(v => v.name.toLowerCase().includes('cholesterol')),
    latestBloodWork.labValues.find(v => v.name.toLowerCase().includes('glucose') || v.name.toLowerCase().includes('blood sugar')),
    latestBloodWork.labValues.find(v => v.name.toLowerCase().includes('vitamin d')),
  ].filter(Boolean) as LabValue[] : [];

  return (
    <div className="mb-2 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-lg p-2.5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
          <Activity size={14} />
          Health Overview
        </h3>
        <button
          onClick={onOpenProfileSettings}
          className="p-1 hover:bg-white rounded transition-colors border border-transparent hover:border-slate-300 text-slate-600 hover:text-slate-900"
          title="Personal Profile Settings"
        >
          <Settings size={14} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {/* Workout Metrics */}
        {sortedWorkouts.length > 0 && (
          <>
            <div className="bg-white rounded p-2 border border-slate-200">
              <div className="text-[10px] text-slate-500 mb-0.5">Workouts (30d)</div>
              <div className="text-xl font-bold text-slate-900">{totalWorkouts}</div>
            </div>
            
            {totalDistance > 0 && (
              <div className="bg-white rounded p-2 border border-slate-200">
                <div className="text-[10px] text-slate-500 mb-0.5">Distance (30d)</div>
                <div className="text-xl font-bold text-slate-900">{totalDistance.toFixed(1)}<span className="text-sm ml-0.5">km</span></div>
              </div>
            )}
          </>
        )}
        
        {/* Key Blood Work Metrics */}
        {keyMetrics.slice(0, 2).map((metric, idx) => {
          const isNormal = !metric.flag;
          return (
            <div 
              key={idx}
              className={`rounded p-2 border ${
                isNormal 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-amber-50 border-amber-300'
              }`}
            >
              <div className="text-[10px] text-slate-600 mb-0.5 flex items-center gap-1 truncate">
                <span className="truncate">{metric.name}</span>
                {!isNormal && <AlertTriangle size={10} className="text-amber-600 flex-shrink-0" />}
              </div>
              <div className={`text-base font-bold ${isNormal ? 'text-green-900' : 'text-amber-900'}`}>
                {metric.value} <span className="text-xs font-normal">{metric.unit}</span>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Last Updated - more compact */}
      <div className="mt-2 text-[10px] text-slate-500 text-center">
        {latestBloodWork && (
          <span>Blood: {new Date(latestBloodWork.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
        {latestBloodWork && sortedWorkouts.length > 0 && <span className="mx-1">•</span>}
        {sortedWorkouts.length > 0 && (
          <span>Workout: {new Date(sortedWorkouts[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
        )}
      </div>
    </div>
  );
};

// Health Summary Section with Alerts
interface HealthAlert {
  severity: 'critical' | 'warning' | 'monitor';
  metric: string;
  currentValue: string;
  referenceRange?: string;
  trend: 'rising' | 'falling' | 'stable';
  lastTested: Date;
  flag?: string;
}

interface HealthSummarySectionProps {
  records: BloodWorkRecord[];
}

const HealthSummarySection: React.FC<HealthSummarySectionProps> = ({ records }) => {
  // Analyze all lab values to create alerts
  const alerts: HealthAlert[] = [];
  
  if (records.length === 0) return null;
  
  const latestRecord = records[0];
  
  // For each lab value in the latest record, check if it's flagged
  latestRecord.labValues.forEach((labValue) => {
    if (labValue.flag) {
      let severity: 'critical' | 'warning' | 'monitor' = 'monitor';
      
      if (labValue.flag === 'HH' || labValue.flag === 'LL' || labValue.flag === 'CRIT') {
        severity = 'critical';
      } else if (labValue.flag === 'H' || labValue.flag === 'L') {
        severity = 'warning';
      }
      
      // Calculate trend if there are multiple records
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      if (records.length > 1) {
        // Find same metric in previous record
        const previousValue = records[1].labValues.find(v => v.name === labValue.name);
        if (previousValue) {
          const current = parseFloat(labValue.value);
          const previous = parseFloat(previousValue.value);
          if (!isNaN(current) && !isNaN(previous)) {
            const change = ((current - previous) / previous) * 100;
            if (Math.abs(change) > 5) {
              trend = change > 0 ? 'rising' : 'falling';
            }
          }
        }
      }
      
      alerts.push({
        severity,
        metric: labValue.name,
        currentValue: `${labValue.value} ${labValue.unit}`,
        referenceRange: labValue.referenceRange,
        trend,
        lastTested: new Date(latestRecord.date),
        flag: labValue.flag,
      });
    }
  });
  
  // Sort by severity
  alerts.sort((a, b) => {
    const severityOrder = { critical: 0, warning: 1, monitor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
  
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;
  const warningCount = alerts.filter(a => a.severity === 'warning').length;
  
  return (
    <div className="mb-8 space-y-4">
      {/* Status Banner */}
      <div className={`rounded-lg p-4 border ${
        criticalCount > 0 
          ? 'bg-red-50 border-red-200' 
          : warningCount > 0 
          ? 'bg-amber-50 border-amber-200'
          : 'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {criticalCount > 0 ? (
              <AlertCircle size={24} className="text-red-600" />
            ) : warningCount > 0 ? (
              <AlertTriangle size={24} className="text-amber-600" />
            ) : (
              <Info size={24} className="text-green-600" />
            )}
            <div>
              <h3 className={`font-semibold ${
                criticalCount > 0 ? 'text-red-900' : warningCount > 0 ? 'text-amber-900' : 'text-green-900'
              }`}>
                {criticalCount > 0 
                  ? `${criticalCount} ${criticalCount === 1 ? 'metric needs' : 'metrics need'} immediate attention`
                  : warningCount > 0
                  ? `${warningCount} ${warningCount === 1 ? 'metric to' : 'metrics to'} monitor`
                  : 'All metrics within normal range'
                }
              </h3>
              <p className={`text-sm ${
                criticalCount > 0 ? 'text-red-700' : warningCount > 0 ? 'text-amber-700' : 'text-green-700'
              }`}>
                Last blood work: {new Date(latestRecord.date).toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>
          {records.length > 1 && (
            <div className="text-sm text-slate-600">
              {records.length} total records
            </div>
          )}
        </div>
      </div>

      {/* Alert Cards - Show top 3 */}
      {alerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-md font-semibold text-slate-900">Priority Findings</h3>
          <div className="grid gap-3">
            {alerts.slice(0, 3).map((alert, idx) => (
              <HealthAlertCard key={idx} alert={alert} />
            ))}
          </div>
          {alerts.length > 3 && (
            <p className="text-sm text-slate-500 text-center">
              + {alerts.length - 3} more {alerts.length - 3 === 1 ? 'item' : 'items'} flagged
            </p>
          )}
        </div>
      )}

      {/* AI Analysis if available */}
      {latestRecord.aiAnalysis && alerts.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Info size={20} className="text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">AI Health Analysis</h4>
              <p className="text-sm text-blue-800">{latestRecord.aiAnalysis}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface HealthAlertCardProps {
  alert: HealthAlert;
}

const HealthAlertCard: React.FC<HealthAlertCardProps> = ({ alert }) => {
  const getSeverityColor = () => {
    switch (alert.severity) {
      case 'critical': return { bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-900', badge: 'bg-red-600' };
      case 'warning': return { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-900', badge: 'bg-amber-600' };
      case 'monitor': return { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-900', badge: 'bg-blue-600' };
    }
  };

  const getTrendIcon = () => {
    switch (alert.trend) {
      case 'rising': return <TrendingUp size={16} className="text-red-600" />;
      case 'falling': return <TrendingDown size={16} className="text-green-600" />;
      case 'stable': return <Minus size={16} className="text-slate-400" />;
    }
  };

  const colors = getSeverityColor();

  return (
    <div className={`${colors.bg} border ${colors.border} rounded-lg p-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-xs font-bold uppercase px-2 py-0.5 rounded text-white ${colors.badge}`}>
              {alert.severity}
            </span>
            <span className={`text-sm font-semibold ${colors.text}`}>
              {alert.metric}
            </span>
          </div>
          
          <div className="flex items-center gap-4 mb-2">
            <div>
              <div className={`text-2xl font-bold ${colors.text}`}>
                {alert.currentValue}
              </div>
              {alert.referenceRange && (
                <div className="text-xs text-slate-600 mt-1">
                  Normal: {alert.referenceRange}
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className="text-xs text-slate-600 capitalize">{alert.trend}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface LabValueRowProps {
  value: LabValue;
}

const LabValueRow: React.FC<LabValueRowProps> = ({ value }) => {
  const getFlagColor = (flag?: string) => {
    if (!flag) return "";
    if (flag === "HH" || flag === "LL" || flag === "CRIT")
      return "text-red-600 bg-red-50";
    if (flag === "H" || flag === "L") return "text-amber-600 bg-amber-50";
    return "";
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded text-sm">
      <span className="font-medium text-slate-700">{value.name}</span>
      <div className="flex items-center gap-3 text-slate-600">
        <span className={value.flag ? getFlagColor(value.flag) : ""}>
          {value.value} {value.unit}
          {value.flag && (
            <span className="ml-1 font-semibold">{value.flag}</span>
          )}
        </span>
        {value.referenceRange && (
          <span className="text-xs text-slate-400">
            ({value.referenceRange})
          </span>
        )}
      </div>
    </div>
  );
};

interface BloodWorkPillProps {
  record: BloodWorkRecord;
  isSelected: boolean;
  onSelect: () => void;
}

const BloodWorkPill: React.FC<BloodWorkPillProps> = ({ record, isSelected, onSelect }) => {
  const date = new Date(record.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div 
      onClick={onSelect}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full transition-all cursor-pointer ${
        isSelected 
          ? "bg-indigo-600 text-white shadow-md" 
          : "bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-sm"
      }`}
    >
      <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
        isSelected ? "bg-indigo-500" : "bg-indigo-100"
      }`}>
        {record.sourceType === "pdf" ? (
          <FileText size={12} className={isSelected ? "text-white" : "text-indigo-600"} />
        ) : (
          <ImageIcon size={12} className={isSelected ? "text-white" : "text-indigo-600"} />
        )}
      </div>
      <span className={`text-sm font-medium ${
        isSelected ? "text-white" : "text-slate-900"
      }`}>{formattedDate}</span>
      {record.labName && (
        <span className={`text-xs ${
          isSelected ? "text-indigo-100" : "text-slate-500"
        }`}>{record.labName}</span>
      )}
      {record.aiFlags && record.aiFlags.length > 0 && (
        <span className="text-xs">⚠️</span>
      )}
    </div>
  );
};

interface TrendChartsProps {
  records: BloodWorkRecord[];
  personalProfile?: PersonalProfile;
}

const TrendCharts: React.FC<TrendChartsProps> = ({ records, personalProfile }) => {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);
  
  // Group all lab values by name across all records with reference ranges
  const labValuesByName = new Map<string, Array<{ date: string; value: number; unit: string; flag?: string; referenceRange?: string }>>();

  records.forEach((record) => {
    record.labValues.forEach((labValue) => {
      const numericValue = parseFloat(labValue.value);
      if (!isNaN(numericValue)) {
        if (!labValuesByName.has(labValue.name)) {
          labValuesByName.set(labValue.name, []);
        }
        labValuesByName.get(labValue.name)!.push({
          date: record.date,
          value: numericValue,
          unit: labValue.unit,
          flag: labValue.flag,
          referenceRange: labValue.referenceRange,
        });
      }
    });
  });

  // Show ALL labs (not just those with multiple data points)
  const allBiomarkers = Array.from(labValuesByName.entries())
    .map(([name, values]) => {
      const sortedValues = values.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      const latestValue = sortedValues[sortedValues.length - 1];
      const previousValue = sortedValues.length > 1 ? sortedValues[sortedValues.length - 2] : null;
      
      // Determine status based on latest value
      let status: 'green' | 'yellow' | 'red' | 'none' = 'none';
      if (latestValue.flag) {
        if (latestValue.flag === 'HH' || latestValue.flag === 'LL' || latestValue.flag === 'CRIT') {
          status = 'red';
        } else if (latestValue.flag === 'H' || latestValue.flag === 'L') {
          status = 'yellow';
        }
      } else if (latestValue.referenceRange) {
        status = 'green';
      }
      
      // Calculate trend
      let trendPercent: number | null = null;
      let trendDirection: 'rising' | 'falling' | 'stable' | 'none' = 'none';
      
      if (previousValue && previousValue.value !== 0) {
        trendPercent = ((latestValue.value - previousValue.value) / previousValue.value) * 100;
        
        // Determine if trend is concerning based on flag and direction
        if (Math.abs(trendPercent) > 5) {
          trendDirection = trendPercent > 0 ? 'rising' : 'falling';
        } else {
          trendDirection = 'stable';
        }
      }
      
      return {
        name,
        values: sortedValues,
        status,
        latestValue: latestValue.value,
        latestUnit: latestValue.unit,
        trendPercent,
        trendDirection,
        dataPoints: values.length,
      };
    });

  // Sort by status (red → yellow → green → none), then alphabetically
  const statusOrder = { red: 0, yellow: 1, green: 2, none: 3 };
  allBiomarkers.sort((a, b) => {
    if (a.status !== b.status) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return a.name.localeCompare(b.name);
  });

  if (allBiomarkers.length === 0) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-sm text-slate-600">
        No biomarker data available yet.
      </div>
    );
  }

  const getStatusIcon = (status: 'green' | 'yellow' | 'red' | 'none') => {
    switch (status) {
      case 'red': return <AlertCircle size={16} className="text-red-600" />;
      case 'yellow': return <AlertTriangle size={16} className="text-amber-600" />;
      case 'green': return <div className="w-4 h-4 rounded-full bg-green-500" />;
      case 'none': return <div className="w-4 h-4 rounded-full bg-slate-300" />;
    }
  };

  const getTrendIcon = (direction: 'rising' | 'falling' | 'stable' | 'none', status: 'green' | 'yellow' | 'red' | 'none') => {
    if (direction === 'none') {
      return <span className="text-xs text-slate-400">First reading</span>;
    }
    if (direction === 'stable') {
      return <Minus size={16} className="text-slate-400" />;
    }
    
    // Color based on whether trend is concerning
    const isAbnormal = status === 'red' || status === 'yellow';
    const trendColor = isAbnormal ? 'text-red-600' : 'text-slate-600';
    
    return direction === 'rising' ? (
      <TrendingUp size={16} className={trendColor} />
    ) : (
      <TrendingDown size={16} className={trendColor} />
    );
  };

  const handleRowClick = (name: string) => {
    setExpandedMetric(expandedMetric === name ? null : name);
  };

  return (
    <div className="space-y-4">
      {/* Biomarkers List */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 grid grid-cols-12 gap-2 text-xs font-medium text-slate-600">
          <div className="col-span-1 text-center">Status</div>
          <div className="col-span-5">Biomarker</div>
          <div className="col-span-2 text-right">Latest Value</div>
          <div className="col-span-2 text-center">Trend</div>
          <div className="col-span-2 text-center">Data Points</div>
        </div>

        {/* Table Rows */}
        <div className="divide-y divide-slate-100">
          {allBiomarkers.map((biomarker) => {
            const isExpanded = expandedMetric === biomarker.name;
            const canShowChart = biomarker.dataPoints > 1;
            
            return (
              <React.Fragment key={biomarker.name}>
                <div
                  onClick={() => canShowChart && handleRowClick(biomarker.name)}
                  className={`px-4 py-3 grid grid-cols-12 gap-2 items-center transition-colors ${
                    canShowChart ? 'cursor-pointer hover:bg-slate-50' : 'cursor-default'
                  } ${isExpanded ? 'bg-indigo-50' : ''}`}
                >
                  {/* Status Icon */}
                  <div className="col-span-1 flex justify-center">
                    {getStatusIcon(biomarker.status)}
                  </div>
                  
                  {/* Biomarker Name */}
                  <div className="col-span-5">
                    <span className="text-sm font-medium text-slate-900">{biomarker.name}</span>
                  </div>
                  
                  {/* Latest Value */}
                  <div className="col-span-2 text-right">
                    <span className={`text-sm font-semibold ${
                      biomarker.status === 'red' ? 'text-red-700' :
                      biomarker.status === 'yellow' ? 'text-amber-700' :
                      'text-slate-900'
                    }`}>
                      {biomarker.latestValue.toFixed(2)} <span className="text-xs font-normal text-slate-500">{biomarker.latestUnit}</span>
                    </span>
                  </div>
                  
                  {/* Trend */}
                  <div className="col-span-2 flex items-center justify-center gap-1">
                    {getTrendIcon(biomarker.trendDirection, biomarker.status)}
                    {biomarker.trendPercent !== null && biomarker.trendDirection !== 'stable' && (
                      <span className={`text-xs font-medium ${
                        biomarker.status === 'red' || biomarker.status === 'yellow' 
                          ? 'text-red-700' 
                          : 'text-slate-600'
                      }`}>
                        {biomarker.trendPercent > 0 ? '+' : ''}{biomarker.trendPercent.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  
                  {/* Data Points */}
                  <div className="col-span-2 text-center">
                    <span className="text-xs text-slate-500">
                      {biomarker.dataPoints} {biomarker.dataPoints === 1 ? 'test' : 'tests'}
                    </span>
                  </div>
                </div>
                
                {/* Expanded Chart with animation */}
                {isExpanded && canShowChart && (
                  <div className="px-6 py-5 bg-gradient-to-br from-slate-50 to-white border-t border-slate-200 animate-in slide-in-from-top-2 duration-300">
                    <TrendChart 
                      key={biomarker.name} 
                      name={biomarker.name} 
                      values={biomarker.values}
                      personalProfile={personalProfile}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-xs font-medium bg-gradient-to-r from-slate-50 via-white to-slate-50 border border-slate-200 rounded-lg py-3 px-4 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500 shadow-sm border border-green-600" />
          <span className="text-slate-700">Normal</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-amber-600" />
          <span className="text-slate-700">Borderline</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-red-600" />
          <span className="text-slate-700">Abnormal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-slate-300 shadow-sm border border-slate-400" />
          <span className="text-slate-700">No reference range</span>
        </div>
      </div>
    </div>
  );
};

interface TrendChartProps {
  name: string;
  values: Array<{ date: string; value: number; flag?: string; referenceRange?: string }>;
  personalProfile?: PersonalProfile;
}

const TrendChart: React.FC<TrendChartProps> = ({ name, values, personalProfile }) => {
  // Parse reference range from the most recent value that has it
  const referenceRangeStr = values.find(v => v.referenceRange)?.referenceRange;
  let refMin: number | null = null;
  let refMax: number | null = null;
  
  if (referenceRangeStr) {
    // Clean up the string: remove common units and extra whitespace
    const cleaned = referenceRangeStr
      .replace(/\s*(mmol\/L|mg\/dL|g\/L|U\/L|IU\/L|µmol\/L|umol\/L)\s*/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Try various formats:
    // "3.5-5.2" or "3.5 - 5.2" or "3.5 -5.2" or "3.5- 5.2"
    const rangeMatch = cleaned.match(/([\d.]+)\s*[-–—]\s*([\d.]+)/);
    // "< 5.2" or "<5.2"
    const lessThanMatch = cleaned.match(/<\s*=?\s*([\d.]+)/);
    // "> 3.5" or ">3.5"
    const greaterThanMatch = cleaned.match(/>\s*=?\s*([\d.]+)/);
    // "3.5 to 5.2"
    const toMatch = cleaned.match(/([\d.]+)\s+to\s+([\d.]+)/i);
    
    if (rangeMatch) {
      refMin = parseFloat(rangeMatch[1]);
      refMax = parseFloat(rangeMatch[2]);
    } else if (toMatch) {
      refMin = parseFloat(toMatch[1]);
      refMax = parseFloat(toMatch[2]);
    } else if (lessThanMatch) {
      refMax = parseFloat(lessThanMatch[1]);
      refMin = 0; // Assume 0 as lower bound for "less than" ranges
    } else if (greaterThanMatch) {
      refMin = parseFloat(greaterThanMatch[1]);
    }
  }
  
  const dataMin = Math.min(...values.map((v) => v.value));
  const dataMax = Math.max(...values.map((v) => v.value));
  
  // Calculate Y-axis range with generous buffer (medical data visualization best practice)
  let scaledMin: number;
  let scaledMax: number;
  
  if (refMin !== null && refMax !== null) {
    // Use reference range with generous padding for context
    const refRange = refMax - refMin;
    const padding = refRange * 0.4; // 40% padding above/below reference range
    scaledMin = Math.max(0, refMin - padding);
    scaledMax = refMax + padding;
    
    // Extend if data goes beyond with 20% buffer
    const dataBuffer = (dataMax - dataMin) * 0.2;
    scaledMin = Math.min(scaledMin, dataMin - dataBuffer);
    scaledMax = Math.max(scaledMax, dataMax + dataBuffer);
  } else if (refMax !== null) {
    // Only upper limit - show context with buffer
    scaledMin = 0;
    const dataBuffer = dataMax * 0.25;
    scaledMax = Math.max(refMax * 1.5, dataMax + dataBuffer);
  } else if (refMin !== null) {
    // Only lower limit
    scaledMin = Math.max(0, refMin * 0.5);
    const dataBuffer = dataMax * 0.25;
    scaledMax = dataMax + dataBuffer;
  } else {
    // No reference range - use 25% buffer above/below data
    const range = dataMax - dataMin || 1;
    const padding = range * 0.25; // More generous buffer
    scaledMin = Math.max(0, dataMin - padding);
    scaledMax = dataMax + padding;
  }
  
  // Round to nice numbers for human readability
  const range = scaledMax - scaledMin;
  const magnitude = Math.pow(10, Math.floor(Math.log10(range)) - 1);
  scaledMin = Math.floor(scaledMin / magnitude) * magnitude;
  scaledMax = Math.ceil(scaledMax / magnitude) * magnitude;
  
  const scaledRange = scaledMax - scaledMin;

  const getY = (value: number) => {
    return ((scaledMax - value) / scaledRange) * 100;
  };

  const getLineColor = (flag?: string) => {
    if (flag === "HH" || flag === "LL" || flag === "CRIT") return "#ef4444";
    if (flag === "H" || flag === "L") return "#f59e0b";
    return "#3b82f6";
  };

  // Calculate Y-axis labels (5 ticks)
  const yAxisTicks = Array.from({ length: 5 }, (_, i) => {
    const value = scaledMin + (scaledRange * (4 - i) / 4);
    return value.toFixed(1);
  });

  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);

  return (
    <div className="bg-gradient-to-br from-white to-slate-50 border border-slate-200 rounded-lg shadow-sm p-4">
      <h3 className="text-base font-bold text-slate-900 mb-3">{name}</h3>
      
      {/* Chart with Axes */}
      <div className="flex gap-3">
        {/* Y-axis */}
        <div className="flex flex-col justify-between h-[180px] text-[10px] font-medium text-slate-600">
          {yAxisTicks.map((tick, idx) => (
            <div key={idx} className="text-right pr-2 w-12">{tick}</div>
          ))}
        </div>

        {/* Chart area */}
        <div className="flex-1">
          <div className="relative h-[180px] bg-white rounded-lg border border-slate-200 shadow-inner overflow-visible">
            <svg className="w-full h-full" viewBox="0 0 600 180" preserveAspectRatio="none">
              {/* Define gradients */}
              <defs>
                <linearGradient id="greenGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#dcfce7" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#bbf7d0" stopOpacity="0.6" />
                </linearGradient>
                <linearGradient id="amberGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fef3c7" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#fde68a" stopOpacity="0.5" />
                </linearGradient>
                <linearGradient id="redGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fee2e2" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#fecaca" stopOpacity="0.5" />
                </linearGradient>
                <filter id="dropShadow">
                  <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                  <feOffset dx="0" dy="2" result="offsetblur"/>
                  <feComponentTransfer>
                    <feFuncA type="linear" slope="0.3"/>
                  </feComponentTransfer>
                  <feMerge>
                    <feMergeNode/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Background zones for reference range */}
              {refMin !== null && refMax !== null && (
                <>
                  {/* Red zone (high abnormal) */}
                  <rect
                    x="0"
                    y="0"
                    width="600"
                    height={(getY(refMax * 1.1) / 100) * 180}
                    fill="url(#redGradient)"
                  />
                  
                  {/* Amber zone (high borderline) */}
                  <rect
                    x="0"
                    y={(getY(refMax * 1.1) / 100) * 180}
                    width="600"
                    height={((getY(refMax) - getY(refMax * 1.1)) / 100) * 180}
                    fill="url(#amberGradient)"
                  />
                  
                  {/* Green zone (normal range) */}
                  <rect
                    x="0"
                    y={(getY(refMax) / 100) * 180}
                    width="600"
                    height={((getY(refMin) - getY(refMax)) / 100) * 180}
                    fill="url(#greenGradient)"
                  />
                  
                  {/* Amber zone (low borderline) */}
                  {refMin > 0 && (
                    <rect
                      x="0"
                      y={(getY(refMin) / 100) * 180}
                      width="600"
                      height={((getY(refMin * 0.9) - getY(refMin)) / 100) * 180}
                      fill="url(#amberGradient)"
                    />
                  )}
                  
                  {/* Red zone (low abnormal) */}
                  {refMin > 0 && (
                    <rect
                      x="0"
                      y={(getY(refMin * 0.9) / 100) * 180}
                      width="600"
                      height={180 - (getY(refMin * 0.9) / 100) * 180}
                      fill="url(#redGradient)"
                    />
                  )}
                  
                  {/* Reference range boundary lines */}
                  <line
                    x1="0"
                    y1={(getY(refMax) / 100) * 180}
                    x2="600"
                    y2={(getY(refMax) / 100) * 180}
                    stroke="#059669"
                    strokeWidth="1.5"
                    strokeDasharray="6,3"
                    opacity="0.7"
                  />
                  <line
                    x1="0"
                    y1={(getY(refMin) / 100) * 180}
                    x2="600"
                    y2={(getY(refMin) / 100) * 180}
                    stroke="#059669"
                    strokeWidth="1.5"
                    strokeDasharray="6,3"
                    opacity="0.7"
                  />
                </>
              )}
              
              {/* Grid lines */}
              {yAxisTicks.map((_, idx) => {
                const y = (180 * idx) / 4;
                return (
                  <line
                    key={idx}
                    x1="0"
                    y1={y}
                    x2="600"
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="1"
                    opacity="0.6"
                  />
                );
              })}

              {/* Area under line (gradient fill) */}
              {values.length > 1 && (
                <defs>
                  <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              )}
              {values.length > 1 && (
                <polygon
                  points={
                    values
                      .map((item, idx) => {
                        const x = values.length === 1 ? 300 : (600 * idx) / (values.length - 1);
                        const y = (getY(item.value) / 100) * 180;
                        return `${x},${y}`;
                      })
                      .join(" ") +
                    ` 600,180 0,180`
                  }
                  fill="url(#areaGradient)"
                />
              )}

              {/* Line connecting points with shadow */}
              {values.length > 1 && (
                <>
                  {/* Shadow line */}
                  <polyline
                    points={values
                      .map((item, idx) => {
                        const x = values.length === 1 ? 300 : (600 * idx) / (values.length - 1);
                        const y = (getY(item.value) / 100) * 180 + 1.5;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    opacity="0.08"
                  />
                  {/* Main line */}
                  <polyline
                    points={values
                      .map((item, idx) => {
                        const x = values.length === 1 ? 300 : (600 * idx) / (values.length - 1);
                        const y = (getY(item.value) / 100) * 180;
                        return `${x},${y}`;
                      })
                      .join(" ")}
                    fill="none"
                    stroke="#2563eb"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </>
              )}

              {/* Data points with enhanced styling */}
              {values.map((item, idx) => {
                const x = values.length === 1 ? 300 : (600 * idx) / (values.length - 1);
                const y = (getY(item.value) / 100) * 180;
                const color = getLineColor(item.flag);
                const isAbnormal = item.flag !== undefined;
                const isHovered = hoveredPoint === idx;

                return (
                  <g key={idx}>
                    {/* Outer glow for abnormal values */}
                    {isAbnormal && (
                      <circle
                        cx={x}
                        cy={y}
                        r={isHovered ? "12" : "10"}
                        fill={color}
                        opacity="0.2"
                        className="transition-all duration-200"
                      />
                    )}
                    {/* Hover ring */}
                    {isHovered && (
                      <circle
                        cx={x}
                        cy={y}
                        r="10"
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        opacity="0.5"
                      />
                    )}
                    {/* Main point */}
                    <circle
                      cx={x}
                      cy={y}
                      r={isHovered ? "7" : isAbnormal ? "6" : "5"}
                      fill={color}
                      stroke="white"
                      strokeWidth="2.5"
                      filter="url(#dropShadow)"
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredPoint(idx)}
                      onMouseLeave={() => setHoveredPoint(null)}
                    />
                    {/* Center dot for depth */}
                    <circle
                      cx={x}
                      cy={y}
                      r="1.5"
                      fill="white"
                      opacity="0.8"
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </svg>
            
            {/* Hover tooltip - positioned above chart container */}
            {hoveredPoint !== null && (() => {
              const yPercent = getY(values[hoveredPoint].value);
              const xPercent = (hoveredPoint / (values.length - 1)) * 100;
              // Position above if point is in lower half, below if in upper half
              const positionAbove = yPercent > 50;
              
              return (
                <div 
                  className="absolute z-50 bg-slate-900 text-white px-2.5 py-1.5 rounded-md shadow-xl text-xs font-medium pointer-events-none whitespace-nowrap"
                  style={{
                    left: `${xPercent}%`,
                    [positionAbove ? 'bottom' : 'top']: '100%',
                    transform: `translateX(-50%) ${positionAbove ? 'translateY(-8px)' : 'translateY(8px)'}`,
                  }}
                >
                  <div className="text-[10px] text-slate-300">
                    {new Date(values[hoveredPoint].date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>
                  <div className="text-sm font-bold">{values[hoveredPoint].value.toFixed(2)}</div>
                  {values[hoveredPoint].flag && (
                    <div className="text-[10px] text-amber-300">Flag: {values[hoveredPoint].flag}</div>
                  )}
                </div>
              );
            })()}
          </div>
          
          {/* X-axis labels - positioned to align with data points */}
          <div className="relative mt-2 h-12">
            {values.map((item, idx) => {
              const xPercent = values.length === 1 ? 50 : (100 * idx) / (values.length - 1);
              return (
                <div 
                  key={idx} 
                  className="absolute flex flex-col items-center gap-0.5 group cursor-pointer"
                  style={{
                    left: `${xPercent}%`,
                    transform: 'translateX(-50%)',
                  }}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                >
                  <div className={`text-[10px] font-medium text-center transition-colors whitespace-nowrap ${
                    hoveredPoint === idx ? 'text-indigo-700' : 'text-slate-500'
                  }`}>
                    {new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className={`text-sm font-bold transition-colors ${
                    hoveredPoint === idx ? 'text-indigo-900' : 'text-slate-900'
                  }`}>
                    {item.value.toFixed(2)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-slate-200">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-slate-600 font-medium">
            Your Range: <span className="font-bold text-slate-900">{dataMin.toFixed(2)} - {dataMax.toFixed(2)}</span>
          </span>
          {values.some((v) => v.flag) && (
            <div className="text-amber-700 flex items-center gap-1 font-medium bg-amber-50 px-2 py-0.5 rounded-md text-[10px]">
              <AlertTriangle size={12} />
              Some values flagged
            </div>
          )}
        </div>
        
        {refMin !== null && refMax !== null && (
          <div className="space-y-2">
            <div className="flex items-center gap-4 text-[10px] font-medium">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-green-200 to-green-300 border border-green-400"></div>
                <span className="text-slate-700">Normal: {refMin} - {refMax}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-amber-200 to-amber-300 border border-amber-400"></div>
                <span className="text-slate-700">Borderline</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-gradient-to-br from-red-200 to-red-300 border border-red-400"></div>
                <span className="text-slate-700">Abnormal</span>
              </div>
            </div>
            
            {!personalProfile?.dateOfBirth || !personalProfile?.sex && (
              <div className="flex items-center gap-1.5 text-[10px] text-amber-800 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded px-2 py-1.5">
                <Info size={11} className="flex-shrink-0" />
                <span className="font-medium">Reference ranges shown are generic. Add your age/sex in profile settings for personalized ranges.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

interface ManualEntryModalProps {
  onClose: () => void;
  onSave: (record: BloodWorkRecord) => void;
}

const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ onClose, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [labName, setLabName] = useState("");
  const [labValues, setLabValues] = useState<LabValue[]>([
    { name: "", value: "", unit: "" }
  ]);

  const addLabValue = () => {
    setLabValues([...labValues, { name: "", value: "", unit: "" }]);
  };

  const updateLabValue = (index: number, field: keyof LabValue, value: string) => {
    const updated = [...labValues];
    updated[index] = { ...updated[index], [field]: value };
    setLabValues(updated);
  };

  const removeLabValue = (index: number) => {
    setLabValues(labValues.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    const validValues = labValues.filter(v => v.name && v.value && v.unit);
    
    if (validValues.length === 0) {
      alert("Please add at least one lab value");
      return;
    }

    const record: BloodWorkRecord = {
      id: generateId(),
      date,
      labName: labName || undefined,
      sourceType: "manual",
      labValues: validValues,
      createdAt: new Date().toISOString(),
    };

    onSave(record);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[600px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Manual Blood Work Entry
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Test Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Lab Name (optional)
            </label>
            <input
              type="text"
              value={labName}
              onChange={(e) => setLabName(e.target.value)}
              placeholder="e.g., LifeLabs"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Lab Values
              </label>
              <button
                onClick={addLabValue}
                className="text-sm text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
              >
                <Plus size={16} />
                Add Value
              </button>
            </div>

            <div className="space-y-3">
              {labValues.map((value, index) => (
                <div key={index} className="flex gap-2 items-start">
                  <input
                    type="text"
                    placeholder="Test name"
                    value={value.name}
                    onChange={(e) => updateLabValue(index, "name", e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Value"
                    value={value.value}
                    onChange={(e) => updateLabValue(index, "value", e.target.value)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  <input
                    type="text"
                    placeholder="Unit"
                    value={value.unit}
                    onChange={(e) => updateLabValue(index, "unit", e.target.value)}
                    className="w-24 px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  />
                  {labValues.length > 1 && (
                    <button
                      onClick={() => removeLabValue(index)}
                      className="p-2 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Blood Work
          </button>
        </div>
      </div>
    </div>
  );
};

interface WorkoutCardProps {
  workout: WorkoutRecord;
}

const WorkoutCard: React.FC<WorkoutCardProps> = ({ workout }) => {
  const date = new Date(workout.date);
  const formattedDate = date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const getWorkoutIcon = () => {
    switch (workout.type) {
      case "run":
        return "🏃";
      case "treadmill":
        return "🏃‍♂️";
      case "bike":
        return "🚴";
      case "walk":
        return "🚶";
      default:
        return "💪";
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-6 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl">
            {getWorkoutIcon()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-900">
                {formattedDate}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 capitalize">{workout.type}</p>
          </div>
        </div>

        {workout.sourceFileName && (
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
            {workout.sourceFileName}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {workout.distance && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {workout.distance.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mt-1">km</div>
          </div>
        )}

        {workout.duration && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">
              {Math.floor(workout.duration)}:{String(Math.round((workout.duration % 1) * 60)).padStart(2, "0")}
            </div>
            <div className="text-xs text-slate-500 mt-1">time</div>
          </div>
        )}

        {workout.pace && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-lg font-bold text-slate-900">{workout.pace}</div>
            <div className="text-xs text-slate-500 mt-1">pace</div>
          </div>
        )}

        {workout.calories && (
          <div className="text-center p-3 bg-slate-50 rounded-lg">
            <div className="text-2xl font-bold text-slate-900">{workout.calories}</div>
            <div className="text-xs text-slate-500 mt-1">cal</div>
          </div>
        )}
      </div>

      {workout.notes && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-600">{workout.notes}</p>
        </div>
      )}
    </div>
  );
};

interface WorkoutStatsProps {
  workouts: WorkoutRecord[];
}

const WorkoutStats: React.FC<WorkoutStatsProps> = ({ workouts }) => {
  const totalDistance = workouts.reduce((sum, w) => sum + (w.distance || 0), 0);
  const totalWorkouts = workouts.length;
  const totalCalories = workouts.reduce((sum, w) => sum + (w.calories || 0), 0);

  const avgDistance = totalWorkouts > 0 ? totalDistance / totalWorkouts : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-sm text-slate-500 mb-1">Total Workouts</div>
        <div className="text-3xl font-bold text-slate-900">{totalWorkouts}</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-sm text-slate-500 mb-1">Total Distance</div>
        <div className="text-3xl font-bold text-slate-900">{totalDistance.toFixed(1)}</div>
        <div className="text-xs text-slate-400 mt-1">km</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-sm text-slate-500 mb-1">Avg Distance</div>
        <div className="text-3xl font-bold text-slate-900">{avgDistance.toFixed(2)}</div>
        <div className="text-xs text-slate-400 mt-1">km per workout</div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <div className="text-sm text-slate-500 mb-1">Total Calories</div>
        <div className="text-3xl font-bold text-slate-900">{totalCalories.toLocaleString()}</div>
        <div className="text-xs text-slate-400 mt-1">burned</div>
      </div>
    </div>
  );
};

interface WorkoutEntryModalProps {
  onClose: () => void;
  onSave: (record: WorkoutRecord) => void;
}

const WorkoutEntryModal: React.FC<WorkoutEntryModalProps> = ({ onClose, onSave }) => {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [type, setType] = useState<WorkoutRecord["type"]>("run");
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [pace, setPace] = useState("");
  const [calories, setCalories] = useState("");
  const [notes, setNotes] = useState("");

  const handleSave = () => {
    const record: WorkoutRecord = {
      id: generateId(),
      date,
      type,
      distance: distance ? Number(distance) : undefined,
      duration: duration ? Number(duration) : undefined,
      pace: pace || undefined,
      calories: calories ? Number(calories) : undefined,
      notes: notes || undefined,
      sourceType: "manual",
      createdAt: new Date().toISOString(),
    };

    onSave(record);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl p-6 w-[500px] max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">
          Manual Workout Entry
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workout Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Workout Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as WorkoutRecord["type"])}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="run">Run</option>
              <option value="treadmill">Treadmill</option>
              <option value="bike">Bike</option>
              <option value="walk">Walk</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Distance (km)
              </label>
              <input
                type="number"
                step="0.01"
                value={distance}
                onChange={(e) => setDistance(e.target.value)}
                placeholder="5.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Duration (minutes)
              </label>
              <input
                type="number"
                step="0.01"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="30.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Pace
              </label>
              <input
                type="text"
                value={pace}
                onChange={(e) => setPace(e.target.value)}
                placeholder="6:02 min/km"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Calories
              </label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="375"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="How did it feel?"
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Workout
          </button>
        </div>
      </div>
    </div>
  );
};

// Personal Profile Modal for Age/Weight/Sex settings
interface PersonalProfileModalProps {
  profile?: PersonalProfile;
  onClose: () => void;
  onSave: (profile: PersonalProfile) => void;
}

const PersonalProfileModal: React.FC<PersonalProfileModalProps> = ({ profile, onClose, onSave }) => {
  const [dateOfBirth, setDateOfBirth] = useState(profile?.dateOfBirth || "");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">(profile?.sex || "");
  const [weight, setWeight] = useState(profile?.weight?.toString() || "");
  const [height, setHeight] = useState(profile?.height?.toString() || "");

  const calculateAge = (dob: string): number | null => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const age = calculateAge(dateOfBirth);

  const handleSave = () => {
    onSave({
      dateOfBirth: dateOfBirth || undefined,
      sex: sex || undefined,
      weight: weight ? parseFloat(weight) : undefined,
      height: height ? parseFloat(height) : undefined,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <User size={20} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Personal Profile</h2>
              <p className="text-sm text-slate-500">Used to personalize reference ranges</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Form Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date of Birth */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date of Birth
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {age !== null && (
                <p className="mt-1 text-xs text-slate-500">Age: {age} years</p>
              )}
            </div>

            {/* Sex */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Biological Sex
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "male" | "female" | "other" | "")}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Select...</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other/Prefer not to say</option>
              </select>
              <p className="mt-1 text-xs text-slate-500">Used for medical reference ranges</p>
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Weight (lbs)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="154"
                step="0.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {weight && (
                <p className="mt-1 text-xs text-slate-500">{(parseFloat(weight) / 2.20462).toFixed(1)} kg</p>
              )}
            </div>

            {/* Height */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="175"
                step="0.1"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {height && (
                <p className="mt-1 text-xs text-slate-500">
                  {Math.floor(parseFloat(height) / 2.54 / 12)}'{Math.round((parseFloat(height) / 2.54) % 12)}"
                </p>
              )}
            </div>
          </div>

          {/* BMI Calculation */}
          {weight && height && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm font-medium text-slate-700 mb-2">Body Mass Index (BMI)</p>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold text-slate-900">
                  {((parseFloat(weight) / 2.20462) / Math.pow(parseFloat(height) / 100, 2)).toFixed(1)}
                </span>
                <span className="text-sm text-slate-600">kg/m²</span>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-300 text-slate-600 rounded-lg hover:bg-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
};
