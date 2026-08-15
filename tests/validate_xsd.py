import sys
import os
import xmlschema

def validate(xml_file):
    try:
        schema_path = os.path.join("tests", "crossref5.5.0.xsd")
        if not os.path.exists(schema_path):
            print(f"Schema not found: {schema_path}")
            sys.exit(1)
            
        print(f"Loading schema from {schema_path}...")
        
        # We need XSD 1.1 for xsd:assert
        schema = xmlschema.XMLSchema11(schema_path)
        
        print(f"Validating {xml_file}...")
        schema.validate(xml_file)
        
        print("Validation successful!")
        sys.exit(0)
    except xmlschema.validators.exceptions.XMLSchemaValidationError as e:
        print(f"Validation failed:\n{e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error loading schema or validating:\n{e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python validate_xsd.py <xml_file>")
        sys.exit(1)
    validate(sys.argv[1])
