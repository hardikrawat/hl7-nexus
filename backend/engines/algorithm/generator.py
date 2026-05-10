import asyncio
from datetime import datetime
import uuid
from services.event_bus import event_bus


# --- Template definitions for HL7 v2.5.1 message types ---
TEMPLATES = {
    "ADT_A01": {
        "event_code": "A01",
        "event_type": "ADT^A01",
        "description": "Patient Admit",
        "segments": ["MSH", "EVN", "PID", "PV1"],
    },
    "ADT_A03": {
        "event_code": "A03",
        "event_type": "ADT^A03",
        "description": "Patient Discharge",
        "segments": ["MSH", "EVN", "PID", "PV1"],
    },
    "ADT_A08": {
        "event_code": "A08",
        "event_type": "ADT^A08",
        "description": "Update Patient Information",
        "segments": ["MSH", "EVN", "PID", "PV1"],
    },
    "ORU_R01": {
        "event_code": "R01",
        "event_type": "ORU^R01",
        "description": "Observation Result",
        "segments": ["MSH", "PID", "PV1", "OBR", "OBX"],
    },
    "ORM_O01": {
        "event_code": "O01",
        "event_type": "ORM^O01",
        "description": "Order Message",
        "segments": ["MSH", "PID", "PV1", "ORC", "OBR"],
    },
}


class HL7Generator:
    """
    Production-grade HL7 v2.5.1 message generator.
    Builds structurally correct messages using user-supplied data fields
    and template-aware segment composition.
    """

    def _timestamp(self) -> str:
        return datetime.utcnow().strftime("%Y%m%d%H%M%S")

    def _control_id(self) -> str:
        return f"NEXUS_{uuid.uuid4().hex[:8].upper()}"

    def _build_msh(self, template_info: dict) -> str:
        ts = self._timestamp()
        ctrl_id = self._control_id()
        return f"MSH|^~\\&|NEXUS|FAC1|REC|FAC2|{ts}||{template_info['event_type']}|{ctrl_id}|P|2.5.1"

    def _build_evn(self, event_code: str) -> str:
        ts = self._timestamp()
        return f"EVN|{event_code}|{ts}"

    def _build_pid(self, data: dict) -> str:
        patient_id = data.get("patientId", "UNKNOWN")
        last_name = data.get("lastName", "UNKNOWN")
        first_name = data.get("firstName", "")
        middle_name = data.get("middleName", "")
        dob = data.get("dateOfBirth", "19700101")
        sex = data.get("sex", "U")
        ssn = data.get("ssn", "")
        address = data.get("address", "")
        phone = data.get("phone", "")

        name = f"{last_name}^{first_name}"
        if middle_name:
            name += f"^{middle_name}"

        return f"PID|1||{patient_id}^^^MR||{name}||{dob}|{sex}|||{address}|||{phone}|||{ssn}"

    def _build_pv1(self, data: dict) -> str:
        patient_class = data.get("patientClass", "I")
        location = data.get("location", "WARD^RM1^BED1")
        attending = data.get("attendingDoctor", "")
        return f"PV1|1|{patient_class}|{location}||||{attending}"

    def _build_obr(self, data: dict) -> str:
        test_id = data.get("testId", "12345")
        test_name = data.get("testName", "COMPLETE BLOOD COUNT")
        ts = self._timestamp()
        return f"OBR|1|{test_id}||{test_name}^{test_id}^L|||{ts}"

    def _build_obx(self, data: dict) -> str:
        obs_id = data.get("observationId", "WBC")
        obs_name = data.get("observationName", "White Blood Cell Count")
        value = data.get("observationValue", "7.5")
        units = data.get("units", "10*3/uL")
        ref_range = data.get("referenceRange", "4.5-11.0")
        return f"OBX|1|NM|{obs_id}^{obs_name}||{value}|{units}|{ref_range}|||F"

    def _build_orc(self, data: dict) -> str:
        order_id = data.get("orderId", "ORD001")
        return f"ORC|NW|{order_id}|||CM"

    async def generate(self, data: dict, template: str = "ADT_A01") -> str:
        await event_bus.publish(
            "EventType.PROC_START", "algorithm",
            f"Generator creating {template} message", "INFO"
        )
        await asyncio.sleep(0.3)

        template_info = TEMPLATES.get(template)
        if not template_info:
            error_msg = f"Unknown template '{template}'. Supported: {list(TEMPLATES.keys())}"
            await event_bus.publish("EventType.PROC_ERROR", "algorithm", error_msg, "ERROR")
            raise ValueError(error_msg)

        # Build segments dynamically based on template
        segment_builders = {
            "MSH": lambda: self._build_msh(template_info),
            "EVN": lambda: self._build_evn(template_info["event_code"]),
            "PID": lambda: self._build_pid(data),
            "PV1": lambda: self._build_pv1(data),
            "OBR": lambda: self._build_obr(data),
            "OBX": lambda: self._build_obx(data),
            "ORC": lambda: self._build_orc(data),
        }

        segments = []
        for seg_name in template_info["segments"]:
            builder = segment_builders.get(seg_name)
            if builder:
                segments.append(builder())

        msg = "\n".join(segments)

        await event_bus.publish(
            "EventType.PROC_COMPLETE", "algorithm",
            f"Generation complete — {len(segments)} segments, {len(msg)} bytes", "INFO"
        )

        return msg


generator = HL7Generator()
