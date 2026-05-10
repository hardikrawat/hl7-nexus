import asyncio
from services.event_bus import event_bus


class HL7Lexer:
    """
    Production-grade HL7 v2.x Lexer.
    Handles:
      - CR (\r), LF (\n), and CRLF (\r\n) segment terminators
      - MSH-1 / MSH-2 special field handling per HL7 spec
      - Input bounds validation
      - Custom delimiter detection from MSH header
    """

    def _normalize_line_endings(self, message: str) -> str:
        """Convert all HL7 segment terminators to \n for uniform processing."""
        return message.replace('\r\n', '\n').replace('\r', '\n')

    async def tokenize(self, message: str) -> dict:
        await event_bus.publish("EventType.PROC_START", "algorithm", "Lexer process started", "INFO")

        # Artificial delay for UI visibility
        await asyncio.sleep(0.3)

        # Normalize line endings (real HL7 uses \r as segment terminator)
        message = self._normalize_line_endings(message.strip())

        # --- C-01: Bounds validation ---
        if not message:
            error_msg = "Empty message received"
            await event_bus.publish("EventType.PROC_ERROR", "algorithm", error_msg, "ERROR")
            raise ValueError(error_msg)

        if not message.startswith("MSH"):
            error_msg = "Message must start with MSH segment"
            await event_bus.publish("EventType.PROC_ERROR", "algorithm", error_msg, "ERROR")
            raise ValueError(error_msg)

        if len(message) < 8:
            error_msg = f"MSH segment too short (need at least 8 chars for delimiters, got {len(message)})"
            await event_bus.publish("EventType.PROC_ERROR", "algorithm", error_msg, "ERROR")
            raise ValueError(error_msg)

        # --- Detect delimiters from MSH header ---
        # Per HL7 spec: MSH|^~\&|...
        # Position 3 = field separator (|)
        # Positions 4-7 = encoding characters: component(^), repetition(~), escape(\), subcomponent(&)
        field_sep = message[3]
        encoding_chars = message[4:8]  # e.g. ^~\&

        comp_sep = encoding_chars[0] if len(encoding_chars) > 0 else '^'
        rep_sep = encoding_chars[1] if len(encoding_chars) > 1 else '~'
        esc_char = encoding_chars[2] if len(encoding_chars) > 2 else '\\'
        subcomp_sep = encoding_chars[3] if len(encoding_chars) > 3 else '&'

        delimiters = {
            "field": field_sep,
            "component": comp_sep,
            "repetition": rep_sep,
            "escape": esc_char,
            "subcomponent": subcomp_sep
        }

        await event_bus.publish("EventType.PROC_PROGRESS", "algorithm", f"Delimiters detected: {delimiters}", "INFO")

        lines = [line.strip() for line in message.split('\n') if line.strip()]

        tokens = []
        for line in lines:
            segment_name = line[:3]
            raw_fields = line.split(field_sep)

            if segment_name == "MSH":
                # --- C-02: Correct MSH field handling per HL7 spec ---
                # After splitting "MSH|^~\&|NEXUS|..." on "|":
                #   raw_fields[0] = "MSH"     (segment name, not a real field)
                #   raw_fields[1] = "^~\&"     (MSH-2: encoding characters)
                #   raw_fields[2] = "NEXUS"    (MSH-3: sending application)
                #   ... etc
                #
                # Per spec: MSH-1 IS the field separator character itself (|)
                #           MSH-2 IS the encoding characters (^~\&)
                # We construct the fields array as: [MSH, |, ^~\&, NEXUS, ...]
                #   Index 0 = segment name "MSH"
                #   Index 1 = MSH-1 (field separator)
                #   Index 2 = MSH-2 (encoding chars)
                #   Index 3+ = MSH-3+ (real fields)
                fields = ["MSH", field_sep] + raw_fields[1:]
            else:
                fields = raw_fields

            tokens.append({
                "segment": segment_name,
                "fields": fields
            })

        await asyncio.sleep(0.3)

        await event_bus.publish(
            "EventType.PROC_COMPLETE",
            "algorithm",
            f"Lexing complete. Found {len(tokens)} segments.",
            "INFO"
        )

        return {
            "delimiters": delimiters,
            "tokens": tokens,
            "raw_lines": lines
        }


lexer = HL7Lexer()
