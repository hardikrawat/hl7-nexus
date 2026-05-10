import asyncio
from services.event_bus import event_bus
from .data_fetcher import runtime_data

class HL7Parser:
    async def parse(self, lexer_output: dict) -> dict:
        await event_bus.publish("EventType.PROC_START", "algorithm", "Parser building Abstract Syntax Tree", "INFO")
        await asyncio.sleep(0.5)

        delimiters = lexer_output["delimiters"]
        tokens = lexer_output["tokens"]
        
        ast = {"segments": []}
        
        for idx, token in enumerate(tokens):
            segment_name = token["segment"]
            fields = token["fields"]
            
            # Simple AST node
            node = {
                "id": f"seg_{idx}",
                "name": segment_name,
                "fields": []
            }
            
            for f_idx, field_str in enumerate(fields):
                # 0-indexed in our array, but HL7 fields are 1-indexed (except MSH-1 and MSH-2 which are special)
                # We'll just store the raw string for now
                components = field_str.split(delimiters["component"]) if delimiters["component"] in field_str else [field_str]
                
                parsed_components = []
                for c in components:
                    subcomponents = c.split(delimiters["subcomponent"]) if delimiters["subcomponent"] in c else [c]
                    parsed_components.append(subcomponents)

                node["fields"].append({
                    "sequence": f_idx, # Roughly
                    "raw": field_str,
                    "components": parsed_components
                })
                
            ast["segments"].append(node)
            
        await event_bus.publish("EventType.PROC_PROGRESS", "algorithm", f"AST built for {len(ast['segments'])} segments", "INFO")
        await asyncio.sleep(0.5)
        
        await event_bus.publish("EventType.PROC_COMPLETE", "algorithm", "Parsing complete", "INFO")
        
        return ast

parser = HL7Parser()
