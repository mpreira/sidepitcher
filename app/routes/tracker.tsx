import { useEffect, useState } from "react";
import type { Route } from "./+types/tracker";
import type { Event } from "./tracker.types";

import TimerControls from "~/components/TimerControls";
import CommandPanel from "~/components/CommandPanel";
import EventForm from "~/components/EventForm";
import EventsList from "~/components/EventsList";
import Summary from "~/components/Summary";
import { useTeams } from "~/context/TeamsContext";

export function meta({}: Route.MetaArgs) {
    return [{ title: "Side Pitcher" }];
}

const COMMAND_TYPES = [
    "Essai",
    "Pénalité",
    "Transformation",
    "Drop",
    "Carton jaune",
    "Carton rouge",
    "Carton orange",
    "Changement",
];

export default function Tracker() {
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [events, setEvents] = useState<Event[]>([]);
    const { rosters, activeRosterId } = useTeams();
    const activeRoster = rosters.find((r) => r.id === activeRosterId) ?? null;
    const teams = activeRoster?.teams ?? [];
    const [activeCommand, setActiveCommand] = useState<string | null>(null);

// timer interval
    useEffect(() => {
        let handle: number;
        if (running) {
            handle = window.setInterval(() => setTime((t) => t + 1), 1000);
        }
        return () => {
            if (handle) window.clearInterval(handle);
        };
    }, [running]);

    function addEvent(e: Event) {
        setEvents((ev) => [...ev, e]);
        setActiveCommand(null);
    }

    function removeEvent(index: number) {
        setEvents((ev) => ev.filter((_, i) => i !== index));
    }

    function adjustTime(delta: number) {
        setTime((t) => Math.max(0, t + delta));
    }

    return (
        <main className="p-6 space-y-6 max-w-screen-md mx-auto px-4">
            <h1 className="text-2xl font-bold">Rugby Match Tracker</h1>

            {!activeRoster && (
                <p className="text-red-600">
                    Aucun roster actif. Allez sur la page « Rosters » pour en sélectionner un ou en créer un.
                </p>
            )}

            <TimerControls
                time={time}
                running={running}
                onStartStop={() => setRunning((r) => !r)}
                onAdjust={adjustTime}
                onReset={() => setTime(0)}
            />

            <CommandPanel
                types={COMMAND_TYPES}
                onSelect={(type) => setActiveCommand(type)}
            />

            {activeCommand && (
                <EventForm
                type={activeCommand}
                teams={teams}
                currentTime={time}
                onSubmit={addEvent}
                onCancel={() => setActiveCommand(null)}
                />
            )}

            <section className="space-y-2">
                <h2 className="font-semibold">Events</h2>
                <EventsList events={events} remove={removeEvent} />
            </section>

            <Summary events={events} currentTime={time} />
        </main>
    );
}
