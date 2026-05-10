import asyncio
import re
from services.event_bus import event_bus


# --- Real HL7 v2.5.1 Validation Rule Definitions ---

# Required segments per message type (MSH-9)
REQUIRED_SEGMENTS = {
    "ADT^A01": ["MSH", "EVN", "PID", "PV1"],
    "ADT^A02": ["MSH", "EVN", "PID", "PV1"],
    "ADT^A03": ["MSH", "EVN", "PID", "PV1"],
    "ADT^A04": ["MSH", "EVN", "PID", "PV1"],
    "ADT^A08": ["MSH", "EVN", "PID", "PV1"],
    "ORU^R01": ["MSH", "PID", "OBR", "OBX"],
    "ORM^O01": ["MSH", "PID", "ORC", "OBR"],
    "SIU^S12": ["MSH", "SCH", "PID"],
    "MDM^T02": ["MSH", "EVN", "PID", "PV1", "TXA"],
    "VXU^V04": ["MSH", "PID", "RXA"],
}

# Required fields by segment (field_index, field_name, is_required)
REQUIRED_FIELDS = {
    "MSH": [
        (1, "Field Separator", True),
        (2, "Encoding Characters", True),
        (3, "Sending Application", True),
        (4, "Sending Facility", True),
        (5, "Receiving Application", True),
        (6, "Receiving Facility", True),
        (7, "Date/Time of Message", True),
        (9, "Message Type", True),
        (10, "Message Control ID", True),
        (11, "Processing ID", True),
        (12, "Version ID", True),
    ],
    "PID": [
        (1, "Set ID", False),
        (3, "Patient Identifier List", True),
        (5, "Patient Name", True),
    ],
    "PV1": [
        (1, "Set ID", False),
        (2, "Patient Class", True),
    ],
    "EVN": [
        (1, "Event Type Code", True),
        (2, "Recorded Date/Time", True),
    ],
    "OBR": [
        (1, "Set ID", False),
        (4, "Universal Service Identifier", True),
    ],
    "OBX": [
        (1, "Set ID", False),
        (2, "Value Type", True),
        (3, "Observation Identifier", True),
        (5, "Observation Value", True),
    ],
}

# HL7 Table 0001 - Administrative Sex
TABLE_0001_SEX = {"F", "M", "O", "U", "A", "N", ""}

# HL7 Table 0004 - Patient Class
TABLE_0004_PATIENT_CLASS = {"E", "I", "O", "P", "R", "B", "C", "N", "U", ""}

# HL7 Table 0103 - Processing ID
TABLE_0103_PROCESSING_ID = {"P", "T", "D", ""}

# HL7 Date/Time regex: YYYY[MM[DD[HH[MM[SS[.S[S[S[S]]]]]]]]][+/-ZZZZ]
HL7_DATETIME_PATTERN = re.compile(
    r"^\d{4}(\d{2}(\d{2}(\d{2}(\d{2}(\d{2}(\.\d{1,4})?)?)?)?)?)?([+-]\d{4})?$"
)


class HL7Validator:
    """
    Production-grade HL7 v2.x Validator.
    Checks:
      - Required segments per message type
      - Required fields per segment
      - Date/time format validation
      - Table value validation (sex, patient class, processing ID)
      - Segment cardinality rules
      - MSH internal consistency
    """

    def _get_message_type(self, ast: dict) -> str:
        """Extract message type from MSH-9 (e.g. 'ADT^A01')."""
        for seg in ast["segments"]:
            if seg["name"] == "MSH":
                if len(seg["fields"]) > 9:
                    return seg["fields"][9]["raw"]
        return ""

    def _validate_datetime(self, value: str) -> bool:
        """Validate HL7 date/time format."""
        if not value:
            return True  # Empty is allowed (field might be optional)
        return bool(HL7_DATETIME_PATTERN.match(value))

    async def validate(self, ast: dict) -> dict:
        await event_bus.publish(
            "EventType.PROC_START", "algorithm",
            "Validator cross-referencing against conformance profile", "INFO"
        )
        await asyncio.sleep(0.3)

        errors = []
        warnings = []
        segment_names = [seg["name"] for seg in ast["segments"]]

        # --- Rule 1: Message must have at least MSH ---
        if "MSH" not in segment_names:
            errors.append({
                "segment": "MSH", "field": 0, "rule": "STRUCT-001",
                "message": "MSH segment is missing. Every HL7 message must start with MSH."
            })
            await event_bus.publish("EventType.PROC_ERROR", "algorithm",
                                   "STRUCT-001: MSH segment missing", "ERROR")
            # Can't continue validation without MSH
            return {"status": "FAIL", "errors": errors, "warnings": warnings,
                    "rules_checked": 1, "rules_passed": 0}

        # --- Rule 2: Required segments per message type ---
        msg_type = self._get_message_type(ast)
        msg_type_clean = msg_type.replace("_", "^")  # Normalize ADT_A01 → ADT^A01

        rules_checked = 0
        rules_passed = 0

        if msg_type_clean in REQUIRED_SEGMENTS:
            required = REQUIRED_SEGMENTS[msg_type_clean]
            for req_seg in required:
                rules_checked += 1
                if req_seg not in segment_names:
                    errors.append({
                        "segment": req_seg, "field": 0, "rule": "STRUCT-002",
                        "message": f"{req_seg} segment is REQUIRED for {msg_type_clean} messages but is missing."
                    })
                else:
                    rules_passed += 1
        else:
            warnings.append({
                "segment": "MSH", "field": 9, "rule": "STRUCT-003",
                "message": f"Unknown message type '{msg_type}' — cannot verify required segment structure."
            })

        # --- Rule 3: Required fields per segment ---
        for seg in ast["segments"]:
            seg_name = seg["name"]
            if seg_name in REQUIRED_FIELDS:
                for field_idx, field_name, is_required in REQUIRED_FIELDS[seg_name]:
                    rules_checked += 1
                    if field_idx >= len(seg["fields"]):
                        if is_required:
                            errors.append({
                                "segment": seg_name, "field": field_idx, "rule": "FIELD-001",
                                "message": f"{seg_name}-{field_idx} ({field_name}) is required but missing."
                            })
                        else:
                            rules_passed += 1
                    elif is_required and not seg["fields"][field_idx]["raw"].strip():
                        errors.append({
                            "segment": seg_name, "field": field_idx, "rule": "FIELD-002",
                            "message": f"{seg_name}-{field_idx} ({field_name}) is required but empty."
                        })
                    else:
                        rules_passed += 1

        # --- Rule 4: Date/time format validation ---
        for seg in ast["segments"]:
            if seg["name"] == "MSH" and len(seg["fields"]) > 7:
                rules_checked += 1
                dt_val = seg["fields"][7]["raw"]
                if dt_val and not self._validate_datetime(dt_val):
                    errors.append({
                        "segment": "MSH", "field": 7, "rule": "DT-001",
                        "message": f"MSH-7 Date/Time '{dt_val}' is not a valid HL7 timestamp format (YYYYMMDDHHMMSS)."
                    })
                else:
                    rules_passed += 1

            if seg["name"] == "EVN" and len(seg["fields"]) > 2:
                rules_checked += 1
                dt_val = seg["fields"][2]["raw"]
                if dt_val and not self._validate_datetime(dt_val):
                    errors.append({
                        "segment": "EVN", "field": 2, "rule": "DT-002",
                        "message": f"EVN-2 Recorded Date/Time '{dt_val}' is not a valid HL7 timestamp."
                    })
                else:
                    rules_passed += 1

        # --- Rule 5: Table value checks ---
        for seg in ast["segments"]:
            # PID-8: Administrative Sex (Table 0001)
            if seg["name"] == "PID" and len(seg["fields"]) > 8:
                rules_checked += 1
                sex_val = seg["fields"][8]["raw"].strip()
                if sex_val and sex_val not in TABLE_0001_SEX:
                    errors.append({
                        "segment": "PID", "field": 8, "rule": "TABLE-001",
                        "message": f"PID-8 Sex '{sex_val}' is not a valid value from HL7 Table 0001 (expected: {', '.join(sorted(TABLE_0001_SEX - {''}))})"
                    })
                else:
                    rules_passed += 1

            # PV1-2: Patient Class (Table 0004)
            if seg["name"] == "PV1" and len(seg["fields"]) > 2:
                rules_checked += 1
                pc_val = seg["fields"][2]["raw"].strip()
                if pc_val and pc_val not in TABLE_0004_PATIENT_CLASS:
                    errors.append({
                        "segment": "PV1", "field": 2, "rule": "TABLE-002",
                        "message": f"PV1-2 Patient Class '{pc_val}' is not valid per HL7 Table 0004 (expected: {', '.join(sorted(TABLE_0004_PATIENT_CLASS - {''}))})"
                    })
                else:
                    rules_passed += 1

            # MSH-11: Processing ID (Table 0103)
            if seg["name"] == "MSH" and len(seg["fields"]) > 11:
                rules_checked += 1
                pid_val = seg["fields"][11]["raw"].strip()
                if pid_val and pid_val not in TABLE_0103_PROCESSING_ID:
                    errors.append({
                        "segment": "MSH", "field": 11, "rule": "TABLE-003",
                        "message": f"MSH-11 Processing ID '{pid_val}' is not valid per HL7 Table 0103 (expected: P, T, or D)"
                    })
                else:
                    rules_passed += 1

        # --- Rule 6: Segment ordering sanity check ---
        rules_checked += 1
        if segment_names[0] != "MSH":
            errors.append({
                "segment": segment_names[0], "field": 0, "rule": "ORDER-001",
                "message": "First segment must be MSH."
            })
        else:
            rules_passed += 1

        # --- Rule 7: Duplicate segment warnings ---
        singleton_segments = {"MSH", "EVN", "PID", "PD1", "PV1", "PV2"}
        from collections import Counter
        seg_counts = Counter(segment_names)
        for seg_name, count in seg_counts.items():
            if seg_name in singleton_segments and count > 1:
                rules_checked += 1
                warnings.append({
                    "segment": seg_name, "field": 0, "rule": "CARD-001",
                    "message": f"{seg_name} segment appears {count} times but should appear at most once."
                })

        # --- Rule 8: MSH-12 version check ---
        for seg in ast["segments"]:
            if seg["name"] == "MSH" and len(seg["fields"]) > 12:
                rules_checked += 1
                version = seg["fields"][12]["raw"].strip()
                supported_versions = {"2.1", "2.2", "2.3", "2.3.1", "2.4", "2.5", "2.5.1", "2.6", "2.7", "2.8"}
                if version and version not in supported_versions:
                    warnings.append({
                        "segment": "MSH", "field": 12, "rule": "VER-001",
                        "message": f"MSH-12 Version ID '{version}' is not a recognized HL7 v2 version."
                    })
                else:
                    rules_passed += 1

        await asyncio.sleep(0.3)

        if len(errors) == 0:
            await event_bus.publish("EventType.PROC_COMPLETE", "algorithm",
                                   f"Validation PASSED — {rules_checked} rules checked, 0 errors, {len(warnings)} warnings", "INFO")
            status = "PASS"
        else:
            await event_bus.publish("EventType.PROC_COMPLETE", "algorithm",
                                   f"Validation FAILED — {rules_checked} rules checked, {len(errors)} errors, {len(warnings)} warnings", "ERROR")
            status = "FAIL"

        return {
            "status": status,
            "errors": errors,
            "warnings": warnings,
            "rules_checked": rules_checked,
            "rules_passed": rules_passed,
        }


validator = HL7Validator()
