export type AtlasEvent =
  | {
      type: 'VOICE_STARTED'
    }
  | {
      type: 'VOICE_STOPPED'
    }
  | {
      type: 'THINKING_STARTED'
    }
  | {
      type: 'RESPONSE_STARTED'
    }
  | {
      type: 'RESPONSE_FINISHED'
    }
  | {
      type: 'TRANSCRIPT_DELTA'
      text: string
    }
  | {
      type: 'ERROR'
      message: string
    }
