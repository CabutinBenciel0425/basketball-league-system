import { Status } from "@prisma/client";

const GAME_STATUS_TRANSITIONS = {
  UPCOMING: [Status.PLAYING, Status.CANCELLED],
  PLAYING: [Status.FINISHED, Status.CANCELLED],
  FINISHED: [],
  CANCELLED: [],
} as const satisfies Record<Status, readonly Status[]>;

const TERMINAL_STATE_SET = new Set<Status>([Status.FINISHED, Status.CANCELLED]);

type ValidationError = {
  field: string;
  message: string;
  code: string;
};

export type ValidationErrorGroup = {
  status?: ValidationError[];
  score?: ValidationError[];
  playerOfTheGame?: ValidationError[];
  cancellation?: ValidationError[];
  general?: ValidationError[];
};

type GameState = {
  status: Status;
  scoreA?: number | null;
  scoreB?: number | null;
};

export type GamePatch = {
  status?: Status;
  scoreA?: number | null;
  scoreB?: number | null;
};

export function validateStatusTransition(
  currentStatus: Status,
  nextStatus: Status,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!nextStatus) return [];
  if (currentStatus === nextStatus) return [];

  const allowed = GAME_STATUS_TRANSITIONS[currentStatus] as readonly Status[];

  if (!allowed.includes(nextStatus)) {
    errors.push({
      field: "status",
      message: `Cannot transition from ${currentStatus} to ${nextStatus}`,
      code: "INVALID_STATUS_TRANSITION",
    });
  }

  return errors;
}

export function validateScoreRules(
  nextState: GameState,
  patch: GamePatch,
): ValidationError[] {
  const errors: ValidationError[] = [];

  const hasScorePatch =
    patch.scoreA !== undefined || patch.scoreB !== undefined;

  if (!hasScorePatch) return [];

  if (nextState.status !== Status.FINISHED) {
    errors.push({
      field: "score",
      message: "Scores can only be set when game is FINISHED",
      code: "INVALID_SCORE_STATE",
    });
  }

  if (nextState.status === Status.FINISHED) {
    if (nextState.scoreA == null || nextState.scoreB == null) {
      errors.push({
        field: "score",
        message: "Both team scores are required when game is FINISHED",
        code: "MISSING_SCORE",
      });
    }
  }

  if (patch.scoreA != null && (patch.scoreA < 0 || patch.scoreA > 1000)) {
    errors.push({
      field: "scoreA",
      message: "Score A must be between 0 to 1000",
      code: "INVALID_SCORE_RANGE",
    });
  }

  if (patch.scoreB != null && (patch.scoreB < 0 || patch.scoreB > 1000)) {
    errors.push({
      field: "scoreB",
      message: "Score B must be between 0 to 1000",
      code: "INVALID_SCORE_RANGE",
    });
  }

  return errors;
}

export function validateGameTransition(
  currentGame: GameState,
  patch: GamePatch,
): ValidationErrorGroup | null {
  const hasPatch =
    patch.status !== undefined ||
    patch.scoreA !== undefined ||
    patch.scoreB !== undefined;

  if (!hasPatch) return null;

  if (TERMINAL_STATE_SET.has(currentGame.status)) {
    return {
      general: [
        {
          field: "game",
          message: "This game is locked and cannot be modified",
          code: "GAME_LOCKED",
        },
      ],
    };
  }

  const nextState = {
    status: patch.status ?? currentGame.status,
    scoreA: patch.scoreA ?? currentGame.scoreA,
    scoreB: patch.scoreB ?? currentGame.scoreB,
  };

  const grouped: ValidationErrorGroup = {};
  const statusErrors = validateStatusTransition(
    currentGame.status,
    nextState.status,
  );

  const scoreErrors = validateScoreRules(nextState, patch);

  if (statusErrors.length > 0) {
    grouped.status = statusErrors;
  }

  if (scoreErrors.length > 0) {
    grouped.score = scoreErrors;
  }

  if (Object.keys(grouped).length === 0) {
    return null;
  }

  return grouped;
}
