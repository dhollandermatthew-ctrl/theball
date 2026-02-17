// FILE: src/components/HealthView.tsx
import React, { useState, useRef } from "react";
import { Upload, Plus, FileText, Image as ImageIcon, Calendar, Trash2, Activity, Zap } from "lucide-react";
import { HealthData, BloodWorkRecord, LabValue, WorkoutRecord } from "@/domain/types";
import { generateId } from "@/domain/utils";
import { extractBloodWorkFromFile } from "@/domain/ai/bloodwork";
import { extractWorkoutFromImage } from "@/domain/ai/fitness";
import { tokenTracker } from "@/domain/tokenTracker";
import { TokenStatsModal } from "./TokenStatsModal";

interface HealthViewProps {
  healthData: HealthData;
  onUpdateHealthData: (data: HealthData) => void;
}

export const HealthView: React.FC<HealthViewProps> = ({
  healthData,
  onUpdateHealthData,
}) => {
  const [activeTab, setActiveTab] = useState<"bloodwork" | "fitness">("bloodwork");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [showWorkoutEntry, setShowWorkoutEntry] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const workoutFileInputRef = useRef<HTMLInputElement>(null);
  const [totalTokens, setTotalTokens] = React.useState(0);
  const [isStatsOpen, setIsStatsOpen] = React.useState(false);

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
      console.log("Processing file:", file.name);

      // Use Gemini Vision to extract blood work data
      const record = await extractBloodWorkFromFile(file);

      onUpdateHealthData({
        ...healthData,
        bloodWorkRecords: [record, ...(healthData.bloodWorkRecords || [])],
      });

      console.log("✅ Blood work added successfully");
    } catch (error) {
      console.error("Error processing file:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for quota errors
      if (errorMessage.includes("quota") || errorMessage.includes("429")) {
        setUploadError(
          "⚠️ API quota exceeded. The Gemini API free tier limit has been reached. You can manually add blood work records below, or wait for the quota to reset."
        );
      } else {
        setUploadError(
          `Failed to process file: ${errorMessage.substring(0, 200)}`
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
    onUpdateHealthData({
      ...healthData,
      bloodWorkRecords: [record, ...(healthData.bloodWorkRecords || [])],
    });
    setShowManualEntry(false);
  };

  const handleWorkoutUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const record = await extractWorkoutFromImage(file);

      onUpdateHealthData({
        ...healthData,
        workoutRecords: [record, ...(healthData.workoutRecords || [])],
      });

      console.log("✅ Workout added successfully");
    } catch (error) {
      console.error("Error processing workout:", error);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("quota") || errorMessage.includes("429")) {
        setUploadError(
          "⚠️ API quota exceeded. The Gemini API free tier limit has been reached. You can manually add workouts below."
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
    onUpdateHealthData({
      ...healthData,
      workoutRecords: [record, ...(healthData.workoutRecords || [])],
    });
    setShowWorkoutEntry(false);
  };

  const sortedRecords = [...(healthData.bloodWorkRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const sortedWorkouts = [...(healthData.workoutRecords || [])].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <>
      <TokenStatsModal isOpen={isStatsOpen} onClose={() => setIsStatsOpen(false)} />
      <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">Health</h1>
            <p className="text-sm text-slate-500 mt-1">
              Track your blood work and fitness metrics over time
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsStatsOpen(true)}
              className="flex items-center gap-2 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200 hover:border-amber-300 transition-all cursor-pointer"
              title="View token usage stats"
            >
              <Zap size={16} className="text-amber-600" />
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                {totalTokens.toLocaleString()}
              </span>
            </button>

            {activeTab === "bloodwork" ? (
            <div className="flex gap-2">
              <button
                onClick={() => setShowManualEntry(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Plus size={18} />
                Manual Entry
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                {isUploading ? "Processing..." : "Upload Blood Work"}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => setShowWorkoutEntry(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <Plus size={18} />
                Manual Entry
              </button>

              <button
                onClick={() => workoutFileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload size={18} />
                {isUploading ? "Processing..." : "Upload Workout"}
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

        {/* Tabs */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("bloodwork")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${ 
              activeTab === "bloodwork"
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <FileText size={16} className="inline mr-2" />
            Blood Work
          </button>
          <button
            onClick={() => setActiveTab("fitness")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "fitness"
                ? "bg-indigo-100 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Activity size={16} className="inline mr-2" />
            Fitness
          </button>
        </div>

        {uploadError && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {uploadError}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {sortedRecords.length === 0 ? (
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
            {/* Trend Charts Section */}
            {sortedRecords.length > 1 && (
              <div className="mb-8">
                <h2 className="text-lg font-semibold text-slate-900 mb-4">
                  Trends Over Time
                </h2>
                <TrendCharts records={sortedRecords} />
              </div>
            )}

            {/* Records List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-900">
                Blood Work History
              </h2>
              {sortedRecords.map((record) => (
                <BloodWorkCard key={record.id} record={record} />
              ))}
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
    </div>
    </>
  );
};

interface BloodWorkCardProps {
  record: BloodWorkRecord;
}

const BloodWorkCard: React.FC<BloodWorkCardProps> = ({ record }) => {
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

        {record.sourceFileName && (
          <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
            {record.sourceFileName}
          </span>
        )}
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

interface TrendChartsProps {
  records: BloodWorkRecord[];
}

const TrendCharts: React.FC<TrendChartsProps> = ({ records }) => {
  // Group all lab values by name across all records
  const labValuesByName = new Map<string, Array<{ date: string; value: number; flag?: string }>>();

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
          flag: labValue.flag,
        });
      }
    });
  });

  // Only show labs that have multiple data points
  const trendsToShow = Array.from(labValuesByName.entries())
    .filter(([_, values]) => values.length > 1)
    .map(([name, values]) => ({
      name,
      values: values.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    }));

  if (trendsToShow.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {trendsToShow.slice(0, 6).map((trend) => (
        <TrendChart key={trend.name} name={trend.name} values={trend.values} />
      ))}
    </div>
  );
};

interface TrendChartProps {
  name: string;
  values: Array<{ date: string; value: number; flag?: string }>;
}

const TrendChart: React.FC<TrendChartProps> = ({ name, values }) => {
  const minValue = Math.min(...values.map((v) => v.value));
  const maxValue = Math.max(...values.map((v) => v.value));
  const range = maxValue - minValue || 1;

  const getBarHeight = (value: number) => {
    return ((value - minValue) / range) * 100;
  };

  const getBarColor = (flag?: string) => {
    if (flag === "HH" || flag === "LL" || flag === "CRIT") return "bg-red-500";
    if (flag === "H" || flag === "L") return "bg-amber-500";
    return "bg-indigo-500";
  };

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-slate-900 mb-3">{name}</h3>
      <div className="flex items-end justify-between gap-2 h-32">
        {values.map((item, idx) => (
          <div key={idx} className="flex-1 flex flex-col items-center gap-1">
            <div className="relative w-full h-full flex items-end justify-center">
              <div
                className={`w-full ${getBarColor(item.flag)} rounded-t transition-all`}
                style={{ height: `${getBarHeight(item.value)}%` }}
                title={`${item.value} on ${new Date(item.date).toLocaleDateString()}`}
              />
            </div>
            <div className="text-xs text-slate-500 text-center">
              {new Date(item.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              })}
            </div>
            <div className="text-xs font-medium text-slate-700">{item.value}</div>
          </div>
        ))}
      </div>
      {values.some((v) => v.flag) && (
        <div className="mt-2 text-xs text-amber-600">
          ⚠️ Some values flagged
        </div>
      )}
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
