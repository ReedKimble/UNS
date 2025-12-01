# Files to Include in GPT Knowledge

Always upload **every file inside the `GPT/` folder** so the assistant stays aligned with the curated guidance and tool schema. Then add the core runtime specs listed below. Avoid attaching raw REST documents (such as `Runtime/api/openapi/openapi.yaml` or the API README) because the GPT must use the subset of endpoints defined in `GPT/Tool-Schema.yaml`.

## GPT folder (upload all)

- [/GPT/Master-Guidance.md] *(start here; it explains how to read the rest)*
- [/GPT/How-to-use-Tools.md]
- [/GPT/Python-to-UNS.md]
- [/GPT/Instructions.md]
- [/GPT/Tool-Schema.yaml]
- [/GPT/GPT-Knowledge-Files.md] *(include for completeness/reference)*

## Additional runtime + theory references

- [/Runtime/Specification/UNS_Runtime32_Spec.json]
- [/Runtime/Specification/UNS_Runtime32_Spec.md]
- [/Runtime/Implementation/UNS_Model_VM_Implementation.md]
- [/Runtime/Implementation/UNS_Module_9_Machine_First.md]
- [/UNS_Guided_Discovery.md]
- [/UNS_Academic_Section.md]