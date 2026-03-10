import { faArrowRotateLeft, faCheck, faHourglassEnd, faHourglassStart, faPause, faPlay, faStop } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface Props {
  time: number;
  running: boolean;
  onStartStop: () => void;
  onAdjust: (delta: number) => void;
  onReset: () => void;
  manualTimeInput: string;
  onManualTimeInputChange: (value: string) => void;
  onApplyManualTime: () => void;
  currentHalf: 1 | 2;
  matchEnded: boolean;
  onSetFirstHalf: () => void;
  onSetSecondHalf: () => void;
  onEndMatch: () => void;
}

export default function TimerControls({
  time,
  running,
  onStartStop,
  onAdjust,
  onReset,
  manualTimeInput,
  onManualTimeInputChange,
  onApplyManualTime,
  currentHalf,
  matchEnded,
  onSetFirstHalf,
  onSetSecondHalf,
  onEndMatch,
}: Props) {

  return (
    <section className="space-y-2 w-full max-w-full">
      <div className="flex flex-wrap items-center gap-2 justify-center">
        <button
          className={`px-4 py-2 text-white rounded shrink-0 ${running ? "bg-gradient-to-br from-orange-500 to-orange-600" : "bg-gradient-to-br from-green-400 to-green-600"}`}
          onClick={onStartStop}
        >
          {running ? (
            <>
              <FontAwesomeIcon icon={faPause} className="sm:mr-2" />
              <span className="hidden sm:inline">Pause</span>
            </>
          ) : (
            <>
              <FontAwesomeIcon icon={faPlay} className="sm:mr-2" />
              <span className="hidden sm:inline">Départ</span>
            </>
          )}
        </button>
        <button
          id="halfSelect"
          className={`px-4 py-2 rounded shrink-0 ${
            currentHalf === 1 ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white" : "bg-gradient-to-br from-gray-700 to-gray-900 text-gray-300 hover:bg-gray-800"
          }`}
          onClick={onSetFirstHalf}
        >
          <FontAwesomeIcon icon={faHourglassStart} className="sm:mr-2" />
          <span className="hidden sm:inline">1ère</span>
        </button>
        <button
          className={`px-4 py-2 rounded shrink-0 ${
            currentHalf === 2 ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white" : "bg-gradient-to-br from-gray-700 to-gray-900 text-gray-300 hover:bg-gray-800"
          }`}
          onClick={onSetSecondHalf}
          disabled={currentHalf === 2 || matchEnded}
        >
          <FontAwesomeIcon icon={faHourglassEnd} className="sm:mr-2" />
          <span className="hidden sm:inline">2ème</span>
        </button>
        <button
          className={`px-4 py-2 rounded shrink-0 ${
            matchEnded ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700": "bg-gradient-to-br from-red-600 to-red-700 text-white"
          }`}
          onClick={onEndMatch}
          disabled={matchEnded || currentHalf === 1}
        >
          <FontAwesomeIcon icon={faStop} className="sm:mr-2" />
          <span className="hidden sm:inline">Fin de match</span>
        </button>
        <button
          className="border-neutral-700 bg-gradient-to-br from-neutral-900 to-neutral-800 text-neutral-300 hover:bg-neutral-800 rounded px-4 py-2 shrink-0"
          onClick={onReset}
        >
          <FontAwesomeIcon icon={faArrowRotateLeft} className="sm:mr-2" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className="border border-neutral-700 rounded p-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="manualTimeInput" className="font-semibold">Timecode</label>
          <input
            id="manualTimeInput"
            type="text"
            placeholder="05:30"
            className="text-base p-2 flex-1 min-w-0"
            value={manualTimeInput}
            onChange={(e) => onManualTimeInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyManualTime()}
          />
          <button
            id="applyManualTimeButton"
            className="px-4 py-2 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded hover:bg-blue-700"
            onClick={onApplyManualTime}
          >
            <FontAwesomeIcon icon={faCheck} className="sm:mr-2" />
            <span className="hidden sm:inline">Appliquer</span>
          </button>
        </div>
      </div>
    </section>
  );
}
