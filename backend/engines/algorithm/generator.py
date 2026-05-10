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
        "segments": ["MSH", "EVN", "PID", "NK1", "PV1", "AL1", "DG1", "IN1", "GT1"],
    },
    "ADT_A03": {
        "event_code": "A03",
        "event_type": "ADT^A03",
        "description": "Patient Discharge",
        "segments": ["MSH", "EVN", "PID", "PV1", "DG1"],
    },
    "ADT_A08": {
        "event_code": "A08",
        "event_type": "ADT^A08",
        "description": "Update Patient Information",
        "segments": ["MSH", "EVN", "PID", "NK1", "PV1", "AL1", "DG1", "IN1"],
    },
    "ADT_A04": {
        "event_code": "A04",
        "event_type": "ADT^A04",
        "description": "Patient Registration",
        "segments": ["MSH", "EVN", "PID", "NK1", "PV1", "DG1", "IN1"],
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
        "segments": ["MSH", "PID", "PV1", "IN1", "ORC", "OBR"],
    },
}


class HL7Generator:
    """
    Production-grade HL7 v2.5.1 message generator.
    Builds fully-populated messages using user-supplied data fields
    and template-aware segment composition. Supports repeating segments
    (NK1, AL1, DG1, OBX, ORC/OBR, IN1) from array data.
    """

    def _timestamp(self) -> str:
        return datetime.utcnow().strftime("%Y%m%d%H%M%S")

    def _control_id(self) -> str:
        return f"NEXUS_{uuid.uuid4().hex[:8].upper()}"

    # ───────────── MSH ─────────────
    def _build_msh(self, data: dict, template_info: dict) -> list[str]:
        ts = self._timestamp()
        ctrl_id = self._control_id()
        sending_app = data.get("sendingApplication", "NEXUS")
        sending_fac = data.get("sendingFacility", "FAC1")
        receiving_app = data.get("receivingApplication", "REC")
        receiving_fac = data.get("receivingFacility", "FAC2")
        processing_id = data.get("processingId", "P")
        version = data.get("versionId", "2.5.1")

        return [
            f"MSH|^~\\&|{sending_app}|{sending_fac}|{receiving_app}|{receiving_fac}"
            f"|{ts}||{template_info['event_type']}|{ctrl_id}|{processing_id}|{version}"
        ]

    # ───────────── EVN ─────────────
    def _build_evn(self, data: dict, event_code: str) -> list[str]:
        ts = data.get("eventTimestamp", self._timestamp())
        operator = data.get("operatorId", "")
        planned = data.get("plannedEventDate", "")
        reason = data.get("eventReasonCode", "")
        return [f"EVN|{event_code}|{ts}|{planned}|{reason}||{operator}"]

    # ───────────── PID ─────────────
    def _build_pid(self, data: dict) -> list[str]:
        patient_id = data.get("patientId", "UNKNOWN")
        id_type = data.get("identifierType", "MR")
        last_name = data.get("lastName", "UNKNOWN")
        first_name = data.get("firstName", "")
        middle_name = data.get("middleName", "")
        prefix = data.get("prefix", "")
        suffix = data.get("suffix", "")
        dob = data.get("dateOfBirth", "19700101")
        sex = data.get("sex", "U")
        race = data.get("race", "")
        address = data.get("address", "")
        county = data.get("county", "")
        phone_home = data.get("phone", data.get("phoneHome", ""))
        phone_work = data.get("phoneWork", "")
        language = data.get("language", "")
        marital_status = data.get("maritalStatus", "")
        religion = data.get("religion", "")
        account_number = data.get("accountNumber", "")
        ssn = data.get("ssn", "")
        mothers_maiden = data.get("mothersMaidenName", "")
        ethnic_group = data.get("ethnicGroup", "")
        birth_place = data.get("birthPlace", "")
        nationality = data.get("nationality", "")

        name = f"{last_name}^{first_name}"
        if middle_name:
            name += f"^{middle_name}"
        if suffix:
            name += f"^{suffix}"
        if prefix:
            name += f"^{prefix}"

        # PID: Set ID | Ext ID | Patient ID | Alt ID | Name | Mother Maiden | DOB | Sex |
        #      Alias | Race | Address | County | Phone Home | Phone Work | Language |
        #      Marital Status | Religion | Account | SSN
        return [
            f"PID|1||{patient_id}^^^{id_type}||{name}|{mothers_maiden}|{dob}|{sex}||"
            f"{race}|{address}|{county}|{phone_home}|{phone_work}|{language}|"
            f"{marital_status}|{religion}|{account_number}|{ssn}|||{ethnic_group}|"
            f"{birth_place}||{nationality}"
        ]

    # ───────────── PV1 ─────────────
    def _build_pv1(self, data: dict) -> list[str]:
        patient_class = data.get("patientClass", "I")
        location = data.get("location", "")
        admission_type = data.get("admissionType", "")
        attending = data.get("attendingDoctor", "")
        referring = data.get("referringDoctor", "")
        consulting = data.get("consultingDoctor", "")
        hospital_service = data.get("hospitalService", "")
        temp_location = data.get("tempLocation", "")
        preadmit_number = data.get("preadmitNumber", "")
        admit_source = data.get("admitSource", "")
        ambulatory_status = data.get("ambulatoryStatus", "")
        vip = data.get("vipIndicator", "")
        admit_date = data.get("admitDate", data.get("admitDateTime", ""))
        discharge_date = data.get("dischargeDate", data.get("dischargeDateTime", ""))
        financial_class = data.get("financialClass", "")
        diet = data.get("dietType", "")
        visit_number = data.get("visitNumber", "")

        return [
            f"PV1|1|{patient_class}|{location}|{admission_type}|{preadmit_number}|"
            f"{temp_location}|{attending}|{referring}|{consulting}|{hospital_service}|"
            f"||{ambulatory_status}|{vip}||||||{financial_class}||||||||||||||||||||"
            f"{diet}|||{visit_number}||{admit_date}|{discharge_date}||{admit_source}"
        ]

    # ───────────── NK1 (repeating) ─────────────
    def _build_nk1(self, data: dict) -> list[str]:
        nk_data = data.get("nextOfKin", [])
        if isinstance(nk_data, dict):
            nk_data = [nk_data]
        if not nk_data:
            return []

        segments = []
        for i, nk in enumerate(nk_data, 1):
            last = nk.get("lastName", "")
            first = nk.get("firstName", "")
            name = f"{last}^{first}" if last else ""
            rel = nk.get("relationship", "")
            address = nk.get("address", "")
            phone = nk.get("phone", "")
            org = nk.get("organization", "")
            contact_role = nk.get("contactRole", "")
            segments.append(
                f"NK1|{i}|{name}|{rel}|{address}|{phone}|||{contact_role}||||{org}"
            )
        return segments

    # ───────────── AL1 (repeating) ─────────────
    def _build_al1(self, data: dict) -> list[str]:
        allergies = data.get("allergies", [])
        if isinstance(allergies, dict):
            allergies = [allergies]
        if not allergies:
            return []

        segments = []
        for i, al in enumerate(allergies, 1):
            allergy_type = al.get("type", "DA")  # DA=Drug Allergy, FA=Food, EA=Environmental
            code = al.get("code", "")
            desc = al.get("description", al.get("name", ""))
            severity = al.get("severity", "")
            reaction = al.get("reaction", "")
            identified = al.get("identifiedDate", "")
            segments.append(
                f"AL1|{i}|{allergy_type}|{code}^{desc}|{severity}|{reaction}|{identified}"
            )
        return segments

    # ───────────── DG1 (repeating) ─────────────
    def _build_dg1(self, data: dict) -> list[str]:
        diagnoses = data.get("diagnoses", [])
        if isinstance(diagnoses, dict):
            diagnoses = [diagnoses]
        if not diagnoses:
            return []

        segments = []
        for i, dx in enumerate(diagnoses, 1):
            code = dx.get("code", "")
            desc = dx.get("description", dx.get("name", ""))
            coding_system = dx.get("codingSystem", "ICD10")
            dx_type = dx.get("type", "A")  # A=Admitting, W=Working, F=Final
            dx_date = dx.get("date", dx.get("diagnosisDate", self._timestamp()))
            clinician = dx.get("clinician", dx.get("diagnosingClinician", ""))
            segments.append(
                f"DG1|{i}||{code}^{desc}^{coding_system}||{dx_date}|{dx_type}|||||||||{clinician}"
            )
        return segments

    # ───────────── IN1 (repeating) ─────────────
    def _build_in1(self, data: dict) -> list[str]:
        insurance = data.get("insurance", [])
        if isinstance(insurance, dict):
            insurance = [insurance]
        if not insurance:
            return []

        segments = []
        for i, ins in enumerate(insurance, 1):
            plan_id = ins.get("planId", ins.get("insurancePlanId", ""))
            company_name = ins.get("planName", ins.get("companyName", ins.get("insuranceCompanyName", "")))
            group_number = ins.get("groupNumber", "")
            group_name = ins.get("groupName", "")
            subscriber_id = ins.get("subscriberId", ins.get("insuredId", ""))
            subscriber_name = ins.get("subscriberName", ins.get("insuredName", ""))
            subscriber_rel = ins.get("subscriberRelationship", ins.get("insuredRelationship", "01"))
            policy_number = ins.get("policyNumber", "")
            auth_number = ins.get("authorizationNumber", "")
            plan_type = ins.get("planType", "")
            effective_date = ins.get("effectiveDate", "")
            expiration_date = ins.get("expirationDate", "")
            segments.append(
                f"IN1|{i}|{plan_id}|{plan_id}|{company_name}||||{group_number}|{group_name}||"
                f"|{effective_date}|{expiration_date}||{subscriber_rel}||{subscriber_name}||||"
                f"|||||||{policy_number}|||||{subscriber_id}||||||{auth_number}||{plan_type}"
            )
        return segments

    # ───────────── GT1 ─────────────
    def _build_gt1(self, data: dict) -> list[str]:
        guarantor = data.get("guarantor", None)
        if not guarantor:
            return []

        if isinstance(guarantor, list):
            guarantors = guarantor
        else:
            guarantors = [guarantor]

        segments = []
        for i, gt in enumerate(guarantors, 1):
            last = gt.get("lastName", "")
            first = gt.get("firstName", "")
            name = f"{last}^{first}" if last else ""
            address = gt.get("address", "")
            phone = gt.get("phone", "")
            dob = gt.get("dateOfBirth", "")
            sex = gt.get("sex", "")
            relationship = gt.get("relationship", "")
            ssn = gt.get("ssn", "")
            employer = gt.get("employer", "")
            segments.append(
                f"GT1|{i}||{name}|{address}|{phone}||{dob}|{sex}||{relationship}|{ssn}||||{employer}"
            )
        return segments

    # ───────────── OBR (repeating) ─────────────
    def _build_obr(self, data: dict) -> list[str]:
        orders = data.get("orders", data.get("observations", []))
        if isinstance(orders, dict):
            orders = [orders]

        if not orders:
            test_id = data.get("testId", "12345")
            test_name = data.get("testName", "COMPLETE BLOOD COUNT")
            ts = self._timestamp()
            ordering_provider = data.get("orderingProvider", "")
            return [f"OBR|1|{test_id}||{test_name}^{test_id}^L|||{ts}||||||||||{ordering_provider}"]

        segments = []
        for i, order in enumerate(orders, 1):
            test_id = order.get("testId", order.get("orderId", str(10000 + i)))
            test_name = order.get("testName", order.get("orderName", f"TEST_{i}"))
            ts = order.get("collectionDate", order.get("observationDate", self._timestamp()))
            filler_id = order.get("fillerId", "")
            status = order.get("status", "F")
            ordering_provider = order.get("orderingProvider", data.get("orderingProvider", ""))
            priority = order.get("priority", "R")
            segments.append(
                f"OBR|{i}|{test_id}|{filler_id}|{test_name}^{test_id}^L|{priority}||{ts}"
                f"||||||||||{ordering_provider}||||||||{status}"
            )
        return segments

    # ───────────── OBX (repeating, grouped) ─────────────
    def _build_obx(self, data: dict) -> list[str]:
        results = data.get("results", data.get("observations", []))
        if isinstance(results, dict):
            results = [results]

        if not results:
            obs_id = data.get("observationId", "WBC")
            obs_name = data.get("observationName", "White Blood Cell Count")
            value = data.get("observationValue", "7.5")
            units = data.get("units", "10*3/uL")
            ref_range = data.get("referenceRange", "4.5-11.0")
            return [f"OBX|1|NM|{obs_id}^{obs_name}||{value}|{units}|{ref_range}|||F"]

        segments = []
        for i, obs in enumerate(results, 1):
            obs_id = obs.get("id", obs.get("code", f"OBS{i}"))
            obs_name = obs.get("name", obs.get("description", f"Observation {i}"))
            value = str(obs.get("value", ""))
            units = obs.get("units", obs.get("unit", ""))
            ref_range = obs.get("referenceRange", obs.get("normalRange", ""))
            value_type = obs.get("valueType", "NM" if _is_numeric(value) else "ST")
            status = obs.get("status", "F")
            abnormal_flag = obs.get("abnormalFlag", obs.get("flag", ""))
            method = obs.get("method", "")
            segments.append(
                f"OBX|{i}|{value_type}|{obs_id}^{obs_name}||{value}|{units}|{ref_range}"
                f"|{abnormal_flag}||{status}|||{method}"
            )
        return segments

    # ───────────── ORC (repeating) ─────────────
    def _build_orc(self, data: dict) -> list[str]:
        orders = data.get("orders", [])
        if isinstance(orders, dict):
            orders = [orders]

        if not orders:
            order_id = data.get("orderId", "ORD001")
            order_control = data.get("orderControl", "NW")
            return [f"ORC|{order_control}|{order_id}|||CM"]

        segments = []
        for i, order in enumerate(orders, 1):
            order_id = order.get("orderId", f"ORD{str(i).zfill(3)}")
            order_control = order.get("orderControl", "NW")
            status = order.get("orderStatus", "CM")
            ordering_provider = order.get("orderingProvider", data.get("orderingProvider", ""))
            entered_by = order.get("enteredBy", "")
            priority = order.get("priority", "R")
            segments.append(
                f"ORC|{order_control}|{order_id}|||{status}|{priority}||||{ordering_provider}|"
                f"{entered_by}"
            )
        return segments

    # ───────────── Main Generate Method ─────────────
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
        # Each builder returns a list of segment strings (supports repeating segments)
        segment_builders = {
            "MSH": lambda: self._build_msh(data, template_info),
            "EVN": lambda: self._build_evn(data, template_info["event_code"]),
            "PID": lambda: self._build_pid(data),
            "PV1": lambda: self._build_pv1(data),
            "NK1": lambda: self._build_nk1(data),
            "AL1": lambda: self._build_al1(data),
            "DG1": lambda: self._build_dg1(data),
            "IN1": lambda: self._build_in1(data),
            "GT1": lambda: self._build_gt1(data),
            "OBR": lambda: self._build_obr(data),
            "OBX": lambda: self._build_obx(data),
            "ORC": lambda: self._build_orc(data),
        }

        all_segments = []
        for seg_name in template_info["segments"]:
            builder = segment_builders.get(seg_name)
            if builder:
                built = builder()
                all_segments.extend(built)  # extend (not append) for repeating segments

        # Clean: remove trailing empty fields from each segment
        cleaned = []
        for seg in all_segments:
            while seg.endswith("|"):
                seg = seg[:-1]
            cleaned.append(seg)

        msg = "\n".join(cleaned)

        await event_bus.publish(
            "EventType.PROC_COMPLETE", "algorithm",
            f"Generation complete — {len(cleaned)} segments, {len(msg)} bytes", "INFO"
        )

        return msg


def _is_numeric(value: str) -> bool:
    """Check if a string value is numeric (for OBX value type detection)."""
    try:
        float(value)
        return True
    except (ValueError, TypeError):
        return False


generator = HL7Generator()
