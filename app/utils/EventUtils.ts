import type { Team, Player, Event } from "~/types/tracker";
import { jsPDF } from "jspdf";
import { formatTime } from "./TimeUtils";

function displayTeamName(name: string): string {
    return name.replace(/\s+J\d+$/, "");
}

/**
 * Create an event for a player action
 */
export function createPlayerEvent(
    type: string,
    currentTime: number,
    team: Team,
    player: Player | undefined,
    playerNumber: number | undefined,
    concussion: boolean
): Event {
    return {
        type,
        time: currentTime,
        team,
        player,
        playerNumber,
        concussion,
    };
}

/**
 * Create a substitution event
 */
export function createSubstitutionEvent(
    currentTime: number,
    team: Team,
    playerOut: Player | undefined,
    playerIn: Player | undefined,
    concussion: boolean
): Event {
    return {
        type: "Changement",
        time: currentTime,
        team,
        playerOut,
        playerIn,
        concussion,
    };
}

/**
 * Find player number in team composition
 */
export function findPlayerNumberInTeam(team: Team, playerId: string): number | undefined {
    const entry = [...team.starters, ...team.substitutes].find(
        (ent) => ent.player.id === playerId
    );
    return entry?.number;
}

/**
 * Export events summary to clipboard as text
 */
export function exportSummaryToClipboard(
    events: Event[],
    currentTime: number,
    summary: Record<string, number>
): void {
    const lines = [`Feuille de match (time ${formatTime(currentTime)})`];
    
    for (const [type, count] of Object.entries(summary)) {
        lines.push(`${type}: ${count}`);
    }
    
    lines.push("\nEvent timeline:");
    events.forEach((e) => {
        if (e.summary) {
            lines.push(`${formatTime(e.time)} - ${e.summary}`);
        } else {
            let line = `${formatTime(e.time)} - ${e.type}`;
            if (e.team) line += ` (${displayTeamName(e.team.name)})`;
            if (e.player)
                line += ` — ${e.player.name}${e.playerNumber ? ` (#${e.playerNumber})` : ""}`;
            if (e.playerOut && e.playerIn)
                line += ` — ${e.playerOut.name} → ${e.playerIn.name}`;
            if (e.videoReason)
                line += ` — TMO - ${e.videoReason}`;
            if (e.concussion) line += " 🚨 commotion";
            lines.push(line);
        }
    });
    
    const text = lines.join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    alert("Ajouté au presse-papier !");
}

/**
 * Export events summary to PDF file
 */
export function exportSummaryToPdf(
    events: Event[],
    currentTime: number,
    summary: Record<string, number>
): void {
    const doc = new jsPDF();
    let y = 10;
    doc.setFontSize(12);
    doc.text(`Feuille de match (time ${formatTime(currentTime)})`, 10, y);
    y += 10;
    
    for (const [type, count] of Object.entries(summary)) {
        doc.text(`${type}: ${count}`, 10, y);
        y += 7;
    }
    
    y += 5;
    doc.text("Event timeline:", 10, y);
    y += 7;
    
    events.forEach((e) => {
        if (e.summary) {
            doc.text(`${formatTime(e.time)} - ${e.summary}`, 10, y);
        } else {
            let line = `${formatTime(e.time)} - ${e.type}`;
            if (e.team) line += ` (${displayTeamName(e.team.name)})`;
            if (e.player)
                line += ` — ${e.player.name}${e.playerNumber ? ` (#${e.playerNumber})` : ""}`;
            if (e.playerOut && e.playerIn)
                line += ` — ${e.playerOut.name} → ${e.playerIn.name}`;
            if (e.videoReason)
                line += ` — TMO - ${e.videoReason}`;
            if (e.concussion) line += " 🚨 commotion";
            doc.text(line, 10, y);
        }
        y += 7;
        if (y > 280) {
            doc.addPage();
            y = 10;
        }
    });
    
    doc.save("summary.pdf");
}

/**
 * Build event summary (count by type)
 */
export function buildEventSummary(events: Event[]): Record<string, number> {
    return events.reduce((acc, e) => {
        acc[e.type] = (acc[e.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
}

export function buildDetailedEventSummary(events: Event[]): Array<{
    type: string;
    team?: string;
    videoReason?: string;
    player?: string;
    playerNumber?: number;
    playerOut?: string;
    playerIn?: string;
    concussion?: boolean;
    summary?: string;
}> {
    return events.map((e) => ({
        type: e.type,
        team: e.team ? displayTeamName(e.team.name) : undefined,
        videoReason: e.videoReason,
        player: e.player?.name,
        playerNumber: e.playerNumber,
        playerOut: e.playerOut?.name,
        playerIn: e.playerIn?.name,
        concussion: e.concussion,
        summary: e.summary,
    }));
}
