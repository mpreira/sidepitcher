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
          className={`sp-button sp-button-md shrink-0 ${running ? "sp-button-orange" : "sp-button-green"}`}
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
          className={`sp-button sp-button-md shrink-0 ${
            currentHalf === 1 ? "sp-button-blue" : "sp-button-neutral"
          }`}
          onClick={onSetFirstHalf}
        >
          <FontAwesomeIcon icon={faHourglassStart} className="sm:mr-2" />
          <span className="hidden sm:inline">1ère</span>
        </button>
        <button
          className={`sp-button sp-button-md shrink-0 ${
            currentHalf === 2 ? "sp-button-blue" : "sp-button-neutral"
          }`}
          onClick={onSetSecondHalf}
          disabled={currentHalf === 2 || matchEnded}
        >
          <FontAwesomeIcon icon={faHourglassEnd} className="sm:mr-2" />
          <span className="hidden sm:inline">2ème</span>
        </button>
        <button
          className={`sp-button sp-button-md shrink-0 ${
            matchEnded ? "sp-button-light" : "sp-button-red"
          }`}
          onClick={onEndMatch}
          disabled={matchEnded || currentHalf === 1}
        >
          <FontAwesomeIcon icon={faStop} className="sm:mr-2" />
          <span className="hidden sm:inline">Fin de match</span>
        </button>
        <button
          className="sp-button sp-button-md sp-button-neutral shrink-0"
          onClick={onReset}
        >
          <FontAwesomeIcon icon={faArrowRotateLeft} className="sm:mr-2" />
          <span className="hidden sm:inline">Reset</span>
        </button>
      </div>

      <div className="sp-input-shell mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="manualTimeInput" className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-neutral-400">Timecode</label>
          <input
            id="manualTimeInput"
            type="text"
            placeholder="05:30"
            className="sp-input-control flex-1 min-w-[8rem] pt-[9px]"
            value={manualTimeInput}
            onChange={(e) => onManualTimeInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onApplyManualTime()}
          />
          <button
            id="applyManualTimeButton"
            className="sp-button sp-button-md sp-button-blue self-center shrink-0"
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
