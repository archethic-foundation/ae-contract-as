import { sendError } from "./output";
import { JSON } from "json-as/assembly";

@json
class ErrorContainer {
  message!: string;
  metadata!: ErrorMetadata;
}

@json
class ErrorMetadata {
  line: u32;
  column: u32;
  fileName!: string;
}

export function abort(
  message: string | null,
  fileName: string,
  line: u32,
  column: u32,
): void {
  if (message != null) {
    sendError(
      JSON.stringify<ErrorContainer>({
        message: message,
        metadata: {
          line: line,
          column: column,
          fileName: fileName,
        },
      }),
    );
  }
}
