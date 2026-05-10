import asyncio
from services.event_bus import event_bus


class FhirBridge:
    """
    Production-grade HL7 v2 → FHIR R4 conversion bridge.
    Maps:
      - MSH → MessageHeader
      - PID → Patient
      - PV1 → Encounter
      - OBX → Observation
    """

    def _extract_field(self, seg: dict, index: int, default: str = "") -> str:
        """Safely extract a field value from a parsed segment."""
        if index < len(seg["fields"]):
            return seg["fields"][index]["raw"]
        return default

    def _build_patient(self, pid_seg: dict) -> dict:
        """Convert PID segment to FHIR Patient resource."""
        patient_id = self._extract_field(pid_seg, 3)
        name_raw = self._extract_field(pid_seg, 5)
        dob_raw = self._extract_field(pid_seg, 7)
        sex_raw = self._extract_field(pid_seg, 8)

        # Parse name components (LAST^FIRST^MIDDLE)
        name_parts = name_raw.split("^") if name_raw else []
        family = name_parts[0] if len(name_parts) > 0 else "Unknown"
        given = [name_parts[1]] if len(name_parts) > 1 else []

        # Map HL7 sex to FHIR gender
        gender_map = {"M": "male", "F": "female", "O": "other", "U": "unknown", "A": "other", "N": "unknown"}
        gender = gender_map.get(sex_raw, "unknown")

        # Format DOB (HL7 YYYYMMDD → FHIR YYYY-MM-DD)
        birth_date = None
        if dob_raw and len(dob_raw) >= 8:
            birth_date = f"{dob_raw[:4]}-{dob_raw[4:6]}-{dob_raw[6:8]}"

        # Parse patient ID (ID^^^Authority)
        id_parts = patient_id.split("^") if patient_id else []
        identifier_value = id_parts[0] if id_parts else patient_id

        resource = {
            "resourceType": "Patient",
            "id": identifier_value or "unknown",
            "identifier": [{
                "use": "usual",
                "type": {"coding": [{"system": "http://terminology.hl7.org/CodeSystem/v2-0203", "code": "MR"}]},
                "value": identifier_value
            }],
            "name": [{
                "use": "official",
                "family": family,
                "given": given
            }],
            "gender": gender,
        }

        if birth_date:
            resource["birthDate"] = birth_date

        return resource

    def _build_encounter(self, pv1_seg: dict) -> dict:
        """Convert PV1 segment to FHIR Encounter resource."""
        patient_class = self._extract_field(pv1_seg, 2)
        location_raw = self._extract_field(pv1_seg, 3)

        # Map HL7 patient class to FHIR encounter class
        class_map = {
            "I": {"code": "IMP", "display": "Inpatient"},
            "O": {"code": "AMB", "display": "Ambulatory"},
            "E": {"code": "EMER", "display": "Emergency"},
            "P": {"code": "PRENC", "display": "Pre-admission"},
        }
        enc_class = class_map.get(patient_class, {"code": "AMB", "display": "Ambulatory"})

        # Parse location (WARD^ROOM^BED)
        loc_parts = location_raw.split("^") if location_raw else []

        resource = {
            "resourceType": "Encounter",
            "id": "encounter-1",
            "status": "in-progress",
            "class": {
                "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
                "code": enc_class["code"],
                "display": enc_class["display"]
            },
        }

        if loc_parts:
            resource["location"] = [{
                "location": {
                    "display": " / ".join([p for p in loc_parts if p])
                },
                "status": "active"
            }]

        return resource

    def _build_message_header(self, msh_seg: dict) -> dict:
        """Convert MSH segment to FHIR MessageHeader resource."""
        sending_app = self._extract_field(msh_seg, 3)
        sending_fac = self._extract_field(msh_seg, 4)
        receiving_app = self._extract_field(msh_seg, 5)
        msg_type = self._extract_field(msh_seg, 9)
        control_id = self._extract_field(msh_seg, 10)

        return {
            "resourceType": "MessageHeader",
            "id": control_id or "msg-header-1",
            "eventCoding": {
                "system": "http://terminology.hl7.org/CodeSystem/v2-0003",
                "code": msg_type,
            },
            "source": {
                "name": sending_app,
                "endpoint": f"urn:oid:facility:{sending_fac}"
            },
            "destination": [{
                "name": receiving_app,
                "endpoint": f"urn:oid:facility:{receiving_app}"
            }]
        }

    def _build_observation(self, obx_seg: dict) -> dict:
        """Convert OBX segment to FHIR Observation resource."""
        value_type = self._extract_field(obx_seg, 2)
        obs_id_raw = self._extract_field(obx_seg, 3)
        obs_value = self._extract_field(obx_seg, 5)
        units = self._extract_field(obx_seg, 6)
        ref_range = self._extract_field(obx_seg, 7)

        # Parse observation identifier (CODE^DISPLAY)
        obs_parts = obs_id_raw.split("^") if obs_id_raw else []
        obs_code = obs_parts[0] if obs_parts else obs_id_raw
        obs_display = obs_parts[1] if len(obs_parts) > 1 else obs_code

        resource = {
            "resourceType": "Observation",
            "id": f"obs-{obs_code}",
            "status": "final",
            "code": {
                "coding": [{"code": obs_code, "display": obs_display}],
                "text": obs_display
            },
        }

        # Handle numeric values
        if value_type == "NM":
            try:
                resource["valueQuantity"] = {
                    "value": float(obs_value),
                    "unit": units,
                    "system": "http://unitsofmeasure.org"
                }
            except (ValueError, TypeError):
                resource["valueString"] = obs_value
        else:
            resource["valueString"] = obs_value

        if ref_range:
            parts = ref_range.split("-")
            if len(parts) == 2:
                try:
                    resource["referenceRange"] = [{
                        "low": {"value": float(parts[0]), "unit": units},
                        "high": {"value": float(parts[1]), "unit": units}
                    }]
                except ValueError:
                    resource["referenceRange"] = [{"text": ref_range}]

        return resource

    async def to_fhir(self, hl7_ast: dict) -> dict:
        await event_bus.publish(
            "EventType.PROC_START", "algorithm",
            "Initiating FHIR R4 bridge conversion...", "INFO"
        )
        await asyncio.sleep(0.3)

        entries = []

        for seg in hl7_ast["segments"]:
            seg_name = seg["name"]

            if seg_name == "MSH":
                entries.append({
                    "resource": self._build_message_header(seg),
                    "request": {"method": "POST", "url": "MessageHeader"}
                })
            elif seg_name == "PID":
                entries.append({
                    "resource": self._build_patient(seg),
                    "request": {"method": "POST", "url": "Patient"}
                })
            elif seg_name == "PV1":
                entries.append({
                    "resource": self._build_encounter(seg),
                    "request": {"method": "POST", "url": "Encounter"}
                })
            elif seg_name == "OBX":
                entries.append({
                    "resource": self._build_observation(seg),
                    "request": {"method": "POST", "url": "Observation"}
                })

        if not entries:
            await event_bus.publish(
                "EventType.PROC_WARNING", "algorithm",
                "No mappable segments found in AST. FHIR bundle is empty.", "WARN"
            )
        else:
            await event_bus.publish(
                "EventType.PROC_COMPLETE", "algorithm",
                f"FHIR conversion complete — {len(entries)} resources mapped.", "INFO"
            )

        return {
            "resourceType": "Bundle",
            "type": "transaction",
            "entry": entries
        }


fhir_bridge = FhirBridge()
