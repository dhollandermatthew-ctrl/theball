export interface SpaceAgentLog {
    spaceId: string;
    question: string;
    meetingCount: number;
    noteCount: number;
    referencedMeetings: string[]; // meeting IDs
    timestamp: string;
  }

  export function logSpaceAgentInteraction(log: SpaceAgentLog) {
    console.debug("[SpaceAgent]", log);
  }